'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'iam';
const table = { tableName: 'user_sessions', schema: SCHEMA };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(table, {
      session_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: { tableName: 'users', schema: SCHEMA }, key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      refresh_token_hash: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      last_activity_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      revoked_reason: { type: Sequelize.STRING(50), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['user_id', 'status']);
    await queryInterface.addIndex(table, ['status', 'expires_at']);
  },
  down: async queryInterface => {
    await queryInterface.dropTable(table);
  }
};
