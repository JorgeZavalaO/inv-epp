import prisma from "@/lib/prisma";
import EppTable from "@/components/epp/EppTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function EppsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = searchParams?.q ?? "";
  const epps = await prisma.ePP.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
  });

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de EPPs</h1>
        <Link href="/epps/new">
          <Button variant="default" className="text-sm font-semibold">
            + Nuevo EPP
          </Button>
        </Link>
      </header>

      <form className="mb-4" role="search" aria-label="Buscar EPP">
        <input
          type="text"
          name="q"
          placeholder="Buscar por código, nombre o categoría..."
          defaultValue={q}
          className="w-full rounded-md border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      <EppTable data={epps} />
    </section>
  );
}
