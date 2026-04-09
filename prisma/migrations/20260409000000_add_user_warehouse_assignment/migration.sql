-- CreateTable: UserWarehouse (asignación de almacenes a usuarios SUPERVISOR / WAREHOUSE_MANAGER)
CREATE TABLE "UserWarehouse" (
    "id"          TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "warehouseId" INTEGER      NOT NULL,
    "assignedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy"  TEXT,

    CONSTRAINT "UserWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWarehouse_userId_warehouseId_key" ON "UserWarehouse"("userId", "warehouseId");
CREATE INDEX "UserWarehouse_userId_idx" ON "UserWarehouse"("userId");

-- AddForeignKey: UserWarehouse → User
ALTER TABLE "UserWarehouse" ADD CONSTRAINT "UserWarehouse_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserWarehouse → Warehouse
ALTER TABLE "UserWarehouse" ADD CONSTRAINT "UserWarehouse_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
