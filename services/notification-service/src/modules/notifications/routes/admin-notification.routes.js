// services/notification-service/src/modules/notifications/routes/admin-notification.routes.js
// Montado en /api/v1/admin/notifications

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RbacMiddleware = require('@plantilla/shared/middlewares/rbac.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const { RBAC_MODULES, RBAC_ACTIONS } = require('@plantilla/shared/constants/rbac');
const NotificationController = require('../controllers/notification.controller');
const NotificationValidator = require('../validators/notification.validator');

const router = express.Router();

router.post(
  '/',
  AuthMiddleware.authenticate,
  RbacMiddleware.requirePermission(RBAC_MODULES.NOTIFICATIONS, RBAC_ACTIONS.CREATE),
  RateLimitMiddleware.apiLimiter(),
  NotificationValidator.adminSend(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('ADMIN_NOTIFICATION_SENT', { entityType: 'Notification' }),
  NotificationController.adminSend
);

module.exports = router;
