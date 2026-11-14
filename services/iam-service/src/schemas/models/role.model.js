// services/iam-service/src/schemas/models/role.model.js
const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Role = sequelize.define(
    'Role',
    {
      role_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true }, // ROLES.* de shared/constants/rbac
      name: { type: DataTypes.STRING(60), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    { tableName: 'roles' }
  );

  Role.associate = models => {
    Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
  };

  return Role;
};
