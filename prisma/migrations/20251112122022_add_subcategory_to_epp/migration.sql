-- AddColumn subcategory to EPP
ALTER TABLE "EPP" ADD COLUMN "subcategory" VARCHAR(64);

-- CreateIndex on subcategory for performance
CREATE INDEX "EPP_subcategory_idx" ON "EPP"("subcategory");
