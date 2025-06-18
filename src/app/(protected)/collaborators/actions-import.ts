"use server";

import Papa        from "papaparse";
import prisma      from "@/lib/prisma";
import { z }       from "zod";
import {
  collaboratorCsvRowSchema,
  CollaboratorCsvRow,
} from "@/schemas/collaborator-import-schema";
import { revalidatePath } from "next/cache";

export async function importCollaboratorsCsv(fd: FormData) {
  const file = fd.get("file") as File | null;
  if (!file) throw new Error("Archivo no encontrado");

  /* 1 · Parse CSV ---------------------------------------------------------- */
  const txt = await file.text();
  const { data, errors } = Papa.parse<string[]>(txt.trim(), {
    delimiter: ";",
    skipEmptyLines: true,
  });
  if (errors.length) throw new Error("CSV malformado");

  const [header, ...rows] = data as string[][];
  const idx = {
    name:     header.indexOf("name*"),
    email:    header.indexOf("email"),
    position: header.indexOf("position"),
    location: header.indexOf("location"),
  };
  if (idx.name === -1)
    throw new Error('La columna "name*" es obligatoria en la cabecera');

  /* 2 · Map + validar ------------------------------------------------------ */
  const parsed: CollaboratorCsvRow[] = rows.map((r, i) => {
    const obj = {
      name:     r[idx.name]?.trim()     ?? "",
      email:    r[idx.email]?.trim()    ?? "",
      position: r[idx.position]?.trim() ?? "",
      location: r[idx.location]?.trim() ?? "",
    };
    try {
      return collaboratorCsvRowSchema.parse(obj);
    } catch (err) {
      const msg =
        err instanceof z.ZodError ? err.errors[0].message : "fila inválida";
      throw new Error(`Fila ${i + 2}: ${msg}`);
    }
  });

  /* 3 · Duplicados dentro del archivo (por email) -------------------------- */
  const emails = parsed.map((c) => c.email).filter(Boolean) as string[];
  const dup = emails.find((e, i) => emails.indexOf(e) !== i);
  if (dup) throw new Error(`Email duplicado en el archivo: ${dup}`);

  /* 4 · Crear / actualizar ------------------------------------------------- */
  await prisma.$transaction(async (tx) => {
    for (const row of parsed) {
      const email = row.email || null;

      let existing = null;
      if (email) {
        existing = await tx.collaborator.findFirst({ where: { email } });
      }

      if (existing) {
        // Update si el email ya existe
        await tx.collaborator.update({
          where: { id: existing.id },
          data: {
            name:     row.name,
            position: row.position || null,
            location: row.location || null,
          },
        });
      } else {
        // Create si no existe (o si no hay email)
        await tx.collaborator.create({
          data: {
            name:     row.name,
            email:    email, // puede ser null
            position: row.position || null,
            location: row.location || null,
          },
        });
      }
    }
  });

  /* 5 · Refresh lista ------------------------------------------------------ */
  revalidatePath("/collaborators");
}