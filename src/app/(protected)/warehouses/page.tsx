import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

export const revalidate = 0;

export default async function WarehousesPage() {
  const list = await prisma.warehouse.findMany({
    include: { _count: { select: { stocks: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <h1 className="text-3xl font-bold">Almacenes</h1>

      {/* Formulario servidor para crear nuevo almacén */}
      <form
        action={async (fd: FormData) => {
          "use server";
          const name = fd.get("name")?.toString() ?? "";
          const location = fd.get("location")?.toString() || undefined;
          await prisma.warehouse.create({ data: { name, location } });
          revalidatePath("/warehouses");
        }}
        className="flex gap-2"
      >
        <input
          name="name"
          placeholder="Nombre del almacén…"
          className="border px-3 py-2 rounded w-64"
        />
        <input
          name="location"
          placeholder="Ubicación (opcional)…"
          className="border px-3 py-2 rounded w-64"
        />
        <Button type="submit">Crear</Button>
      </form>

      <table className="w-full text-sm bg-white rounded shadow">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">Ubicación</th>
            <th className="p-2 text-center">Locales con stock</th>
          </tr>
        </thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.id} className="border-b hover:bg-muted/50">
              <td className="p-2">{w.name}</td>
              <td className="p-2">{w.location ?? "-"}</td>
              <td className="p-2 text-center">{w._count.stocks}</td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-muted-foreground">
                No hay almacenes aún
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
