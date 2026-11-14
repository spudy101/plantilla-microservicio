// services/iam-service/src/modules/auth/controllers/auth.controller.js

const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const { asyncHandler } = require('@plantilla/shared/middlewares/error.middleware');
const AuthService = require('../services/auth.service');

class AuthController {
  /** POST /auth/register */
  register = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body);
    return ApiResponse.created(res, 'Cuenta creada exitosamente', result);
  });

  /** POST /auth/login */
  login = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body, _clientInfo(res));
    return ApiResponse.success(res, 'Inicio de sesión exitoso', result);
  });

  /** POST /auth/refresh */
  refresh = asyncHandler(async (req, res) => {
    const result = await AuthService.refresh(req.body.refreshToken);
    return ApiResponse.success(res, 'Sesión renovada', result);
  });

  /** POST /auth/logout */
  logout = asyncHandler(async (req, res) => {
    await AuthService.logout(req.user);
    return ApiResponse.success(res, 'Sesión cerrada');
  });

  /** GET /auth/me */
  me = asyncHandler(async (req, res) => {
    const result = await AuthService.me(req.user);
    return ApiResponse.success(res, 'Usuario obtenido', result);
  });
}

function _clientInfo(res) {
  return { ip: res.locals.auditContext?.ip ?? null, userAgent: res.locals.auditContext?.userAgent ?? null };
}

module.exports = new AuthController();
