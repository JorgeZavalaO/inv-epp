"use client";

import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Papa          from "papaparse";
import { useDropzone } from "react-dropzone";
import { Download, FileText, X, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { importCollaboratorsCsv } from "@/app/(protected)/collaborators/actions-import";

export default function ModalImportCollaborators({ onClose }: { onClose(): void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    Papa.parse<string[]>(f, {
      delimiter: ";",
      preview: 6,
      complete: (res) => setPreview(res.data as string[][]),
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    onDrop,
  });

  const submit = async () => {
    if (!file) return;
    setPending(true);
    setProgress(30);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await importCollaboratorsCsv(fd);
      setProgress(100);
      toast.success("Importación completada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error importando");
      setProgress(0);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} /> Importar colaboradores
          </DialogTitle>
        </DialogHeader>

        <a
          href="/api/templates/collaborators-import"
          className="inline-flex items-center gap-1 text-sm text-primary underline"
          download
        >
          <Download size={16} /> Descargar plantilla
        </a>

        {/* dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-sm cursor-pointer transition
          ${isDragActive ? "border-primary bg-primary/10" : "border-muted"}`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center gap-2">
              <FileText size={18} />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview([]);
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <p>
              {isDragActive
                ? "Suelta tu archivo aquí"
                : "Arrastra tu CSV aquí o haz clic para seleccionarlo"}
            </p>
          )}
        </div>

        {/* preview */}
        {preview.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1">
              Vista previa (primeras {preview.length} filas)
            </p>
            <div className="border rounded max-h-56 overflow-x-auto overflow-y-auto">
              <table className="w-max text-xs">
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    {preview[0].map((h, i) => (
                      <th key={i} className="px-2 py-1 border-b text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, r) => (
                    <tr key={r} className="border-b last:border-none">
                      {row.map((cell, c) => (
                        <td key={c} className="px-2 py-1 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pending && <Progress value={progress} className="h-2 mt-4" />}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!file || pending}>
            {pending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
