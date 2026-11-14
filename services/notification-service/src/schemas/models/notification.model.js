// services/notification-service/src/schemas/models/notification.model.js
//
// Una fila por notificación y canal. IN_APP se muestra en la bandeja (read_at);
// EMAIL registra el resultado del envío (status / error_message).
//
// source_event_id + channel es UNIQUE: aunque un evento llegue dos veces, no se
// duplica la notificación (idempotencia a nivel de BD, además del bus).

const { DataTypes } = require('sequelize');

const CHANNELS = Object.freeze({ IN_APP: 'IN_APP', EMAIL: 'EMAIL' });
const STATUS = Object.freeze({ PENDING: 'PENDING', SENT: 'SENT', FAILED: 'FAILED' });
const CATEGORIES = Object.freeze({ WELCOME: 'WELCOME', SECURITY: 'SECURITY', ACCOUNT: 'ACCOUNT', GENERAL: 'GENERAL' });

module.exports = sequelize => {
  const Notification = sequelize.define(
    'Notification',
    {
      notification_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      channel: { type: DataTypes.STRING(20), allowNull: false },
      category: { type: DataTypes.STRING(30), allowNull: false, defaultValue: CATEGORIES.GENERAL },
      title: { type: DataTypes.STRING(150), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      data: { type: DataTypes.JSON, allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: STATUS.PENDING },
      error_message: { type: DataTypes.STRING(500), allowNull: true },
      sent_at: { type: DataTypes.DATE, allowNull: true },
      read_at: { type: DataTypes.DATE, allowNull: true },
      source_event_id: { type: DataTypes.STRING(64), allowNull: true }
    },
    {
      tableName: 'notifications',
      indexes: [{ unique: true, fields: ['source_event_id', 'channel'] }]
    }
  );

  return Notification;
};

module.exports.CHANNELS = CHANNELS;
module.exports.STATUS = STATUS;
module.exports.CATEGORIES = CATEGORIES;
