'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'iam';
const table = { tableName: 'roles', schema: SCHEMA };

// Debe calzar con ROLES de @plantilla/shared/constants/rbac
const ROLES = [
  { code: 'ADMIN', name: 'Administrador', description: 'Acceso total al panel de administración' },
  { code: 'OPERATOR', name: 'Operador', description: 'Lectura y operación limitada' },
  { code: 'CLIENT', name: 'Cliente', description: 'Usuario final de la app' }
];

module.exports = {
  up: async queryInterface => {
    const now = new Date();
    await queryInterface.bulkInsert(
      table,
      ROLES.map(r => ({ ...r, is_active: true, created_at: now, updated_at: now }))
    );
  },
  down: async queryInterface => {
    await queryInterface.bulkDelete(table, { code: ROLES.map(r => r.code) });
  }
};
