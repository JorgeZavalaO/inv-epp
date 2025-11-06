-- AlterTable: Cambiar el tipo de columna 'changes' de TEXT a JSONB preservando los datos
-- Primero convertir los valores existentes de texto a JSON (si son válidos)
-- Si el valor es NULL o vacío, se mantiene como NULL
-- Si el valor es un JSON válido como texto, se convierte a JSONB
-- Si no es válido, se establece como NULL para evitar errores

-- Opción 1: Si 'changes' contiene JSON válido como texto, convertir directamente
ALTER TABLE "AuditLog" 
ALTER COLUMN "changes" TYPE JSONB 
USING CASE 
  WHEN "changes" IS NULL THEN NULL
  WHEN "changes" = '' THEN NULL
  ELSE "changes"::JSONB
END;

-- Si hay errores en la conversión, usar esta alternativa más segura:
-- ALTER TABLE "AuditLog" 
-- ALTER COLUMN "changes" TYPE JSONB 
-- USING CASE 
--   WHEN "changes" IS NULL THEN NULL
--   WHEN "changes" = '' THEN NULL
--   WHEN "changes"::TEXT ~ '^\{.*\}$' OR "changes"::TEXT ~ '^\[.*\]$' THEN "changes"::JSONB
--   ELSE NULL
-- END;
