// services/iam-service/src/config/database.js — config para sequelize-cli (ver .sequelizerc)
require('./index');
const { buildCliConfig } = require('@plantilla/shared/config/database.config');

module.exports = buildCliConfig('iam');
