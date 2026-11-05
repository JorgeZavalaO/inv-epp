"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SmartPagination from "@/components/delivery/SmartPagination";
import PageSizeSelector from "@/components/delivery/PageSizeSelector";
import { useDebounce } from "@/lib/useDebounce";
import type { CollaboratorStatusValue } from "@/schemas/collaborator-schema";

import ModalCreateCollaborator from "@/components/collaborators/ModalCreateCollaborator";
import ModalEditCollaborator   from "@/components/collaborators/ModalEditCollaborator";
import ModalDeleteCollaborator from "@/components/collaborators/ModalDeleteCollaborator";
import ModalImportCollaborators from "@/components/collaborators/ModalImportCollaborators"
import ModalChangeCollaboratorStatus from "@/components/collaborators/ModalChangeCollaboratorStatus";

interface Collaborator {
  id:         number;
  name:       string;
  email:      string | null;
  position:   string | null;
  location:   string | null;
  documentId: string | null;
  status:     CollaboratorStatusValue;
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
  search: string;
  statusFilter: CollaboratorStatusValue | "";
}

export default function CollaboratorsClient({ list, pagination, search, statusFilter }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState<Collaborator | null>(null);
  const [deleting, setDeleting]   = useState<Collaborator | null>(null);
  const [changingStatus, setChangingStatus] = useState<Collaborator | null>(null);
  const [showImport, setShowImport]  = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debouncedSearch = useDebounce(searchInput, 400);

  const updateSearchParams = useCallback((values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Aplicar la búsqueda con debounce
  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === search) return;
    updateSearchParams({ q: next, page: "1" });
  }, [debouncedSearch, search, updateSearchParams]);

  // Sincronizar el input cuando cambia la URL (limpiar filtros, atrás/adelante)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const hasFilters = Boolean(search) || Boolean(statusFilter);

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

      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, sede o N° de documento..."
            className="pl-10 pr-9"
            aria-label="Buscar colaboradores"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select
          value={statusFilter || "ALL"}
          onValueChange={(value) =>
            updateSearchParams({
              status: value === "ALL" ? "" : value,
              page: "1",
            })
          }
        >
          <SelectTrigger className="w-full md:w-52" aria-label="Filtrar por estado">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="INACTIVE">Dados de baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">DNI/CE</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Posición</th>
              <th className="p-2 text-left">Sede</th>
              <th className="p-2 text-left">Estado</th>
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
                <td className="p-2">
                  <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>
                    {c.status === "ACTIVE" ? "Activo" : "Dado de baja"}
                  </Badge>
                </td>
                <td className="p-2 text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(c)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant={c.status === "ACTIVE" ? "outline" : "default"}
                      onClick={() => setChangingStatus(c)}
                    >
                      {c.status === "ACTIVE" ? "Dar de baja" : "Reactivar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleting(c)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted-foreground">
                  {hasFilters
                    ? "No hay colaboradores que coincidan con la búsqueda"
                    : "No hay colaboradores aún"}
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
      {changingStatus && (
        <ModalChangeCollaboratorStatus
          collaborator={changingStatus}
          onClose={() => { setChangingStatus(null); refresh(); }}
        />
      )}
    </section>
  );
}
