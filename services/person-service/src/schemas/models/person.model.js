// services/person-service/src/schemas/models/person.model.js
//
// user_id referencia al usuario de iam-service SIN foreign key (otra BD/esquema):
// la consistencia se mantiene por eventos. Es UNIQUE → el handler de
// iam.user.registered es idempotente aunque el evento llegue dos veces.
//
// PII: national_id y phone cifrados (AES-GCM) + national_id_hash (HMAC) para búsqueda.

const { DataTypes } = require('sequelize');

module.exports = sequelize => {
  const Person = sequelize.define(
    'Person',
    {
      person_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      first_name: { type: DataTypes.STRING(50), allowNull: false },
      last_name: { type: DataTypes.STRING(50), allowNull: false },
      national_id_encrypted: { type: DataTypes.TEXT, allowNull: true },
      national_id_hash: { type: DataTypes.STRING(64), allowNull: true, unique: true },
      phone_encrypted: { type: DataTypes.TEXT, allowNull: true },
      birth_date: { type: DataTypes.DATEONLY, allowNull: true }
    },
    { tableName: 'persons' }
  );

  return Person;
};
