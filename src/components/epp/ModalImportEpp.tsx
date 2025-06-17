"use client";

import { useState, useCallback } from "react";
import { toast }     from "sonner";
import Papa          from "papaparse";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button }        from "@/components/ui/button";
import { Progress }      from "@/components/ui/progress";
import { Badge }         from "@/components/ui/badge";
import { 
  Import, 
  Download, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Eye,
  FileSpreadsheet
} from "lucide-react";
import { importEppsCsv } from "@/app/(protected)/epps/actions-import";

export default function ModalImportEpp({ onClose }: { onClose(): void }) {
  /* ───────── State ───────── */
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ───────── Dropzone ───────── */
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

  /* ───────── Import handler ───────── */
  const submit = async () => {
    if (!file) return;
    setPending(true);
    setProgress(30);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await importEppsCsv(fd);
      setProgress(100);
      toast.success("Importación completada exitosamente");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error durante la importación");
      setProgress(0);
    } finally {
      setPending(false);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ──── Header con gradiente ──── */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Import size={24} className="text-primary" />
              </div>
              <div>
                <div className="font-semibold">Importar EPPs desde CSV</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  Carga masiva de equipos de protección personal
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-6 space-y-6">
          {/* ──── Pasos del proceso ──── */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                !file ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'
              }`}>
                {!file ? '1' : <CheckCircle2 size={14} />}
              </div>
              <span className="text-sm font-medium">Seleccionar archivo</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                !preview.length ? 'bg-muted text-muted-foreground' : 
                preview.length > 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {preview.length > 1 ? <Eye size={14} /> : '2'}
              </div>
              <span className="text-sm font-medium">Vista previa</span>
            </div>
            <div className="w-8 h-px bg-border"></div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                <Upload size={14} />
              </div>
              <span className="text-sm font-medium">Importar</span>
            </div>
          </div>

          {/* ──── Descarga de plantilla ──── */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-500/10 rounded-md">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Antes de comenzar
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Descarga la plantilla oficial para asegurar el formato correcto de tus datos.
                </p>
                <a
                  href="/api/templates/epp-import"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  download
                >
                  <Download size={16} />
                  Descargar plantilla CSV
                </a>
              </div>
            </div>
          </div>

          {/* ──── Zona de carga ──── */}
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer group ${
                isDragActive 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : file
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input {...getInputProps()} />
              
              {file ? (
                /* ── Archivo seleccionado ── */
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <FileSpreadsheet size={32} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{file.name}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 size={12} className="mr-1" />
                        Listo
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • CSV con separador de punto y coma
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                /* ── Estado inicial ── */
                <div className="text-center">
                  <div className={`mx-auto mb-4 p-4 rounded-full transition-colors ${
                    isDragActive ? "bg-primary/10" : "bg-muted/50 group-hover:bg-primary/10"
                  }`}>
                    <Upload size={40} className={`transition-colors ${
                      isDragActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    }`} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {isDragActive ? "Suelta el archivo aquí" : "Arrastra tu archivo CSV"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      o <span className="text-primary font-medium">haz clic para seleccionar</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Archivos CSV con separador de punto y coma (;)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ──── Vista previa mejorada ──── */}
          {preview.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-primary" />
                  <h3 className="font-semibold">Vista previa de datos</h3>
                </div>
                <Badge variant="outline" className="bg-background">
                  {Math.max(0, preview.length - 1)} filas de datos
                </Badge>
              </div>

              <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden">
                <div className="h-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 border-b">
                      <tr>
                        {preview[0]?.map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap min-w-[150px] border-r last:border-r-0"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className="hover:bg-muted/40 transition-colors border-b last:border-b-0"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 border-r last:border-r-0 min-w-[150px] max-w-[300px]"
                              title={cell && cell.length > 30 ? cell : undefined}
                            >
                              <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                                {cell ? (
                                  <span className="text-foreground">{cell}</span>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">vacío</span>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──── Barra de progreso mejorada ──── */}
          {pending && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="animate-spin h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Importando datos...</span>
                    <span className="text-sm font-medium text-primary">{progress}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Procesando y validando la información de EPPs
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2 bg-primary/10" />
            </div>
          )}
        </div>

        {/* ──── Footer con acciones ──── */}
        <div className="border-t bg-muted/20 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {file && preview.length > 1 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  Archivo validado y listo para importar
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={pending}
                className="min-w-[100px]"
              >
                Cancelar
              </Button>
              <Button 
                onClick={submit} 
                disabled={!file || pending || preview.length <= 1}
                className="min-w-[120px] bg-primary hover:bg-primary/90"
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Import className="mr-2 h-4 w-4" />
                    Importar EPPs
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}