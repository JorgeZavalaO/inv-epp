"use server"

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { systemConfigSchema } from "@/schemas/system-config-schema";
import { saveSystemConfig} from "@/lib/settings";
import { requirePermission } from "@/lib/auth-utils";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { WarehouseViewMode } from "@prisma/client";
import { z } from "zod";
import { getWarehouseScope } from "@/lib/warehouse-scope";

export async function updateSystemConfig(
  _: unknown,
  formData: FormData
): Promise<{ ok: boolean; errors?: { id?: string[]; companyName?: string[]; logo?: string[] } }> {
  try {
    await requirePermission("settings_update");
  } catch {
    return { ok: false, errors: { companyName: ["No autorizado"], logo: [] } };
  }
  const parsed = systemConfigSchema.safeParse({
    companyName: formData.get("companyName"),
    logo: formData.get("logo") as File | null,
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors as { id?: string[]; companyName?: string[]; logo?: string[] } };
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
      logoUrl = url;                              
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

const warehousePreferencesSchema = z.object({
  viewMode: z.nativeEnum(WarehouseViewMode),
  primaryWarehouseId: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
});

export type WarehousePreferencesState = {
  ok: boolean;
  error?: string;
};

export async function updateMyWarehousePreferences(
  _: unknown,
  formData: FormData,
): Promise<WarehousePreferencesState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No autenticado" };
  }

  const parsed = warehousePreferencesSchema.safeParse({
    viewMode: formData.get("viewMode"),
    primaryWarehouseId: formData.get("primaryWarehouseId"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const { viewMode } = parsed.data;
  const requestedPrimaryId = parsed.data.primaryWarehouseId;
  const isAdmin = session.user.role === "ADMIN";

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { primaryWarehouseId: true },
  });

  if (!current) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  // Only ADMIN may change the primary warehouse from their own settings.
  let primaryWarehouseId = current.primaryWarehouseId;
  if (isAdmin && requestedPrimaryId !== null) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: requestedPrimaryId },
      select: { id: true },
    });
    if (!warehouse) {
      return { ok: false, error: "El almacén seleccionado no existe" };
    }
    primaryWarehouseId = requestedPrimaryId;
  }

  if (viewMode === WarehouseViewMode.PRIMARY) {
    const scope = await getWarehouseScope();
    const primaryIsAllowed =
      primaryWarehouseId !== null &&
      (scope.allowedIds === null || scope.allowedIds.includes(primaryWarehouseId));
    if (!primaryIsAllowed) {
      return {
        ok: false,
        error: "Necesitas un almacén principal asignado para usar esta vista",
      };
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { warehouseViewMode: viewMode, primaryWarehouseId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}