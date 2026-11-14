'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'iam';
const table = { tableName: 'roles', schema: SCHEMA };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(table, {
      role_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(60), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
  },
  down: async queryInterface => {
    await queryInterface.dropTable(table);
  }
};
