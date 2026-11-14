// services/person-service/src/schemas/repositories/person.repository.js

const BaseRepository = require('@plantilla/shared/repositories/base.repository');
const { models } = require('#schemas');

class PersonRepository extends BaseRepository {
  constructor() {
    super(models.Person, { searchFields: ['first_name', 'last_name'] });
  }

  findByUserId(userId) {
    return this.findOne({ user_id: userId });
  }

  existsByNationalIdHash(hash, excludePersonId = null) {
    return this.findOne({ national_id_hash: hash }).then(p => Boolean(p) && p.person_id !== excludePersonId);
  }

  /**
   * Crea el perfil solo si no existe (idempotente por user_id).
   * @returns {Promise<[Object, boolean]>} [person, created]
   */
  findOrCreateByUserId(userId, defaults) {
    return this.model.findOrCreate({ where: { user_id: userId }, defaults: { user_id: userId, ...defaults } });
  }
}

module.exports = new PersonRepository();
