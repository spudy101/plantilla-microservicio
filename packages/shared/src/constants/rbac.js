// packages/shared/src/constants/rbac.js
//
// Matriz RBAC base (módulo × acción). Vive en shared porque TODOS los servicios
// la necesitan para autorizar con el claim `role` del JWT, sin llamar a iam.
//
// Para agregar un módulo: sumarlo a RBAC_MODULES y darle acciones en ROLE_PERMISSIONS.
// Detalle: docs/rbac.md

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  CLIENT: 'CLIENT'
});

const RBAC_ACTIONS = Object.freeze({
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete'
});

const RBAC_MODULES = Object.freeze({
  USERS: 'users',
  ROLES: 'roles',
  PERSONS: 'persons',
  NOTIFICATIONS: 'notifications',
  AUDIT: 'audit'
});

const ALL = Object.values(RBAC_ACTIONS);
const { READ, UPDATE } = RBAC_ACTIONS;

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: {
    [RBAC_MODULES.USERS]: ALL,
    [RBAC_MODULES.ROLES]: [READ],
    [RBAC_MODULES.PERSONS]: ALL,
    [RBAC_MODULES.NOTIFICATIONS]: ALL,
    [RBAC_MODULES.AUDIT]: [READ]
  },
  [ROLES.OPERATOR]: {
    [RBAC_MODULES.USERS]: [READ],
    [RBAC_MODULES.PERSONS]: [READ, UPDATE],
    [RBAC_MODULES.NOTIFICATIONS]: [READ],
    [RBAC_MODULES.AUDIT]: [READ]
  },
  // El cliente solo opera sobre SUS propios recursos (endpoints /me), sin RBAC de módulo.
  [ROLES.CLIENT]: {}
});

/**
 * @param {string} role
 * @param {string} module
 * @param {string} action
 * @returns {boolean}
 */
const hasPermission = (role, module, action) => Boolean(ROLE_PERMISSIONS[role]?.[module]?.includes(action));

module.exports = { ROLES, RBAC_ACTIONS, RBAC_MODULES, ROLE_PERMISSIONS, hasPermission };
