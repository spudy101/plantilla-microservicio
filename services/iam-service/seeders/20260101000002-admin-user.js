'use strict';

// Admin inicial. Credenciales desde SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (nunca hardcodeadas).
// Nota: el perfil (nombre, etc.) del admin se crea en person-service al primer uso
// de PUT /persons/me, porque este seeder no pasa por el evento de registro.

require('../src/config');
const bcrypt = require('bcryptjs');
const EncryptionUtil = require('@plantilla/shared/utils/encryption.util');
const HashUtil = require('@plantilla/shared/utils/hash.util');

const SCHEMA = process.env.DB_SCHEMA || 'iam';
const BCRYPT_ROUNDS = 12;

module.exports = {
  up: async queryInterface => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn('⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no definidos — se omite el admin inicial');
      return;
    }

    const [roles] = await queryInterface.sequelize.query(`SELECT role_id FROM "${SCHEMA}"."roles" WHERE code = 'ADMIN' LIMIT 1`);
    if (!roles.length) {
      throw new Error('Rol ADMIN no existe: corre primero el seeder de roles');
    }

    const now = new Date();
    await queryInterface.bulkInsert(
      { tableName: 'users', schema: SCHEMA },
      [
        {
          email_encrypted: EncryptionUtil.encrypt(email),
          email_hash: HashUtil.hashForSearch(email),
          password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
          role_id: roles[0].role_id,
          status: 'ACTIVE',
          failed_login_attempts: 0,
          created_at: now,
          updated_at: now
        }
      ]
    );
  },
  down: async queryInterface => {
    const email = process.env.SEED_ADMIN_EMAIL;
    if (email) {
      await queryInterface.bulkDelete({ tableName: 'users', schema: SCHEMA }, { email_hash: HashUtil.hashForSearch(email) });
    }
  }
};
