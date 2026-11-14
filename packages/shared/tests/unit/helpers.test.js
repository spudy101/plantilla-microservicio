const AppError = require('../../src/utils/app-error.util');
const PaginationHelper = require('../../src/utils/pagination.util');
const { hasPermission, ROLES, RBAC_MODULES, RBAC_ACTIONS } = require('../../src/constants/rbac');
const { sanitizeForLog } = require('../../src/utils/logger.util');

describe('AppError', () => {
  it('los errores de negocio no son operacionales', () => {
    const err = AppError.notFound('x');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(false);
    expect(AppError.internal().isOperational).toBe(true);
  });

  it('tooManyRequests lleva retryAfter', () => {
    expect(AppError.tooManyRequests('x', null, 30).retryAfter).toBe(30);
  });
});

describe('PaginationHelper', () => {
  it('aplica defaults y límites', () => {
    expect(PaginationHelper.getPaginationParams({})).toEqual({ page: 1, limit: 10, offset: 0, sortBy: 'created_at', order: 'DESC' });
    expect(PaginationHelper.getPaginationParams({ page: '3', limit: '500', order: 'asc' })).toMatchObject({ page: 3, limit: 100, offset: 200, order: 'ASC' });
  });

  it('buildFilters convierte booleanos y descarta lo no permitido', () => {
    expect(PaginationHelper.buildFilters({ isActive: 'true', hack: '1' }, ['isActive'])).toEqual({ isActive: true });
  });
});

describe('RBAC', () => {
  it('respeta la matriz', () => {
    expect(hasPermission(ROLES.ADMIN, RBAC_MODULES.USERS, RBAC_ACTIONS.DELETE)).toBe(true);
    expect(hasPermission(ROLES.OPERATOR, RBAC_MODULES.USERS, RBAC_ACTIONS.DELETE)).toBe(false);
    expect(hasPermission(ROLES.CLIENT, RBAC_MODULES.PERSONS, RBAC_ACTIONS.READ)).toBe(false);
    expect(hasPermission('INEXISTENTE', RBAC_MODULES.PERSONS, RBAC_ACTIONS.READ)).toBe(false);
  });
});

describe('sanitizeForLog', () => {
  it('redacta campos sensibles en profundidad', () => {
    expect(sanitizeForLog({ email: 'a@b.c', nested: { password: 'x', ok: 1 }, list: [{ token: 't' }] })).toEqual({
      email: '[REDACTED]',
      nested: { password: '[REDACTED]', ok: 1 },
      list: [{ token: '[REDACTED]' }]
    });
  });
});
