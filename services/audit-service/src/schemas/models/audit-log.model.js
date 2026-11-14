// services/audit-service/src/schemas/models/audit-log.model.js
//
// Rastro de auditoría APPEND-ONLY de todo el sistema. Nunca se actualiza ni se
// borra desde la aplicación (el repositorio no expone update/delete).
// event_id UNIQUE → un audit.log.recorded reentregado no se duplica.

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      audit_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      event_id: { type: DataTypes.STRING(64), allowNull: true, unique: true },
      action: { type: DataTypes.STRING(100), allowNull: false },
      actor_id: { type: DataTypes.STRING(64), allowNull: true },
      session_id: { type: DataTypes.STRING(64), allowNull: true },
      service: { type: DataTypes.STRING(60), allowNull: false },
      outcome: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'success' },
      entity_type: { type: DataTypes.STRING(60), allowNull: true },
      entity_id: { type: DataTypes.STRING(64), allowNull: true },
      http_status: { type: DataTypes.INTEGER, allowNull: true },
      error_code: { type: DataTypes.STRING(60), allowNull: true },
      error_message: { type: DataTypes.STRING(500), allowNull: true },
      details: { type: DataTypes.JSON, allowNull: true },
      correlation_id: { type: DataTypes.STRING(128), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      user_agent: { type: DataTypes.STRING(500), allowNull: true },
      method: { type: DataTypes.STRING(10), allowNull: true },
      path: { type: DataTypes.STRING(500), allowNull: true },
      source: { type: DataTypes.STRING(20), allowNull: true },
      occurred_at: { type: DataTypes.DATE, allowNull: false }
    },
    { tableName: 'audit_logs', updatedAt: false }
  );

  return AuditLog;
};
