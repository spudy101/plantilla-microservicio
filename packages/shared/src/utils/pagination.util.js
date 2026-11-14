// packages/shared/src/utils/pagination.util.js

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Helper de paginación, ordenamiento y filtros desde req.query.
 */
class PaginationHelper {
  /**
   * @param {Object} query - req.query
   * @returns {{ page: number, limit: number, offset: number, sortBy: string, order: 'ASC'|'DESC' }}
   */
  static getPaginationParams(query = {}) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const offset = (page - 1) * limit;
    const sortBy = query.sortBy || 'created_at';
    const order = String(query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return { page, limit, offset, sortBy, order };
  }

  /**
   * Filtros permitidos desde query ('true'/'false' → boolean).
   * @param {Object} query
   * @param {string[]} allowedFilters
   */
  static buildFilters(query = {}, allowedFilters = []) {
    const filters = {};
    for (const key of allowedFilters) {
      if (query[key] === undefined) {
        continue;
      }
      if (query[key] === 'true' || query[key] === true) {
        filters[key] = true;
      } else if (query[key] === 'false' || query[key] === false) {
        filters[key] = false;
      } else {
        filters[key] = query[key];
      }
    }
    return filters;
  }

  /**
   * Metadata estándar de listas. Siempre: totalItems, page, limit, sortBy, order, filters.
   */
  static buildListMetadata(count, paginationParams, filters = {}, searchTerm = null) {
    return {
      totalItems: count,
      totalPages: Math.ceil(count / paginationParams.limit),
      page: paginationParams.page,
      limit: paginationParams.limit,
      sortBy: paginationParams.sortBy,
      order: paginationParams.order,
      filters: searchTerm ? { search: searchTerm, ...filters } : filters
    };
  }
}

module.exports = PaginationHelper;
