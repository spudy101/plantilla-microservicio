// services/iam-service/src/modules/admin-users/controllers/admin-user.controller.js

const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const { asyncHandler } = require('@plantilla/shared/middlewares/error.middleware');
const AdminUserService = require('../services/admin-user.service');

class AdminUserController {
  /** GET /admin/users */
  list = asyncHandler(async (req, res) => {
    const result = await AdminUserService.list(req.query, req.user.userId);
    return ApiResponse.success(res, 'Usuarios obtenidos exitosamente', result);
  });

  /** GET /admin/users/:userId */
  getById = asyncHandler(async (req, res) => {
    const result = await AdminUserService.getById(req.params.userId, req.user.userId);
    return ApiResponse.success(res, 'Usuario obtenido exitosamente', result);
  });

  /** PATCH /admin/users/:userId/status */
  updateStatus = asyncHandler(async (req, res) => {
    const result = await AdminUserService.updateStatus(req.params.userId, req.body, req.user.userId);
    return ApiResponse.success(res, 'Estado del usuario actualizado', result);
  });

  /** GET /admin/roles */
  listRoles = asyncHandler(async (req, res) => {
    const result = await AdminUserService.listRoles(req.user.userId);
    return ApiResponse.success(res, 'Roles obtenidos exitosamente', result);
  });
}

module.exports = new AdminUserController();
