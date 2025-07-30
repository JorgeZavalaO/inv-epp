"use client";
import { useEffect, useState, useActionState } from "react";
import { updateSystemConfig } from "@/app/(protected)/settings/actions";
import Image from "next/image";
import { CheckCircle, AlertCircle, Upload, X, Building2, Loader2 } from "lucide-react";

type Props = {
  initialName?: string | null;
  initialLogo?: string | null;
};

export default function SettingsForm({ initialName, initialLogo }: Props) {
  const [state, formAction, isPending] = useActionState(updateSystemConfig, { ok: true });
  const [preview, setPreview] = useState<string | null>(initialLogo ?? null);
  const [dragActive, setDragActive] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  useEffect(() => {
    if (state.ok && !isPending) {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    }
  }, [state.ok, isPending]);

  const handleFileChange = (file: File | null) => {
    if (file) {
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
    } else {
      setPreview(initialLogo ?? null);
      setFileName("");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileChange(file);
        // Simulamos que el input file recibió el archivo
        const dt = new DataTransfer();
        dt.items.add(file);
        const fileInput = document.getElementById('logo') as HTMLInputElement;
        if (fileInput) fileInput.files = dt.files;
      }
    }
  };

  const removeImage = () => {
    setPreview(null);
    setFileName("");
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return (
    <>
      {/* Toast de éxito */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Configuración actualizada
              </p>
              <p className="text-xs text-green-600">
                Los cambios se han guardado correctamente
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Información de la empresa
            </h2>
            <p className="text-sm text-gray-500">
              Configura el nombre y logo que aparecerán en toda la aplicación
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-8">
          {/* Campo de nombre de empresa */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="companyName">
              Nombre de la empresa
            </label>
            <div className="relative">
              <input
                type="text"
                name="companyName"
                id="companyName"
                defaultValue={initialName ?? ""}
                className={`w-full rounded-lg border px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  state.errors?.companyName 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Ej. Dimahisac S.A.C."
                disabled={isPending}
              />
              {state.errors?.companyName && (
                <AlertCircle className="absolute right-3 top-3.5 h-5 w-5 text-red-500" />
              )}
            </div>
            {state.errors?.companyName && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {state.errors.companyName}
              </div>
            )}
          </div>

          {/* Campo de logo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Logo de la empresa
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Sube una imagen PNG o JPG de máximo 1 MB. Recomendamos 400x150px para mejores resultados.
            </p>
            
            {/* Área de drag & drop */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : state.errors?.logo
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                name="logo"
                id="logo"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => handleFileChange(e.target.files?.[0] || null)}
                disabled={isPending}
              />
              
              {!preview ? (
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                  <div className="text-sm">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Haz clic para subir
                    </span>
                    <span className="text-gray-500"> o arrastra y suelta</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PNG o JPG hasta 1MB</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="relative group">
                      <Image
                        src={preview}
                        alt="Vista previa del logo"
                        width={200}
                        height={80}
                        className="object-contain border border-gray-200 rounded-lg bg-white shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {fileName && (
                    <p className="text-sm text-gray-600 text-center font-medium">
                      {fileName}
                    </p>
                  )}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById('logo')?.click()}
                      className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Cambiar imagen
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {state.errors?.logo && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {state.errors.logo}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Los cambios se guardarán automáticamente
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}