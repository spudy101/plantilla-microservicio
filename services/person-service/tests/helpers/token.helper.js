// Firma access tokens de prueba con la clave efímera del setup (simula a iam-service).
const crypto = require('node:crypto');
const JwtUtil = require('@plantilla/shared/utils/jwt.util');
const { ROLES } = require('@plantilla/shared/constants/rbac');

const tokenFor = async (role = ROLES.CLIENT, userId = crypto.randomUUID()) => ({
  userId,
  token: await JwtUtil.signAccessToken({ userId, sessionId: crypto.randomUUID(), role })
});

module.exports = { tokenFor };
