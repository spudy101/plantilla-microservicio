require('../src/config');
const { ensureSchema } = require('@plantilla/shared/database/ensure-schema');

ensureSchema('person')
  .then(() => process.exit(0))
  .catch(error => {
    console.error('No se pudo crear el esquema:', error.message);
    process.exit(1);
  });
