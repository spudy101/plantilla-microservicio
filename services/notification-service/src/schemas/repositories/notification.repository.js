// services/notification-service/src/schemas/repositories/notification.repository.js

const BaseRepository = require('@plantilla/shared/repositories/base.repository');
const { models } = require('#schemas');
const { CHANNELS } = require('#schemas/models/notification.model');

class NotificationRepository extends BaseRepository {
  constructor() {
    super(models.Notification);
  }

  /** Bandeja in-app del usuario (opcionalmente solo no leídas). */
  findInboxPaginated(userId, { unreadOnly }, paginationParams) {
    return this.findAllPaginated({}, paginationParams, null, {
      _extraFilters: { user_id: userId, channel: CHANNELS.IN_APP, ...(unreadOnly && { read_at: null }) }
    });
  }

  countUnread(userId) {
    return this.count({ user_id: userId, channel: CHANNELS.IN_APP, read_at: null });
  }

  findOwnInApp(notificationId, userId) {
    return this.findOne({ notification_id: notificationId, user_id: userId, channel: CHANNELS.IN_APP });
  }

  async markAllRead(userId) {
    const [affected] = await this.model.update(
      { read_at: new Date() },
      { where: { user_id: userId, channel: CHANNELS.IN_APP, read_at: null } }
    );
    return affected;
  }

  /**
   * Inserta ignorando duplicados del mismo evento+canal.
   * @returns {Promise<Object|null>} la fila creada o null si ya existía
   */
  async createOnce(data) {
    if (data.source_event_id) {
      const existing = await this.findOne({ source_event_id: data.source_event_id, channel: data.channel });
      if (existing) {
        return null;
      }
    }
    return this.create(data);
  }
}

module.exports = new NotificationRepository();
