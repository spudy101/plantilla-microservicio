// packages/shared/src/database/database.factory.js
//
// Crea la conexión Sequelize de un servicio y carga sus modelos (*.model.js)
// desde una carpeta. Cada servicio expone el resultado en src/schemas/index.js:
//
//   const db = createDatabase({ config: buildDatabaseConfig('iam'), modelsDir: path.join(__dirname, 'models') });
//   module.exports = db;   // → { sequelize, models, schema }

const fs = require('node:fs');
const path = require('node:path');
const { Sequelize } = require('sequelize');

const MODEL_SUFFIX = '.model.js';

/**
 * @param {{ config: Object, modelsDir: string }} params
 * @returns {{ sequelize: import('sequelize').Sequelize, models: Record<string, any>, schema: string|null }}
 */
const createDatabase = ({ config, modelsDir }) => {
  const { schema, ...options } = config;
  const sequelize = new Sequelize(options);

  const models = {};
  const files = fs
    .readdirSync(modelsDir)
    .filter(file => file.endsWith(MODEL_SUFFIX))
    .sort();

  for (const file of files) {
    const defineModel = require(path.join(modelsDir, file));
    const model = defineModel(sequelize);
    models[model.name] = model;
  }

  for (const model of Object.values(models)) {
    if (typeof model.associate === 'function') {
      model.associate(models);
    }
  }

  return { sequelize, models, schema: schema ?? null };
};

module.exports = { createDatabase };
