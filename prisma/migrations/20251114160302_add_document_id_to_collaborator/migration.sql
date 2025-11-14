-- AddColumn documentId to Collaborator (optional field)
-- This is a safe migration that won't delete any data

-- Add the documentId column as nullable
ALTER TABLE "Collaborator" ADD COLUMN "documentId" VARCHAR(20);

-- Create index for better query performance
CREATE INDEX "Collaborator_documentId_idx" ON "Collaborator"("documentId");
