// Crea las tablas en SQLite y siembra los roles base.
const db = require('../../src/schemas');
const { ROLES } = require('@plantilla/shared/constants/rbac');

const resetDatabase = async () => {
  await db.sequelize.sync({ force: true });
  await db.models.Role.bulkCreate(Object.values(ROLES).map(code => ({ code, name: code })));
};

module.exports = { db, resetDatabase };
