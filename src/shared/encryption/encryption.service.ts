import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from 'crypto';

/**
 * EncryptionService — Cifrado de campos PHI (Protected Health Information)
 *
 * Algoritmo: AES-256-GCM
 * - GCM (Galois/Counter Mode) es cifrado autenticado: detecta si el ciphertext
 *   fue alterado (authTag), lo que previene ataques de bit-flipping.
 * - IV (nonce) aleatorio de 96 bits por cada cifrado — la misma clave + mismo
 *   plaintext produce ciphertext diferente cada vez (propiedad IND-CPA).
 *
 * Para búsquedas sobre campos cifrados (ej. número de documento) se usa HMAC-SHA256
 * con una clave derivada separada. HMAC es determinístico: el mismo plaintext
 * siempre produce el mismo hash, permitiendo usar índices DB sin exponer el dato.
 * La clave HMAC es distinta a la de AES para seguir el principio de separación de claves.
 *
 * Formato almacenado en BD: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly ALGO = 'aes-256-gcm' as const;
  private aesKey!: Buffer;
  private hmacKey!: Buffer;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const rawKey = this.config.get<string>('FIELD_ENCRYPTION_KEY');

    if (!rawKey) {
      // Si no hay clave, el servicio opera en modo "pass-through":
      // encrypt() devuelve el plaintext, decrypt() devuelve el ciphertext sin cambios.
      // Esto permite un despliegue gradual sin romper datos existentes.
      this.logger.warn(
        'FIELD_ENCRYPTION_KEY no definida — cifrado de campos PHI DESACTIVADO. ' +
          'Configura esta variable en producción para cumplir con Ley 1581/2012.',
      );
      return;
    }

    const salt = this.config.get<string>('FIELD_ENCRYPTION_SALT') ?? 'asclepio-v1';

    // scryptSync deriva claves de longitud fija desde una clave arbitraria.
    // Usamos dos salts distintos para obtener dos claves independientes (AES y HMAC).
    // scrypt tiene costo computacional alto a propósito — hace los ataques de diccionario lentos.
    this.aesKey = scryptSync(rawKey, `${salt}-aes`, 32);
    this.hmacKey = scryptSync(rawKey, `${salt}-hmac`, 32);
    this.enabled = true;

    this.logger.log('Cifrado AES-256-GCM para campos PHI ACTIVADO');
  }

  /** Cifra un string. Si el servicio no tiene clave, devuelve el plaintext sin cambios. */
  encrypt(plaintext: string): string {
    if (!this.enabled) return plaintext;

    const iv = randomBytes(12); // 96 bits — tamaño recomendado para GCM
    const cipher = createCipheriv(this.ALGO, this.aesKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 128-bit tag de autenticación

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /** Descifra un string. Detecta automáticamente si el valor está cifrado o es plaintext. */
  decrypt(value: string): string {
    if (!this.enabled) return value;

    // Si no tiene el formato esperado (iv:authTag:data), asumir que es plaintext legacy
    if (!this.isCiphertext(value)) return value;

    const [ivHex, authTagHex, dataHex] = value.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = createDecipheriv(this.ALGO, this.aesKey, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  }

  /** Versiones null-safe para campos opcionales. */
  encryptOrNull(value: string | null | undefined): string | null {
    return value != null ? this.encrypt(value) : null;
  }

  decryptOrNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    try {
      return this.decrypt(value);
    } catch {
      // Si el authTag falla (dato corrupto o alterado), retornar null en lugar de lanzar
      return null;
    }
  }

  /**
   * HMAC-SHA256 determinístico para campos de búsqueda.
   * A diferencia de AES-GCM (IV aleatorio), HMAC del mismo input siempre produce
   * el mismo output — lo que permite usarlo como clave de índice en la BD.
   */
  hmac(value: string): string {
    if (!this.enabled) return value;
    return createHmac('sha256', this.hmacKey).update(value, 'utf8').digest('hex');
  }

  hmacOrNull(value: string | null | undefined): string | null {
    return value != null ? this.hmac(value) : null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Detecta si un string está en el formato de ciphertext `iv:authTag:data`. */
  private isCiphertext(value: string): boolean {
    const parts = value.split(':');
    return (
      parts.length === 3 &&
      parts[0].length === 24 && // IV hex: 12 bytes = 24 hex chars
      parts[1].length === 32 && // authTag hex: 16 bytes = 32 hex chars
      parts[2].length > 0
    );
  }
}

// Daniel Useche
