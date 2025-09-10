-- Optional: enable pg_trgm for fast ILIKE/contains searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for text search
CREATE INDEX IF NOT EXISTS "EPP_name_trgm" ON "EPP" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "EPP_code_trgm" ON "EPP" USING GIN ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "DeliveryBatch_code_trgm" ON "DeliveryBatch" USING GIN ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Collaborator_name_trgm" ON "Collaborator" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_name_trgm" ON "User" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_email_trgm" ON "User" USING GIN ("email" gin_trgm_ops);

