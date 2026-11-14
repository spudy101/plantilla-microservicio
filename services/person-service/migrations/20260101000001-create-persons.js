'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'person';
const table = { tableName: 'persons', schema: SCHEMA };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(table, {
      person_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      // Referencia lógica a iam.users (sin FK: otro dueño de datos)
      user_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      first_name: { type: Sequelize.STRING(50), allowNull: false },
      last_name: { type: Sequelize.STRING(50), allowNull: false },
      national_id_encrypted: { type: Sequelize.TEXT, allowNull: true },
      national_id_hash: { type: Sequelize.STRING(64), allowNull: true, unique: true },
      phone_encrypted: { type: Sequelize.TEXT, allowNull: true },
      birth_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['last_name', 'first_name']);
  },
  down: async queryInterface => {
    await queryInterface.dropTable(table);
  }
};
