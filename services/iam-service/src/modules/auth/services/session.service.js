// services/iam-service/src/modules/auth/services/session.service.js
//
// Ciclo de vida de sesiones y emisión de tokens. Lo usan auth.service (login,
// refresh, logout) y admin-user.service (bloqueo → revocar sesiones).

const crypto = require('node:crypto');
const JwtUtil = require('@plantilla/shared/utils/jwt.util');
const HashUtil = require('@plantilla/shared/utils/hash.util');
const SessionRevocationUtil = require('@plantilla/shared/utils/session-revocation.util');
const EventBus = require('@plantilla/shared/events/event-bus');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const config = require('#config/index');
const sessionRepository = require('#schemas/repositories/user-session.repository');

const MS_PER_HOUR = 3600 * 1000;
const MS_PER_SECOND = 1000;

class SessionService {
  /**
   * Crea la sesión y emite el par de tokens.
   * @param {Object} user - instancia con role cargado
   * @param {{ ip?: string, userAgent?: string }} client
   */
  async create(user, client = {}) {
    const jti = crypto.randomUUID();
    const session = await sessionRepository.create({
      user_id: user.user_id,
      refresh_token_hash: HashUtil.sha256(jti),
      ip_address: client.ip ?? null,
      user_agent: client.userAgent?.slice(0, 500) ?? null,
      expires_at: new Date(Date.now() + config.auth.sessionMaxHours * MS_PER_HOUR)
    });

    const tokens = await this.issueTokens(user, session, jti);
    return { session, ...tokens };
  }

  /**
   * Firma access + refresh. El refresh nunca vive más allá del tope absoluto de la sesión.
   */
  // eslint-disable-next-line class-methods-use-this
  async issueTokens(user, session, jti) {
    const remainingSeconds = Math.max(1, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / MS_PER_SECOND));
    const [accessToken, refreshToken] = await Promise.all([
      JwtUtil.signAccessToken({ userId: user.user_id, sessionId: session.session_id, role: user.role?.code }),
      JwtUtil.signRefreshToken({ userId: user.user_id, sessionId: session.session_id, jti, ttlSeconds: remainingSeconds })
    ]);
    return { accessToken, refreshToken, accessTokenTtl: config.jwt.accessTokenTtl };
  }

  /**
   * Revoca una sesión en BD + la marca en la lista compartida (gateway y servicios
   * rechazan su access token de inmediato) + avisa por evento.
   */
  // eslint-disable-next-line class-methods-use-this
  async revoke(sessionId, userId, reason) {
    await sessionRepository.revoke(sessionId, reason);
    await SessionRevocationUtil.revoke(sessionId);
    await EventBus.get().publishSafe(EVENT_TYPES.SESSION_REVOKED, { sessionId, userId, reason });
  }

  /** @returns {Promise<number>} cantidad de sesiones revocadas */
  // eslint-disable-next-line class-methods-use-this
  async revokeAllForUser(userId, reason) {
    const ids = await sessionRepository.revokeAllForUser(userId, reason);
    await Promise.all(ids.map(id => SessionRevocationUtil.revoke(id)));
    await Promise.all(
      ids.map(sessionId => EventBus.get().publishSafe(EVENT_TYPES.SESSION_REVOKED, { sessionId, userId, reason }))
    );
    return ids.length;
  }
}

module.exports = new SessionService();
