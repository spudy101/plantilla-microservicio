// services/iam-service/src/schemas/repositories/role.repository.js

const BaseRepository = require('@plantilla/shared/repositories/base.repository');
const { models } = require('#schemas');

class RoleRepository extends BaseRepository {
  constructor() {
    super(models.Role, { searchFields: ['code', 'name'] });
  }

  findByCode(code) {
    return this.findOne({ code, is_active: true });
  }

  findAllActive() {
    return this.findAll({ is_active: true }, { order: [['code', 'ASC']] });
  }
}

module.exports = new RoleRepository();
