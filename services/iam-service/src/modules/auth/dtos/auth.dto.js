// services/iam-service/src/modules/auth/dtos/auth.dto.js
//
// Los DTOs transforman instancias Sequelize a camelCase y deciden qué PII sale.
// Nunca hacer spread de una instancia: cada campo se declara explícitamente.

const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');

/** Datos del propio usuario (/me): email completo. */
const AuthUserDTO = user => ({
  userId: user.user_id,
  email: EncryptionUtil.safeDecrypt(user.email_encrypted),
  role: user.role ? { code: user.role.code, name: user.role.name } : null,
  status: user.status,
  lastLoginAt: user.last_login_at ?? null,
  createdAt: user.created_at ?? user.createdAt ?? null
});

/** Respuesta de login / refresh. */
const TokenPairDTO = ({ accessToken, refreshToken, accessTokenTtl, sessionId, user }) => ({
  tokenType: 'Bearer',
  accessToken,
  refreshToken,
  expiresIn: accessTokenTtl,
  sessionId,
  ...(user && { user: AuthUserDTO(user) })
});

module.exports = { AuthUserDTO, TokenPairDTO };
