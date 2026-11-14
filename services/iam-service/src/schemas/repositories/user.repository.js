// services/iam-service/src/schemas/repositories/user.repository.js

const BaseRepository = require('@plantilla/shared/repositories/base.repository');
const { models } = require('#schemas');

const ROLE_INCLUDE = { model: models.Role, as: 'role', attributes: ['role_id', 'code', 'name'] };

class UserRepository extends BaseRepository {
  constructor() {
    super(models.User, { filterIdField: 'role_id', filterIdKey: 'roleId', defaultInclude: [ROLE_INCLUDE] });
  }

  /** Para login: incluye password_hash (excluido por defaultScope). */
  findByEmailHashWithPassword(emailHash) {
    return this.model.scope('withPassword').findOne({ where: { email_hash: emailHash }, include: [ROLE_INCLUDE] });
  }

  existsByEmailHash(emailHash) {
    return this.exists({ email_hash: emailHash });
  }

  findByIdWithRole(userId, options = {}) {
    return this.findById(userId, { include: [ROLE_INCLUDE], ...options });
  }

  /**
   * Lista paginada con filtro opcional por estado.
   * @param {{ status?: string, roleId?: string }} filters
   */
  findAllPaginatedWithStatus(filters, paginationParams) {
    return this.findAllPaginated(filters, paginationParams, null, {
      _extraFilters: filters.status ? { status: filters.status } : {}
    });
  }

  registerFailedLogin(user, { maxAttempts, lockMinutes }) {
    const attempts = user.failed_login_attempts + 1;
    const MS_PER_MINUTE = 60000;
    return user.update({
      failed_login_attempts: attempts,
      locked_until: attempts >= maxAttempts ? new Date(Date.now() + lockMinutes * MS_PER_MINUTE) : user.locked_until
    });
  }

  registerSuccessfulLogin(user) {
    return user.update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date() });
  }
}

module.exports = new UserRepository();
