"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function uploadLogo(fd: FormData) {
  const file = fd.get("file") as File | null;
  if (!file) throw new Error("Archivo no seleccionado");

  const uploads = path.join(process.cwd(), "public", "assets");
  await mkdir(uploads, { recursive: true });
  const ext = path.extname(file.name) || ".png";
  const filename = "company-logo" + ext.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploads, filename), buffer);

  const url = `/assets/${filename}`;

  await prisma.setting.upsert({
    where: { key: "logoUrl" },
    update: { value: url },
    create: { key: "logoUrl", value: url },
  });

  revalidatePath("/settings");
  return { url };
}
