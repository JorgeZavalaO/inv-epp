"use client";

import Image from "next/image";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { uploadLogo } from "./actions";
import { toast } from "sonner";

export default function SettingsClient({ current }: { current: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(current);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".png", ".jpg", ".jpeg"] },
    maxFiles: 1,
    onDrop: (files) => {
      const f = files[0];
      if (f) {
        setFile(f);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      }
    },
  });

  const submit = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await uploadLogo(fd);
      toast.success("Logo actualizado");
      setPreview(res.url);
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <h1 className="text-3xl font-bold">Configuración</h1>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">Logo actual</p>
        <Image src={preview} alt="logo" width={180} height={60} className="border rounded bg-white" />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${isDragActive ? "border-primary bg-primary/10" : "border-muted"}`}
      >
        <input {...getInputProps()} />
        {file ? <p>{file.name}</p> : <p>{isDragActive ? "Suelta la imagen" : "Arrastra una imagen o haz clic"}</p>}
      </div>

      <Button onClick={submit} disabled={!file}>Guardar</Button>
    </section>
  );
}
