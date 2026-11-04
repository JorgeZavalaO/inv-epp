import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifyAccessRequest } from "@/lib/notifications";
import { z } from "zod";

const accessRequestSchema = z.object({
  name: z.string().trim().min(2, "El nombre es requerido").max(128),
  email: z.string().trim().email("Correo inválido").max(160),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  company: z.string().trim().max(128).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  // Honeypot: must stay empty. Bots usually fill it.
  website: z.string().max(0).optional().or(z.literal("")),
});

function emptyToUndefined(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

export async function POST(req: Request) {
  try {
    const parsed = accessRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Silently accept honeypot submissions without storing anything.
    if (data.website) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const recentDuplicate = await prisma.accessRequest.findFirst({
      where: {
        email: data.email.toLowerCase(),
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: "PENDING",
      },
      select: { id: true },
    });

    if (recentDuplicate) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    const created = await prisma.accessRequest.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: emptyToUndefined(data.phone),
        company: emptyToUndefined(data.company),
        message: emptyToUndefined(data.message),
      },
    });

    await notifyAccessRequest(created);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating access request:", error);
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud" },
      { status: 500 },
    );
  }
}
