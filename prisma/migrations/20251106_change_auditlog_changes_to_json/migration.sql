-- AlterTable: Cambiar el tipo de columna 'changes' de TEXT a JSONB de forma segura
-- Primero: Crear columna temporal para los datos válidos
ALTER TABLE "AuditLog" ADD COLUMN "changes_temp" JSONB DEFAULT NULL;

-- Segundo: Copiar datos válidos a la columna temporal (usando tratamiento de excepciones)
UPDATE "AuditLog" 
SET "changes_temp" = (
  SELECT CASE 
    WHEN "changes" IS NULL OR "changes" = '' THEN NULL
    ELSE "changes"::JSONB
  END
);

-- Tercero: Reemplazar la columna original
ALTER TABLE "AuditLog" DROP COLUMN "changes";
ALTER TABLE "AuditLog" RENAME COLUMN "changes_temp" TO "changes";
