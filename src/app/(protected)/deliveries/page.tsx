import { Suspense } from "react";
import DeliveryBatchesClient from "@/components/delivery/DeliveryBatchesClient";
import DeliveryTableSkeleton from "@/components/delivery/DeliveryTableSkeleton";

export const revalidate = 0;

interface SearchParams {
  page?: string;
  limit?: string;
  search?: string;
  collaboratorId?: string;
  warehouseId?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function DeliveriesPage({ searchParams }: Props) {
  const resolved = await searchParams;
  return (
    <Suspense fallback={<DeliveryTableSkeleton />}>
      <DeliveryBatchesClient searchParams={resolved} />
    </Suspense>
  );
}
