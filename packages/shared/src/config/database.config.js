// packages/shared/src/config/database.config.js
//
// Configuración de Sequelize (runtime + sequelize-cli) para un servicio.
//
// Base de datos: UN Postgres con UN ESQUEMA POR SERVICIO (iam, person, ...).
// Cada servicio solo toca su esquema: nunca hace JOIN contra tablas de otro
// servicio — eso se resuelve por API interna o por eventos. Separar a una BD por
// servicio más adelante es solo cambiar DB_HOST/DB_NAME.
//
// Tests: SQLite en memoria (los esquemas no aplican en SQLite).

const fs = require('node:fs');
const { helpers, server } = require('./env');

const { optional, toInt, toBool } = helpers;
const DEFAULT_DB_PORT = 5432;
const POOL_ACQUIRE_MS = 30000;
const POOL_IDLE_MS = 10000;

/**
 * @param {string} defaultSchema - esquema del servicio (p.ej. 'iam')
 */
const buildDatabaseConfig = defaultSchema => {
  const schema = optional('DB_SCHEMA', defaultSchema);

  if (server.isTest) {
    return {
      schema: null,
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      define: { underscored: true, freezeTableName: true, timestamps: true }
    };
  }

  const ssl = toBool(optional('DB_SSL'), false);
  const caPath = optional('DB_CA_BUNDLE_PATH');

  return {
    schema,
    dialect: 'postgres',
    host: optional('DB_HOST', 'localhost'),
    port: toInt(optional('DB_PORT'), DEFAULT_DB_PORT),
    database: optional('DB_NAME', 'plantilla'),
    username: optional('DB_USER', 'postgres'),
    password: optional('DB_PASSWORD', 'postgres'),
    logging: toBool(optional('DB_LOGGING'), false) ? console.log : false,
    dialectOptions: {
      ...(ssl && {
        ssl: caPath
          ? { require: true, rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') }
          : { require: true, rejectUnauthorized: false }
      })
    },
    // Tracking de migraciones/seeders DENTRO del esquema del servicio (no en `public`).
    migrationStorageTableSchema: schema,
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData',
    seederStorageTableSchema: schema,
    define: { schema, underscored: true, freezeTableName: true, timestamps: true },
    pool: {
      max: toInt(optional('DB_POOL_MAX'), server.isProduction ? 10 : 5),
      min: 0,
      acquire: POOL_ACQUIRE_MS,
      idle: POOL_IDLE_MS
    }
  };
};

/**
 * Formato que espera sequelize-cli: { [NODE_ENV]: config }.
 * Uso en services/x/src/config/database.js:
 *   module.exports = buildCliConfig('iam');
 */
const buildCliConfig = defaultSchema => {
  const config = buildDatabaseConfig(defaultSchema);
  return { [server.nodeEnv]: config, development: config, production: config, test: config };
};

module.exports = { buildDatabaseConfig, buildCliConfig };
