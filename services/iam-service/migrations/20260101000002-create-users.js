'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'iam';
const table = { tableName: 'users', schema: SCHEMA };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(table, {
      user_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      email_encrypted: { type: Sequelize.TEXT, allowNull: false },
      email_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(100), allowNull: false },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'roles', schema: SCHEMA }, key: 'role_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      failed_login_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      locked_until: { type: Sequelize.DATE, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['role_id']);
    await queryInterface.addIndex(table, ['status']);
  },
  down: async queryInterface => {
    await queryInterface.dropTable(table);
  }
};
