"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
}

interface Props {
  initialData: ReturnBatchRow[];
}

export default function ReturnClient({ initialData }: Props) {
  /* 🚫  no se guarda en estado — así router.refresh() actualiza props */
  const data = initialData;

  const [showNew,   setShowNew]   = useState(false);
  const [deleting,  setDeleting]  = useState<ReturnBatchRow | null>(null);
  const [viewing,   setViewing]   = useState<ReturnBatchRow | null>(null);
  const router = useRouter();

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
