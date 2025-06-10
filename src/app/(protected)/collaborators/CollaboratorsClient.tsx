"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
//import { toast } from "sonner";

import ModalCreateCollaborator from "@/components/collaborators/ModalCreateCollaborator";
import ModalEditCollaborator   from "@/components/collaborators/ModalEditCollaborator";
import ModalDeleteCollaborator from "@/components/collaborators/ModalDeleteCollaborator";

interface Collaborator {
  id:        number;
  name:      string;
  email:     string | null;
  position:  string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  list: Collaborator[];
}

export default function CollaboratorsClient({ list }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState<Collaborator | null>(null);
  const [deleting, setDeleting]   = useState<Collaborator | null>(null);
  //const [isPending, start]        = useTransition();

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <Button onClick={() => setShowCreate(true)}>+ Nuevo</Button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Posición</th>
              <th className="p-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b hover:bg-muted/50">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.email ?? "-"}</td>
                <td className="p-2">{c.position ?? "-"}</td>
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
                <td colSpan={4} className="text-center py-4 text-muted-foreground">
                  No hay colaboradores aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <ModalCreateCollaborator onClose={() => setShowCreate(false)} />}
      {editing   && <ModalEditCollaborator   collaborator={editing} onClose={() => setEditing(null)} />}
      {deleting  && <ModalDeleteCollaborator collaborator={deleting} onClose={() => setDeleting(null)} />}
    </section>
  );
}
