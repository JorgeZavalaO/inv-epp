"use client";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryBatchXlsx } from "@/lib/client-excel/useDeliveryBatchXlsx";

export default function ExportExcelButton({ batchId }: { batchId: number }) {
  const handleExport = useDeliveryBatchXlsx(batchId);

  return (
    <Button onClick={handleExport} variant="secondary">
      <FileSpreadsheet className="w-4 h-4 mr-2" />
      Exportar Excel
    </Button>
  );
}
