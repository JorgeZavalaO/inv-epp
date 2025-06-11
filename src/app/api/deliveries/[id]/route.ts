import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const record = await prisma.delivery.findUnique({
      where: { id: Number(params.id) },
      include: {
        batch: {
          select: {
            id: true,
            code: true,
            warehouse: { select: { name: true } },
          },
        },
        epp: { select: { code: true, name: true } },
      },
    });
    return record
      ? NextResponse.json(record)
      : NextResponse.json({ error: "No encontrado" }, { status: 404 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const updated = await prisma.delivery.update({
      where: { id: Number(params.id) },
      data,
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.delivery.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
