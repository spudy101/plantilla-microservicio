'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'notification';
const table = { tableName: 'notifications', schema: SCHEMA };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(table, {
      notification_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      user_id: { type: Sequelize.UUID, allowNull: false },
      channel: { type: Sequelize.STRING(20), allowNull: false },
      category: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'GENERAL' },
      title: { type: Sequelize.STRING(150), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      data: { type: Sequelize.JSONB, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDING' },
      error_message: { type: Sequelize.STRING(500), allowNull: true },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      source_event_id: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['user_id', 'channel', 'read_at']);
    await queryInterface.addIndex(table, ['source_event_id', 'channel'], { unique: true });
  },
  down: async queryInterface => {
    await queryInterface.dropTable(table);
  }
};
