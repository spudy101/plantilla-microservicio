const EncryptionUtil = require('../../src/utils/encryption.util');
const HashUtil = require('../../src/utils/hash.util');

describe('EncryptionUtil', () => {
  it('cifra y descifra ida y vuelta', () => {
    const encrypted = EncryptionUtil.encrypt('12.345.678-9');
    expect(encrypted).not.toContain('12.345.678-9');
    expect(encrypted.split(':')).toHaveLength(3);
    expect(EncryptionUtil.decrypt(encrypted)).toBe('12.345.678-9');
  });

  it('usa IV aleatorio: el mismo valor cifra distinto', () => {
    expect(EncryptionUtil.encrypt('hola')).not.toBe(EncryptionUtil.encrypt('hola'));
  });

  it('detecta datos alterados (authTag GCM)', () => {
    const [iv, tag, data] = EncryptionUtil.encrypt('dato').split(':');
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}00`;
    expect(() => EncryptionUtil.decrypt(tampered)).toThrow();
    expect(EncryptionUtil.safeDecrypt(tampered)).toBeNull();
  });

  it('respeta null/undefined', () => {
    expect(EncryptionUtil.encrypt(null)).toBeNull();
    expect(EncryptionUtil.decrypt(undefined)).toBeUndefined();
  });
});

describe('HashUtil', () => {
  it('es determinístico y normaliza mayúsculas/espacios', () => {
    expect(HashUtil.hashForSearch(' User@Mail.com ')).toBe(HashUtil.hashForSearch('user@mail.com'));
  });

  it('verify compara en tiempo constante', () => {
    const stored = HashUtil.hashForSearch('valor');
    expect(HashUtil.verify('valor', stored)).toBe(true);
    expect(HashUtil.verify('otro', stored)).toBe(false);
  });

  it('safeEqual no falla con largos distintos', () => {
    expect(HashUtil.safeEqual('a', 'abc')).toBe(false);
    expect(HashUtil.safeEqual('abc', 'abc')).toBe(true);
    expect(HashUtil.safeEqual(undefined, 'abc')).toBe(false);
  });
});
