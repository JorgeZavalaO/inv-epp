import prisma from "@/lib/prisma";

export type SystemConfig = {
    id: number;
    companyName?: string | null;
    logoUrl?: string | null;
}

// Devuelve la configuracion o un objeto vacio si aún no existe

export async function getSystemConfig(): Promise<SystemConfig> {
    const cfg = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    return cfg ?? { id: 1 };
}

// Inserta o actualiza la condiguración del sistema
export async function saveSystemConfig(data: Partial<SystemConfig>) {
    await prisma.systemConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
}
