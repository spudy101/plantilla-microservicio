// services/notification-service/src/modules/notifications/controllers/notification.controller.js

const ApiResponse = require('@plantilla/shared/utils/app-response.util');
const { asyncHandler } = require('@plantilla/shared/middlewares/error.middleware');
const NotificationService = require('../services/notification.service');

class NotificationController {
  /** GET /notifications */
  list = asyncHandler(async (req, res) => {
    const result = await NotificationService.listInbox(req.user.userId, req.query);
    return ApiResponse.success(res, 'Notificaciones obtenidas', result);
  });

  /** GET /notifications/unread-count */
  unreadCount = asyncHandler(async (req, res) => {
    const result = await NotificationService.unreadCount(req.user.userId);
    return ApiResponse.success(res, 'Contador obtenido', result);
  });

  /** PATCH /notifications/:notificationId/read */
  markRead = asyncHandler(async (req, res) => {
    const result = await NotificationService.markRead(req.params.notificationId, req.user.userId);
    return ApiResponse.success(res, 'Notificación marcada como leída', result);
  });

  /** PATCH /notifications/read-all */
  markAllRead = asyncHandler(async (req, res) => {
    const result = await NotificationService.markAllRead(req.user.userId);
    return ApiResponse.success(res, 'Notificaciones marcadas como leídas', result);
  });

  /** POST /admin/notifications */
  adminSend = asyncHandler(async (req, res) => {
    const result = await NotificationService.adminSend(req.body, req.user.userId);
    return ApiResponse.created(res, 'Notificación enviada', result);
  });
}

module.exports = new NotificationController();
