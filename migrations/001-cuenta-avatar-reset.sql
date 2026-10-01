-- Módulo de configuración de cuenta: foto de perfil y restablecimiento de
-- contraseña. Además, edad / altura / peso de inicio pasan a ser obligatorios
-- porque el registro ya no los deja vacíos.

-- 1. Foto de perfil. TEXT porque guardamos un data URL (base64), no una ruta.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarDataUrl" TEXT;

-- 2. Rellena los datos físicos de las cuentas que se crearon antes de que
--    fueran obligatorios. Sin este paso, el SET NOT NULL de abajo falla.
--    Valores por defecto = los declarados en la ficha del usuario; cámbialos
--    si la cuenta era de otra persona.
UPDATE "User"
SET "age" = 19,
    "heightCm" = 175,
    "startingWeightKg" = 50
WHERE "age" IS NULL
   OR "heightCm" IS NULL
   OR "startingWeightKg" IS NULL;

-- 3. Ahora sí, obligatorios.
ALTER TABLE "User" ALTER COLUMN "age" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "heightCm" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "startingWeightKg" SET NOT NULL;

-- 4. Tokens de un solo uso para restablecer la contraseña sin sesión.
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
    ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
    ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx"
    ON "PasswordResetToken"("expiresAt");

-- 5. La clave foránea va aparte: `CREATE TABLE IF NOT EXISTS` la omite si la
--    tabla ya existía, y sin ella el borrado en cascada no funcionaría.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken"
      ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;