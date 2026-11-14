// services/iam-service/src/modules/admin-users/routes/admin-user.routes.js
// Montado en /api/v1/admin

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RbacMiddleware = require('@plantilla/shared/middlewares/rbac.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const { RBAC_MODULES, RBAC_ACTIONS } = require('@plantilla/shared/constants/rbac');
const AdminUserController = require('../controllers/admin-user.controller');
const AdminUserValidator = require('../validators/admin-user.validator');

const router = express.Router();
const ENTITY = { entityType: 'User' };

router.use(AuthMiddleware.authenticate, RateLimitMiddleware.apiLimiter());

router.get(
  '/users',
  RbacMiddleware.requirePermission(RBAC_MODULES.USERS, RBAC_ACTIONS.READ),
  AdminUserValidator.listQuery(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('ADMIN_USERS_LISTED', ENTITY),
  AdminUserController.list
);

router.get(
  '/users/:userId',
  RbacMiddleware.requirePermission(RBAC_MODULES.USERS, RBAC_ACTIONS.READ),
  AdminUserValidator.getById(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('ADMIN_USER_VIEWED', ENTITY),
  AdminUserController.getById
);

router.patch(
  '/users/:userId/status',
  RbacMiddleware.requirePermission(RBAC_MODULES.USERS, RBAC_ACTIONS.UPDATE),
  AdminUserValidator.updateStatus(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('ADMIN_USER_STATUS_CHANGED', ENTITY),
  AdminUserController.updateStatus
);

router.get(
  '/roles',
  RbacMiddleware.requirePermission(RBAC_MODULES.ROLES, RBAC_ACTIONS.READ),
  AuditAction.declare('ADMIN_ROLES_LISTED', { entityType: 'Role' }),
  AdminUserController.listRoles
);

module.exports = router;
