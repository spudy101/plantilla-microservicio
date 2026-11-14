// services/notification-service/src/modules/notifications/dtos/notification.dto.js

const { ListResponseDTO } = require('@plantilla/shared/dtos/metadata.dto');

const NotificationComponent = n => ({
  notificationId: n.notification_id,
  category: n.category,
  title: n.title,
  body: n.body,
  data: n.data ?? null,
  isRead: Boolean(n.read_at),
  readAt: n.read_at ?? null,
  createdAt: n.created_at ?? n.createdAt ?? null
});

const NotificationListDTO = (rows, metadata) => ListResponseDTO(rows, metadata, NotificationComponent);

module.exports = { NotificationComponent, NotificationListDTO };
