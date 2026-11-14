// services/notification-service/src/modules/notifications/services/notification.service.js

const AppError = require('@plantilla/shared/utils/app-error.util');
const PaginationHelper = require('@plantilla/shared/utils/pagination.util');
const { logger, logAudit } = require('@plantilla/shared/utils/logger.util');
const notificationRepository = require('#schemas/repositories/notification.repository');
const { CHANNELS, STATUS } = require('#schemas/models/notification.model');
const EmailProvider = require('#providers/email.provider');
const IamClient = require('#clients/iam.client');
const { NotificationComponent, NotificationListDTO } = require('../dtos/notification.dto');

const ENTITY = { entityType: 'Notification' };
const MAX_ERROR_LENGTH = 500;

class NotificationService {
  /**
   * Punto de entrada ÚNICO para crear notificaciones (handlers de eventos y admin).
   *
   * Idempotente por (sourceEventId, channel): si el bus reentrega el evento, la
   * in-app no se duplica y el email solo se reintenta si antes falló.
   * Si el email falla LANZA → el bus reintenta el evento.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {{ category: string, title: string, body: string }} params.content
   * @param {string[]} [params.channels]  - CHANNELS.*
   * @param {string} [params.email]       - si no viene y se pide EMAIL, se consulta a iam
   * @param {Object} [params.data]
   * @param {string} [params.sourceEventId]
   */
  async notify({ userId, content, channels = [CHANNELS.IN_APP], email = null, data = null, sourceEventId = null }) {
    const base = { user_id: userId, ...content, data, source_event_id: sourceEventId };
    let inApp = null;

    if (channels.includes(CHANNELS.IN_APP)) {
      inApp = await notificationRepository.createOnce({
        ...base,
        channel: CHANNELS.IN_APP,
        status: STATUS.SENT,
        sent_at: new Date()
      });
    }
    if (channels.includes(CHANNELS.EMAIL)) {
      await this.#sendEmail(base, email);
    }
    return inApp;
  }

  async #sendEmail(base, email) {
    const existing = base.source_event_id
      ? await notificationRepository.findOne({ source_event_id: base.source_event_id, channel: CHANNELS.EMAIL })
      : null;
    if (existing?.status === STATUS.SENT) {
      return;
    }

    const row = existing ?? (await notificationRepository.create({ ...base, channel: CHANNELS.EMAIL, status: STATUS.PENDING }));
    try {
      const to = email ?? (await IamClient.getUserContact(base.user_id)).email;
      await EmailProvider.send({ to, subject: base.title, text: base.body });
      await row.update({ status: STATUS.SENT, sent_at: new Date(), error_message: null });
      logAudit('EMAIL_NOTIFICATION_SENT', 'system', { category: base.category }, { ...ENTITY, entityId: row.notification_id });
    } catch (error) {
      await row.update({ status: STATUS.FAILED, error_message: String(error.message).slice(0, MAX_ERROR_LENGTH) });
      logger.error('Falló el envío de email', { notificationId: row.notification_id, error: error.message });
      throw error;
    }
  }

  // ─── Bandeja del usuario ────────────────────────────────────────────────────

  async listInbox(userId, query) {
    const paginationParams = PaginationHelper.getPaginationParams(query);
    const unreadOnly = query.unreadOnly === true || query.unreadOnly === 'true';
    const { rows, count } = await notificationRepository.findInboxPaginated(userId, { unreadOnly }, paginationParams);
    return NotificationListDTO(rows, PaginationHelper.buildListMetadata(count, paginationParams, { unreadOnly }));
  }

  async unreadCount(userId) {
    return { unread: await notificationRepository.countUnread(userId) };
  }

  async markRead(notificationId, userId) {
    const notification = await notificationRepository.findOwnInApp(notificationId, userId);
    if (!notification) {
      throw AppError.notFound('Notificación no encontrada');
    }
    if (!notification.read_at) {
      await notification.update({ read_at: new Date() });
    }
    return NotificationComponent(notification);
  }

  async markAllRead(userId) {
    const updated = await notificationRepository.markAllRead(userId);
    logAudit('NOTIFICATIONS_MARKED_ALL_READ', userId, { updated }, ENTITY);
    return { updated };
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async adminSend({ userId, title, body, channels }, adminUserId) {
    const notification = await this.notify({ userId, content: { category: 'GENERAL', title, body }, channels });
    logAudit(
      'ADMIN_NOTIFICATION_SENT',
      adminUserId,
      { userId, channels },
      { ...ENTITY, entityId: notification?.notification_id ?? null }
    );
    return notification ? NotificationComponent(notification) : null;
  }
}

module.exports = new NotificationService();
