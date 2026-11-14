// services/notification-service/src/modules/notifications/routes/notification.routes.js
// Montado en /api/v1/notifications (bandeja del propio usuario)

const express = require('express');
const AuthMiddleware = require('@plantilla/shared/middlewares/auth.middleware');
const RateLimitMiddleware = require('@plantilla/shared/middlewares/rate-limit.middleware');
const AuditAction = require('@plantilla/shared/middlewares/audit-action.middleware');
const ValidatorUtil = require('@plantilla/shared/utils/validators.util');
const NotificationController = require('../controllers/notification.controller');
const NotificationValidator = require('../validators/notification.validator');

const router = express.Router();
const ENTITY = { entityType: 'Notification' };

router.use(AuthMiddleware.authenticate, RateLimitMiddleware.apiLimiter());

router.get(
  '/',
  NotificationValidator.listQuery(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('NOTIFICATIONS_LISTED', ENTITY),
  NotificationController.list
);

router.get('/unread-count', AuditAction.declare('NOTIFICATIONS_UNREAD_COUNT', ENTITY), NotificationController.unreadCount);

// read-all ANTES de /:notificationId para que no lo capture el parámetro
router.patch('/read-all', AuditAction.declare('NOTIFICATIONS_MARKED_ALL_READ', ENTITY), NotificationController.markAllRead);

router.patch(
  '/:notificationId/read',
  NotificationValidator.markRead(),
  ValidatorUtil.handleValidationErrors,
  AuditAction.declare('NOTIFICATION_MARKED_READ', ENTITY),
  NotificationController.markRead
);

module.exports = router;
