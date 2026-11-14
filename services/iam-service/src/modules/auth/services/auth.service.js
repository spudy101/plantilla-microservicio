// services/iam-service/src/modules/auth/services/auth.service.js

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const AppError = require('@plantilla/shared/utils/app-error.util');
const JwtUtil = require('@plantilla/shared/utils/jwt.util');
const HashUtil = require('@plantilla/shared/utils/hash.util');
const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');
const EventBus = require('@plantilla/shared/events/event-bus');
const { logAudit } = require('@plantilla/shared/utils/logger.util');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const { ROLES } = require('@plantilla/shared/constants/rbac');
const config = require('#config/index');
const userRepository = require('#schemas/repositories/user.repository');
const roleRepository = require('#schemas/repositories/role.repository');
const sessionRepository = require('#schemas/repositories/user-session.repository');
const { USER_STATUS } = require('#schemas/models/user.model');
const { SESSION_STATUS } = require('#schemas/models/user-session.model');
const SessionService = require('./session.service');
const { AuthUserDTO, TokenPairDTO } = require('../dtos/auth.dto');

const ENTITY = { entityType: 'User' };
const INVALID_CREDENTIALS = 'Credenciales inválidas';
const MS_PER_SECOND = 1000;
// Hash dummy para igualar el tiempo de respuesta cuando el email no existe (evita enumerar usuarios).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), 4);

class AuthService {
  /**
   * Registro público (rol CLIENT). Los datos personales viajan en el evento
   * `iam.user.registered` y los persiste person-service.
   */
  async register({ email, password, firstName, lastName }) {
    const emailHash = HashUtil.hashForSearch(email);
    if (await userRepository.existsByEmailHash(emailHash)) {
      throw AppError.conflict('Ya existe una cuenta con ese correo electrónico');
    }

    const role = await roleRepository.findByCode(ROLES.CLIENT);
    if (!role) {
      throw AppError.internal('Rol CLIENT no configurado (¿corriste los seeders?)');
    }

    const user = await userRepository.create({
      email_encrypted: EncryptionUtil.encrypt(email),
      email_hash: emailHash,
      password_hash: await bcrypt.hash(password, config.auth.bcryptRounds),
      role_id: role.role_id
    });

    await EventBus.get().publishSafe(
      EVENT_TYPES.USER_REGISTERED,
      { userId: user.user_id, email, firstName, lastName, role: role.code },
      { actorId: user.user_id }
    );
    logAudit('USER_REGISTERED', user.user_id, { role: role.code }, { ...ENTITY, entityId: user.user_id });

    user.role = role;
    return AuthUserDTO(user);
  }

  async login({ email, password }, client) {
    const user = await userRepository.findByEmailHashWithPassword(HashUtil.hashForSearch(email));

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      logAudit('LOGIN_FAILED', null, { reason: 'UNKNOWN_EMAIL' }, { ...ENTITY, outcome: 'failure' });
      throw AppError.unauthorized(INVALID_CREDENTIALS);
    }

    this.#assertCanLogin(user);

    if (!(await bcrypt.compare(password, user.password_hash))) {
      await userRepository.registerFailedLogin(user, config.auth);
      logAudit(
        'LOGIN_FAILED',
        user.user_id,
        { reason: 'BAD_PASSWORD', attempts: user.failed_login_attempts },
        { ...ENTITY, entityId: user.user_id, outcome: 'failure' }
      );
      throw AppError.unauthorized(INVALID_CREDENTIALS);
    }

    await userRepository.registerSuccessfulLogin(user);
    const { session, ...tokens } = await SessionService.create(user, client);

    await EventBus.get().publishSafe(
      EVENT_TYPES.USER_LOGGED_IN,
      { userId: user.user_id, sessionId: session.session_id, ip: client?.ip ?? null },
      { actorId: user.user_id }
    );
    logAudit('USER_LOGGED_IN', user.user_id, { sessionId: session.session_id }, { ...ENTITY, entityId: user.user_id });

    return TokenPairDTO({ ...tokens, sessionId: session.session_id, user });
  }

  /**
   * Rotación de refresh con detección de reutilización:
   * si llega un refresh cuyo jti ya no es el vigente, alguien lo copió →
   * se revoca la sesión completa.
   */
  async refresh(refreshToken) {
    const { userId, sessionId, jti } = await JwtUtil.verifyRefreshToken(refreshToken);

    const session = await sessionRepository.findById(sessionId);
    if (!session || session.user_id !== userId || session.status !== SESSION_STATUS.ACTIVE) {
      throw AppError.unauthorized('Sesión inválida o cerrada');
    }
    if (new Date(session.expires_at) < new Date()) {
      await sessionRepository.revoke(sessionId, 'EXPIRED');
      throw AppError.unauthorized('La sesión expiró. Inicia sesión nuevamente');
    }

    const user = await userRepository.findByIdWithRole(userId);
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      await SessionService.revoke(sessionId, userId, 'USER_INACTIVE');
      throw AppError.unauthorized('La cuenta no está activa');
    }

    const newJti = crypto.randomUUID();
    const rotated = await sessionRepository.rotateRefreshHash(sessionId, HashUtil.sha256(jti), HashUtil.sha256(newJti));
    if (!rotated) {
      await SessionService.revoke(sessionId, userId, 'REFRESH_TOKEN_REUSE');
      logAudit(
        'REFRESH_TOKEN_REUSE_DETECTED',
        userId,
        { sessionId },
        { entityType: 'UserSession', entityId: sessionId, outcome: 'failure' }
      );
      throw AppError.unauthorized('Sesión revocada por seguridad. Inicia sesión nuevamente');
    }

    const tokens = await SessionService.issueTokens(user, session, newJti);
    logAudit('SESSION_REFRESHED', userId, { sessionId }, { entityType: 'UserSession', entityId: sessionId });
    return TokenPairDTO({ ...tokens, sessionId });
  }

  async logout({ userId, sessionId }) {
    await SessionService.revoke(sessionId, userId, 'LOGOUT');
    logAudit('USER_LOGGED_OUT', userId, { sessionId }, { entityType: 'UserSession', entityId: sessionId });
  }

  async me({ userId }) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) {
      throw AppError.notFound('Usuario no encontrado');
    }
    return AuthUserDTO(user);
  }

  // eslint-disable-next-line class-methods-use-this
  #assertCanLogin(user) {
    if (user.status !== USER_STATUS.ACTIVE) {
      logAudit(
        'LOGIN_BLOCKED',
        user.user_id,
        { reason: 'ACCOUNT_BLOCKED' },
        { ...ENTITY, entityId: user.user_id, outcome: 'failure' }
      );
      throw AppError.forbidden('La cuenta está bloqueada. Contacta a soporte');
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const retryAfter = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / MS_PER_SECOND);
      logAudit(
        'LOGIN_BLOCKED',
        user.user_id,
        { reason: 'TEMPORARY_LOCK' },
        { ...ENTITY, entityId: user.user_id, outcome: 'failure' }
      );
      throw AppError.tooManyRequests('Demasiados intentos fallidos. Intenta más tarde', null, retryAfter);
    }
  }
}

module.exports = new AuthService();
