// services/audit-service/src/modules/audit-logs/controllers/audit-log.controller.js

const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const { asyncHandler } = require('@plantilla/shared/middlewares/error.middleware');
const AuditLogService = require('../services/audit-log.service');

class AuditLogController {
  /** GET /admin/audit-logs */
  list = asyncHandler(async (req, res) => {
    const result = await AuditLogService.list(req.query, req.user.userId);
    return ApiResponse.success(res, 'Registros de auditoría obtenidos', result);
  });

  /** GET /admin/audit-logs/:auditId */
  getById = asyncHandler(async (req, res) => {
    const result = await AuditLogService.getById(req.params.auditId, req.user.userId);
    return ApiResponse.success(res, 'Registro de auditoría obtenido', result);
  });
}

module.exports = new AuditLogController();
