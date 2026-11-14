// services/api-gateway/src/routing/route-table.js
//
// Tabla de ruteo: prefijo → servicio. El path se reenvía SIN reescribir, así
// cada servicio expone exactamente las mismas rutas que ve el cliente.
//
// Para exponer un servicio nuevo: agregar su URL en config y sus prefijos acá.
// Las rutas `public` no exigen JWT en el gateway (el servicio igual decide).

const ROUTES = [
  {
    prefix: '/api/v1/auth',
    service: 'iam',
    public: ['POST /api/v1/auth/register', 'POST /api/v1/auth/login', 'POST /api/v1/auth/refresh']
  },
  { prefix: '/api/v1/admin/users', service: 'iam' },
  { prefix: '/api/v1/admin/roles', service: 'iam' },
  { prefix: '/api/v1/persons', service: 'person' },
  { prefix: '/api/v1/admin/persons', service: 'person' },
  { prefix: '/api/v1/notifications', service: 'notification' },
  { prefix: '/api/v1/admin/notifications', service: 'notification' },
  { prefix: '/api/v1/admin/audit-logs', service: 'audit' }
];

// Prefijo más largo primero: /api/v1/admin/users gana sobre un hipotético /api/v1/admin.
const SORTED = [...ROUTES].sort((a, b) => b.prefix.length - a.prefix.length);

const matchesPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * @param {string} method
 * @param {string} path - sin query string
 * @returns {{ service: string, prefix: string, isPublic: boolean }|null}
 */
const resolveRoute = (method, path) => {
  const route = SORTED.find(r => matchesPrefix(path, r.prefix));
  if (!route) {
    return null;
  }
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return {
    service: route.service,
    prefix: route.prefix,
    isPublic: (route.public ?? []).includes(`${method.toUpperCase()} ${normalized}`)
  };
};

module.exports = { ROUTES, resolveRoute };
