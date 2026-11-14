// services/iam-service/src/schemas/models/user-session.model.js
//
// Una fila por login. refresh_token_hash = sha256(jti del refresh vigente):
// al rotar se reemplaza; si llega un refresh con otro jti → reuse attack.

const { DataTypes } = require('sequelize');

const SESSION_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', REVOKED: 'REVOKED', EXPIRED: 'EXPIRED' });

module.exports = sequelize => {
  const UserSession = sequelize.define(
    'UserSession',
    {
      session_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      refresh_token_hash: { type: DataTypes.STRING(64), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: SESSION_STATUS.ACTIVE },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
      user_agent: { type: DataTypes.STRING(500), allowNull: true },
      last_activity_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      revoked_reason: { type: DataTypes.STRING(50), allowNull: true }
    },
    { tableName: 'user_sessions' }
  );

  UserSession.associate = models => {
    UserSession.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  UserSession.STATUS = SESSION_STATUS;
  return UserSession;
};

module.exports.SESSION_STATUS = SESSION_STATUS;
