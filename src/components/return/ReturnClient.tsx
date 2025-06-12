"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ReturnTable from "./ReturnTable";
import ModalCreateReturn from "./ModalCreateReturn";
import ModalDeleteReturn from "./ModalDeleteReturn";

export interface ReturnRow {
  id:         number;
  date:       string;
  eppCode:    string;
  eppName:    string;
  employee:   string;
  quantity:   number;
  condition:  "REUSABLE" | "DISCARDED";
  operator:   string;
}

interface Props {
  initialData: ReturnRow[];
}

export default function ReturnClient({ initialData }: Props) {
  const [data]             = useState<ReturnRow[]>(initialData);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting]     = useState<ReturnRow | null>(null);
  const router                      = useRouter();

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Devoluciones</h1>
        <Button onClick={() => setShowCreate(true)}>+ Nueva Devolución</Button>
      </header>

      <div className="overflow-x-auto bg-white rounded shadow">
        <ReturnTable data={data} onDelete={(row) => setDeleting(row)} />
      </div>

      {showCreate && (
        <ModalCreateReturn
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {deleting && (
        <ModalDeleteReturn
          ret={deleting}
          onClose={() => {
            setDeleting(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
