#!/usr/bin/env node
// scripts/generate-keys.util.js
//
// Genera TODOS los secretos locales y crea services/*/.env a partir de cada
// .env.example (no pisa un .env existente salvo con --force):
//
//   - Par RSA 2048 para JWT RS256: la PRIVADA solo va a iam-service.
//   - AES_KEY / HASH_PEPPER por servicio que guarda PII (iam, person).
//   - INTERNAL_API_KEY compartida por todos.
//   - SEED_ADMIN_PASSWORD aleatoria para el admin inicial.
//
//   pnpm keys:generate            # crea los .env que falten
//   pnpm keys:generate --force    # regenera todos (invalida sesiones y datos cifrados)

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SERVICES_DIR = path.join(ROOT, 'services');
const force = process.argv.includes('--force');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});

const hex = bytes => crypto.randomBytes(bytes).toString('hex');
const pemForEnv = pem => `"${pem.trim().replaceAll('\n', String.raw`\n`)}"`;
const strongPassword = () => `${crypto.randomBytes(12).toString('base64url')}#A1a`;

const shared = {
  JWT_PUBLIC_KEY: pemForEnv(publicKey),
  INTERNAL_API_KEY: hex(32)
};

const perService = {
  'iam-service': {
    JWT_PRIVATE_KEY: pemForEnv(privateKey),
    AES_KEY: hex(32),
    HASH_PEPPER: hex(32),
    SEED_ADMIN_PASSWORD: strongPassword()
  },
  'person-service': { AES_KEY: hex(32), HASH_PEPPER: hex(32) }
};

const fillEnv = (template, values) =>
  template
    .split('\n')
    .map(line => {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (!match) {
        return line;
      }
      const [, key, current] = match;
      return key in values && current.trim() === '' ? `${key}=${values[key]}` : line;
    })
    .join('\n');

const created = [];
for (const service of fs.readdirSync(SERVICES_DIR)) {
  const example = path.join(SERVICES_DIR, service, '.env.example');
  const target = path.join(SERVICES_DIR, service, '.env');
  if (!fs.existsSync(example)) {
    continue;
  }
  if (fs.existsSync(target) && !force) {
    console.log(`↷ ${service}/.env ya existe (usa --force para regenerar)`);
    continue;
  }
  const values = { ...shared, ...(perService[service] ?? {}) };
  fs.writeFileSync(target, fillEnv(fs.readFileSync(example, 'utf8'), values), { mode: 0o600 });
  created.push(service);
  console.log(`✔ ${service}/.env`);
}

if (created.includes('iam-service')) {
  console.log('\nAdmin inicial: credenciales en SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD de services/iam-service/.env');
}
console.log('\nListo. Si regeneraste con --force, las sesiones y los datos cifrados anteriores dejan de ser válidos.');
