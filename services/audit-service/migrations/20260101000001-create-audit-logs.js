'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'audit';
const table = { tableName: 'audit_logs', schema: SCHEMA };

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(table, {
      audit_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      event_id: { type: Sequelize.STRING(64), allowNull: true, unique: true },
      action: { type: Sequelize.STRING(100), allowNull: false },
      actor_id: { type: Sequelize.STRING(64), allowNull: true },
      session_id: { type: Sequelize.STRING(64), allowNull: true },
      service: { type: Sequelize.STRING(60), allowNull: false },
      outcome: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'success' },
      entity_type: { type: Sequelize.STRING(60), allowNull: true },
      entity_id: { type: Sequelize.STRING(64), allowNull: true },
      http_status: { type: Sequelize.INTEGER, allowNull: true },
      error_code: { type: Sequelize.STRING(60), allowNull: true },
      error_message: { type: Sequelize.STRING(500), allowNull: true },
      details: { type: Sequelize.JSONB, allowNull: true },
      correlation_id: { type: Sequelize.STRING(128), allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(500), allowNull: true },
      method: { type: Sequelize.STRING(10), allowNull: true },
      path: { type: Sequelize.STRING(500), allowNull: true },
      source: { type: Sequelize.STRING(20), allowNull: true },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex(table, ['occurred_at']);
    await queryInterface.addIndex(table, ['actor_id', 'occurred_at']);
    await queryInterface.addIndex(table, ['correlation_id']);
    await queryInterface.addIndex(table, ['entity_type', 'entity_id']);

    // Append-only también a nivel de BD: bloquea UPDATE/DELETE aunque alguien lo intente por SQL.
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION "${SCHEMA}".audit_logs_block_changes() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs es append-only';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER audit_logs_no_update_delete
      BEFORE UPDATE OR DELETE ON "${SCHEMA}"."audit_logs"
      FOR EACH ROW EXECUTE FUNCTION "${SCHEMA}".audit_logs_block_changes();
    `);
  },
  down: async queryInterface => {
    await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS audit_logs_no_update_delete ON "${SCHEMA}"."audit_logs"`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS "${SCHEMA}".audit_logs_block_changes()`);
    await queryInterface.dropTable(table);
  }
};
