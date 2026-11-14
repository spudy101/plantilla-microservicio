// services/iam-service/src/schemas/models/user.model.js
//
// Credenciales y estado de la cuenta. Los datos personales (nombre, documento,
// teléfono) NO viven acá: son de person-service.
//
// email: cifrado (AES-GCM) para mostrarlo + email_hash (HMAC) para buscar/unicidad.

const { DataTypes } = require('sequelize');

const USER_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', BLOCKED: 'BLOCKED' });

module.exports = sequelize => {
  const User = sequelize.define(
    'User',
    {
      user_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      email_encrypted: { type: DataTypes.TEXT, allowNull: false },
      email_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(100), allowNull: false },
      role_id: { type: DataTypes.UUID, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: USER_STATUS.ACTIVE, validate: { isIn: [Object.values(USER_STATUS)] } },
      failed_login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until: { type: DataTypes.DATE, allowNull: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: 'users',
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withPassword: { attributes: { include: ['password_hash'] } } }
    }
  );

  User.associate = models => {
    User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    User.hasMany(models.UserSession, { foreignKey: 'user_id', as: 'sessions' });
  };

  User.STATUS = USER_STATUS;
  return User;
};

module.exports.USER_STATUS = USER_STATUS;
