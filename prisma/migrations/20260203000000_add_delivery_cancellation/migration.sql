-- AlterTable: Agregar campos de anulación a DeliveryBatch
ALTER TABLE "DeliveryBatch" ADD COLUMN "isCancelled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DeliveryBatch" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "DeliveryBatch" ADD COLUMN "cancelledBy" TEXT;
ALTER TABLE "DeliveryBatch" ADD COLUMN "cancellationReason" TEXT;

-- AlterTable: Agregar referencia a entrega anulada en ReturnBatch
ALTER TABLE "ReturnBatch" ADD COLUMN "cancelledDeliveryBatchId" INTEGER;

-- CreateIndex: Índice para filtrar entregas anuladas
CREATE INDEX "DeliveryBatch_isCancelled_idx" ON "DeliveryBatch"("isCancelled");

-- CreateIndex: Índice para buscar devoluciones por anulación
CREATE INDEX "ReturnBatch_cancelledDeliveryBatchId_idx" ON "ReturnBatch"("cancelledDeliveryBatchId");

-- AddForeignKey: Relación entre ReturnBatch y DeliveryBatch anulado
ALTER TABLE "ReturnBatch" ADD CONSTRAINT "ReturnBatch_cancelledDeliveryBatchId_fkey" 
  FOREIGN KEY ("cancelledDeliveryBatchId") REFERENCES "DeliveryBatch"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Relación entre DeliveryBatch y usuario que anuló
ALTER TABLE "DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_cancelledBy_fkey" 
  FOREIGN KEY ("cancelledBy") REFERENCES "User"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Unique constraint en cancelledDeliveryBatchId (una devolución por anulación)
CREATE UNIQUE INDEX "ReturnBatch_cancelledDeliveryBatchId_key" ON "ReturnBatch"("cancelledDeliveryBatchId");
