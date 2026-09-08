"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import SmartPagination from "@/components/delivery/SmartPagination";
import PageSizeSelector from "@/components/delivery/PageSizeSelector";

import ModalCreateCollaborator from "@/components/collaborators/ModalCreateCollaborator";
import ModalEditCollaborator   from "@/components/collaborators/ModalEditCollaborator";
import ModalDeleteCollaborator from "@/components/collaborators/ModalDeleteCollaborator";
import ModalImportCollaborators from "@/components/collaborators/ModalImportCollaborators"

interface Collaborator {
  id:         number;
  name:       string;
  email:      string | null;
  position:   string | null;
  location:   string | null;
  documentId: string | null;
  createdAt:  string;
  updatedAt:  string;
}

interface Props {
  list: Collaborator[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function CollaboratorsClient({ list, pagination }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState<Collaborator | null>(null);
  const [deleting, setDeleting]   = useState<Collaborator | null>(null);
  const [showImport, setShowImport]  = useState(false);
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

  const refresh = () => router.refresh();

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            Importar
          </Button>
          <Button onClick={() => setShowCreate(true)}>+ Nuevo</Button>
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">DNI/CE</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Posición</th>
              <th className="p-2 text-left">Ubicación</th>
              <th className="p-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b hover:bg-muted/50">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.documentId ?? "-"}</td>
                <td className="p-2">{c.email ?? "-"}</td>
                <td className="p-2">{c.position ?? "-"}</td>
                <td className="p-2">{c.location ?? "-"}</td>
                <td className="p-2 text-center flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(c)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleting(c)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted-foreground">
                  No hay colaboradores aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {list.length === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} collaborators
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

      {showCreate && <ModalCreateCollaborator onClose={() => { setShowCreate(false); refresh(); }} />}
      {showImport && <ModalImportCollaborators onClose={() => { setShowImport(false); refresh(); }} />}
      {editing   && <ModalEditCollaborator   collaborator={editing} onClose={() => { setEditing(null); refresh(); }} />}
      {deleting  && <ModalDeleteCollaborator collaborator={deleting} onClose={() => { setDeleting(null); refresh(); }} />}
    </section>
  );
}
