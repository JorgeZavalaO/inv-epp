"use server"

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { systemConfigSchema } from "@/schemas/system-config-schema";
import { saveSystemConfig} from "@/lib/settings";

export async function updateSystemConfig(prevState: unknown, formData: FormData) {
  const parsed = systemConfigSchema.safeParse({
    companyName: formData.get("companyName"),
    logo: formData.get("logo") as File | null,
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const {companyName, logo} = parsed.data;
  let logoUrl: string | undefined;

  if (logo && logo.size > 0) {
    const bytes = Buffer.from(await logo.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const ext = logo.name.split(".").pop() ?? "png";
    const filename = `company-logo.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, bytes);
    logoUrl = `/uploads/${filename}`;
  }

  await saveSystemConfig({ companyName, ...(logoUrl ? { logoUrl } : {}) });
  revalidatePath("/settings");
  return { ok: true };



}