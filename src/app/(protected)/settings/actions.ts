"use server"

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { systemConfigSchema } from "@/schemas/system-config-schema";
import { saveSystemConfig} from "@/lib/settings";
import { put } from "@vercel/blob";

export async function updateSystemConfig(_: unknown, formData: FormData) {
  const parsed = systemConfigSchema.safeParse({
    companyName: formData.get("companyName"),
    logo: formData.get("logo") as File | null,
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { companyName, logo } = parsed.data;
  let logoUrl: string | undefined;

  if (logo && logo.size > 0) {
    // 1. obtenemos bytes
    const arrayBuffer = await logo.arrayBuffer();
    const ext   = (logo.name.split(".").pop() || "png").toLowerCase();
    const name  = `company-logo-${Date.now()}.${ext}`;

    if (process.env.VERCEL) {
      // 2-A. PRODUCCIÓN → Vercel Blob
      const { url } = await put(name, arrayBuffer, { access: "public" });
      logoUrl = url;                              // ej. https://blob.vercel-storage.com/…
    } else {
      // 2-B. DESARROLLO LOCAL → escribe en public/uploads
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), Buffer.from(arrayBuffer));
      logoUrl = `/uploads/${name}`;               // accesible por el servidor dev
    }
  }

  await saveSystemConfig({ companyName, ...(logoUrl ? { logoUrl } : {}) });
  revalidatePath("/settings");
  return { ok: true };
}