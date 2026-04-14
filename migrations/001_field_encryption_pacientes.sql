-- =====================================================================
-- Migración: Preparar tabla pacientes para cifrado de campos PHI
-- Fecha: 2026-04-10
-- Razón: Ley 1581/2012 (Habeas Data) + Ley 23/1981 (Confidencialidad Médica)
--
-- Cambios:
--   1. tipo_sangre: ampliar de VARCHAR(5) → VARCHAR(200) para caber ciphertext AES-GCM
--   2. numero_documento: ampliar VARCHAR(20) → VARCHAR(200), quitar UNIQUE (se mueve a HMAC)
--   3. numero_documento_hmac: nuevo campo VARCHAR(64) UNIQUE para búsquedas indexadas
--      sin exponer el dato en plaintext.
--
-- IMPORTANTE: ejecutar en Azure PostgreSQL ANTES de hacer prisma db pull
-- =====================================================================

BEGIN;

-- 1. Ampliar tipo_sangre para caber el ciphertext cifrado
ALTER TABLE pacientes
    ALTER COLUMN tipo_sangre TYPE VARCHAR(200);

-- 2. Ampliar numero_documento y quitar la constraint UNIQUE (se reemplaza con HMAC)
ALTER TABLE pacientes
    ALTER COLUMN numero_documento TYPE VARCHAR(200);

ALTER TABLE pacientes
    DROP CONSTRAINT IF EXISTS pacientes_numero_documento_key;

-- 3. Agregar campo HMAC para búsquedas determinísticas sobre numero_documento
ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS numero_documento_hmac VARCHAR(64);

-- Índice único parcial: NULL no rompe la constraint (pacientes sin documento)
CREATE UNIQUE INDEX IF NOT EXISTS pacientes_numero_documento_hmac_key
    ON pacientes (numero_documento_hmac)
    WHERE numero_documento_hmac IS NOT NULL;

COMMIT;

-- =====================================================================
-- Después de ejecutar este archivo:
--   1. npx prisma db pull      (sincroniza schema.prisma con la BD real)
--   2. npx prisma generate     (regenera el cliente TypeScript)
-- =====================================================================
