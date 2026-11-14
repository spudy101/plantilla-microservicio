// services/person-service/src/modules/persons/services/person.service.js

const AppError = require('@plantilla/shared/utils/app-error.util');
const PaginationHelper = require('@plantilla/shared/utils/pagination.util');
const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');
const HashUtil = require('@plantilla/shared/utils/hash.util');
const EventBus = require('@plantilla/shared/events/event-bus');
const { logAudit } = require('@plantilla/shared/utils/logger.util');
const { EVENT_TYPES } = require('@plantilla/shared/constants/events');
const personRepository = require('#schemas/repositories/person.repository');
const { MyProfileDTO, AdminPersonComponent, AdminPersonListDTO } = require('../dtos/person.dto');

const ENTITY = { entityType: 'Person' };

class PersonService {
  async getMe(userId) {
    const person = await personRepository.findByUserId(userId);
    if (!person) {
      throw AppError.notFound('Perfil no encontrado');
    }
    logAudit('PERSON_PROFILE_VIEWED', userId, {}, { ...ENTITY, entityId: person.person_id });
    return MyProfileDTO(person);
  }

  /**
   * PUT /persons/me — upsert del propio perfil (también cubre al admin del seeder,
   * que no pasó por el evento de registro).
   */
  async updateMe(userId, data) {
    const changes = this.#buildChanges(data);
    const existing = await personRepository.findByUserId(userId);

    const nationalIdTaken =
      changes.national_id_hash && (await personRepository.existsByNationalIdHash(changes.national_id_hash, existing?.person_id));
    if (nationalIdTaken) {
      throw AppError.conflict('El documento ya está registrado por otra persona');
    }

    let person;
    if (existing) {
      person = await existing.update(changes);
    } else {
      if (!changes.first_name || !changes.last_name) {
        throw AppError.badRequest('Nombre y apellido son requeridos para crear el perfil');
      }
      person = await personRepository.create({ user_id: userId, ...changes });
    }

    const changedFields = Object.keys(data).filter(k => data[k] !== undefined);
    await EventBus.get().publishSafe(EVENT_TYPES.PERSON_UPDATED, { personId: person.person_id, userId, changedFields });
    logAudit('PERSON_PROFILE_UPDATED', userId, { changedFields }, { ...ENTITY, entityId: person.person_id });

    return MyProfileDTO(person);
  }

  /**
   * Handler de iam.user.registered. Idempotente: si el perfil ya existe no hace nada.
   */
  async createFromRegistration({ userId, firstName, lastName }) {
    const [person, created] = await personRepository.findOrCreateByUserId(userId, { first_name: firstName, last_name: lastName });
    if (created) {
      await EventBus.get().publishSafe(EVENT_TYPES.PERSON_CREATED, { personId: person.person_id, userId });
      logAudit('PERSON_CREATED_FROM_REGISTRATION', userId, {}, { ...ENTITY, entityId: person.person_id });
    }
    return person;
  }

  async adminList(query, adminUserId) {
    const paginationParams = PaginationHelper.getPaginationParams(query);
    const searchTerm = query.search || null;
    const { rows, count } = await personRepository.findAllPaginated({}, paginationParams, searchTerm);

    logAudit('ADMIN_PERSONS_LISTED', adminUserId, { totalItems: count, page: paginationParams.page }, ENTITY);
    return AdminPersonListDTO(rows, PaginationHelper.buildListMetadata(count, paginationParams, {}, searchTerm));
  }

  async adminGetById(personId, adminUserId) {
    const person = await personRepository.findById(personId);
    if (!person) {
      throw AppError.notFound('Persona no encontrada');
    }
    logAudit('ADMIN_PERSON_VIEWED', adminUserId, {}, { ...ENTITY, entityId: personId });
    return AdminPersonComponent(person);
  }

  // Mapea el body camelCase a columnas, cifrando PII. Solo incluye lo que vino.
  #buildChanges({ firstName, lastName, nationalId, phone, birthDate }) {
    const changes = {};
    if (firstName !== undefined) {
      changes.first_name = firstName;
    }
    if (lastName !== undefined) {
      changes.last_name = lastName;
    }
    if (nationalId !== undefined) {
      changes.national_id_encrypted = nationalId ? EncryptionUtil.encrypt(nationalId) : null;
      changes.national_id_hash = nationalId ? HashUtil.hashForSearch(nationalId) : null;
    }
    if (phone !== undefined) {
      changes.phone_encrypted = phone ? EncryptionUtil.encrypt(phone) : null;
    }
    if (birthDate !== undefined) {
      changes.birth_date = birthDate;
    }
    return changes;
  }
}

module.exports = new PersonService();
