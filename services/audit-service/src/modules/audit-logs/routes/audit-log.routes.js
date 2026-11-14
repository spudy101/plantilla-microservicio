// services/audit-service/src/modules/audit-logs/routes/audit-log.routes.js
// Montado en /api/v1/admin/audit-logs

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RbacMiddleware = require('@plantilla/shared/middlewares/rbac.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const { RBAC_MODULES, RBAC_ACTIONS } = require('@plantilla/shared/constants/rbac');
const AuditLogController = require('../controllers/audit-log.controller');
const AuditLogValidator = require('../validators/audit-log.validator');

const router = express.Router();
const ENTITY = { entityType: 'AuditLog' };

router.use(
  AuthMiddleware.authenticate,
  RbacMiddleware.requirePermission(RBAC_MODULES.AUDIT, RBAC_ACTIONS.READ),
  RateLimitMiddleware.apiLimiter()
);

router.get(
  '/',
  AuditLogValidator.listQuery(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('AUDIT_LOGS_QUERIED', ENTITY),
  AuditLogController.list
);

router.get(
  '/:auditId',
  AuditLogValidator.getById(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('AUDIT_LOG_VIEWED', ENTITY),
  AuditLogController.getById
);

module.exports = router;
