"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import SmartPagination from "@/components/delivery/SmartPagination";
import PageSizeSelector from "@/components/delivery/PageSizeSelector";

import ReturnTable      from "./ReturnTable";
import ModalCreateReturn from "./ModalCreateReturn";
import ModalDeleteReturn from "./ModalDeleteReturn";
import ModalViewReturn   from "./ModalViewReturn";

export interface ReturnBatchRow {
  id:        number;
  code:      string;
  date:      string;
  warehouse: string;
  user:      string;
  count:     number;
  cancelledDeliveryBatchCode?: string | null;
}

interface Props {
  initialData: ReturnBatchRow[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function ReturnClient({ initialData, pagination }: Props) {
  /* 🚫  no se guarda en estado — así router.refresh() actualiza props */
  const data = initialData;

  const [showNew,   setShowNew]   = useState(false);
  const [deleting,  setDeleting]  = useState<ReturnBatchRow | null>(null);
  const [viewing,   setViewing]   = useState<ReturnBatchRow | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSearchParams = useCallback((values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <section className="space-y-6 px-8 py-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Devoluciones por lote</h1>
        <Button onClick={() => setShowNew(true)}>+ Nueva devolución</Button>
      </header>

      <ReturnTable
        data={data}
        onDelete={(row) => setDeleting(row)}
        onView={(row)  => setViewing(row)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {data.length === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} returns
          </div>
          <PageSizeSelector
            pageSize={pagination.limit}
            onPageSizeChange={(size) => updateSearchParams({ limit: String(size), page: "1" })}
            totalCount={pagination.totalCount}
          />
        </div>
        {pagination.totalPages > 1 && (
          <SmartPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => updateSearchParams({ page: String(page) })}
            hasNext={pagination.hasNext}
            hasPrev={pagination.hasPrev}
          />
        )}
      </div>

      {/* ver detalle */}
      {viewing && (
        <ModalViewReturn
          batchId={viewing.id}
          onClose={() => setViewing(null)}
        />
      )}

      {/* crear */}
      {showNew && (
        <ModalCreateReturn
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            router.refresh();        // revalida server component
          }}
        />
      )}

      {/* eliminar */}
      {deleting && (
        <ModalDeleteReturn
          batch={deleting}
          onClose={() => {
            setDeleting(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
