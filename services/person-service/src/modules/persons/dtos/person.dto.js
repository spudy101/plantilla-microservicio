// services/person-service/src/modules/persons/dtos/person.dto.js

const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');
const MaskingUtil = require('@plantilla/shared/utils/masking.util');
const { ListResponseDTO } = require('@plantilla/shared/dtos/metadata.dto');

const base = person => ({
  personId: person.person_id,
  userId: person.user_id,
  firstName: person.first_name,
  lastName: person.last_name,
  birthDate: person.birth_date ?? null,
  updatedAt: person.updated_at ?? person.updatedAt ?? null
});

/** El dueño ve su PII completa. */
const MyProfileDTO = person => ({
  ...base(person),
  nationalId: EncryptionUtil.safeDecrypt(person.national_id_encrypted),
  phone: EncryptionUtil.safeDecrypt(person.phone_encrypted)
});

/** Admin/operador: PII enmascarada. */
const AdminPersonComponent = person => ({
  ...base(person),
  nationalId: MaskingUtil.maskTail(EncryptionUtil.safeDecrypt(person.national_id_encrypted)),
  phone: MaskingUtil.maskTail(EncryptionUtil.safeDecrypt(person.phone_encrypted))
});

const AdminPersonListDTO = (rows, metadata) => ListResponseDTO(rows, metadata, AdminPersonComponent);

module.exports = { MyProfileDTO, AdminPersonComponent, AdminPersonListDTO };
