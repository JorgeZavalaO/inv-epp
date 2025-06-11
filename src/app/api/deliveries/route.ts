import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const list = await prisma.delivery.findMany({
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
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const created = await prisma.delivery.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
