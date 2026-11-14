// packages/shared/src/utils/jwt.util.js
//
// JWT RS256 propios. Asimétrico a propósito:
//   - iam-service es el ÚNICO que tiene JWT_PRIVATE_KEY y emite tokens.
//   - api-gateway y el resto de servicios solo tienen JWT_PUBLIC_KEY y verifican.
// Así un servicio comprometido no puede fabricar tokens.
//
// Claves (PEM, saltos de línea como \n literal en .env):
//   pnpm keys:generate   (o)
//   openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
//   openssl rsa -pubout -in private.pem -out public.pem

const { SignJWT, jwtVerify, errors: joseErrors } = require('jose');
const { createPrivateKey, createPublicKey } = require('node:crypto');
const AppError = require('./app-error.util');
const { jwt: jwtConfig } = require('../config/env');
const { ERROR_CODES, ERROR_MESSAGES } = require('../constants/http');

const ALGORITHM = 'RS256';
const REFRESH_TOKEN_TYPE = 'refresh';
const ACCESS_TOKEN_TYPE = 'access';

let privateKey = null;
let publicKey = null;

const getPrivateKey = () => {
  if (!privateKey) {
    if (!jwtConfig.privateKey) {
      throw new Error('JWT_PRIVATE_KEY no configurada (solo iam-service debe emitir tokens)');
    }
    privateKey = createPrivateKey(jwtConfig.privateKey);
  }
  return privateKey;
};

const getPublicKey = () => {
  if (!publicKey) {
    if (!jwtConfig.publicKey) {
      throw new Error('JWT_PUBLIC_KEY no configurada');
    }
    publicKey = createPublicKey(jwtConfig.publicKey);
  }
  return publicKey;
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

class JwtUtil {
  /**
   * Access token con los claims mínimos que necesitan los demás servicios para
   * autorizar sin llamar a iam: userId, sessionId, role.
   * NO incluir PII (email, documento): el token viaja por todos los servicios.
   *
   * @param {{ userId: string, sessionId: string, role: string }} claims
   * @returns {Promise<string>}
   */
  static signAccessToken({ userId, sessionId, role }) {
    const iat = nowSeconds();
    return new SignJWT({ sid: sessionId, role, typ: ACCESS_TOKEN_TYPE })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuer(jwtConfig.issuer)
      .setAudience(jwtConfig.audience)
      .setIssuedAt(iat)
      .setExpirationTime(iat + jwtConfig.accessTokenTtl)
      .sign(getPrivateKey());
  }

  /**
   * Refresh token con jti para rotación. El jti vigente se guarda (hasheado) en la sesión.
   * @param {{ userId: string, sessionId: string, jti: string, ttlSeconds: number }} params
   * @returns {Promise<string>}
   */
  static signRefreshToken({ userId, sessionId, jti, ttlSeconds }) {
    const iat = nowSeconds();
    return new SignJWT({ sid: sessionId, typ: REFRESH_TOKEN_TYPE })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setJti(jti)
      .setIssuer(jwtConfig.issuer)
      .setAudience(jwtConfig.audience)
      .setIssuedAt(iat)
      .setExpirationTime(iat + ttlSeconds)
      .sign(getPrivateKey());
  }

  /**
   * @param {string} token
   * @returns {Promise<{ userId: string, sessionId: string, role: string, exp: number }>}
   * @throws AppError 401
   */
  static async verifyAccessToken(token) {
    const payload = await JwtUtil.#verify(token, ACCESS_TOKEN_TYPE);
    return { userId: payload.sub, sessionId: payload.sid, role: payload.role, exp: payload.exp };
  }

  /**
   * @param {string} token
   * @returns {Promise<{ userId: string, sessionId: string, jti: string, exp: number }>}
   * @throws AppError 401
   */
  static async verifyRefreshToken(token) {
    const payload = await JwtUtil.#verify(token, REFRESH_TOKEN_TYPE);
    return { userId: payload.sub, sessionId: payload.sid, jti: payload.jti, exp: payload.exp };
  }

  static async #verify(token, expectedType) {
    try {
      const { payload } = await jwtVerify(token, getPublicKey(), {
        algorithms: [ALGORITHM],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
      if (payload.typ !== expectedType) {
        throw AppError.unauthorized(ERROR_MESSAGES.TOKEN_INVALID, null, ERROR_CODES.TOKEN_INVALID);
      }
      return payload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof joseErrors.JWTExpired) {
        throw AppError.unauthorized(ERROR_MESSAGES.TOKEN_EXPIRED, null, ERROR_CODES.TOKEN_EXPIRED);
      }
      throw AppError.unauthorized(ERROR_MESSAGES.TOKEN_INVALID, null, ERROR_CODES.TOKEN_INVALID);
    }
  }
}

module.exports = JwtUtil;
