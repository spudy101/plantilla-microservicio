// packages/shared/src/database/ensure-schema.js
//
// Crea el esquema del servicio si no existe. Se corre ANTES de `sequelize-cli
// db:migrate`, porque la tabla de tracking (SequelizeMeta) vive dentro del
// esquema y sequelize-cli la crea antes de la primera migración.

const { Sequelize } = require('sequelize');
const { buildDatabaseConfig } = require('../config/database.config');

/**
 * @param {string} defaultSchema
 */
const ensureSchema = async defaultSchema => {
  const { schema, ...options } = buildDatabaseConfig(defaultSchema);
  if (!schema) {
    return; // SQLite (tests): no hay esquemas
  }
  const sequelize = new Sequelize(options);
  try {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema.replaceAll('"', '')}"`);
  } finally {
    await sequelize.close();
  }
};

module.exports = { ensureSchema };
