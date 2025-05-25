"use client";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function LowStockTable({
  data,
}: {
  data: { id: number; code: string; name: string; stock: number; minStock: number }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-3 py-2 text-left">Código</th>
            <th className="px-3 py-2 text-left">EPP</th>
            <th className="px-3 py-2 text-right">Stock</th>
          </tr>
        </thead>
        <tbody>
          {data.map((epp) => (
            <tr key={epp.id} className="border-b hover:bg-muted/50">
              <td className="px-3 py-2">
                <Link href={`/epps/${epp.id}`} className="underline">
                  {epp.code}
                </Link>
              </td>
              <td className="px-3 py-2">{epp.name}</td>
              <td className="px-3 py-2 text-right">
                <Badge variant={epp.stock === 0 ? "destructive" : "secondary"}>
                  {epp.stock} / {epp.minStock}
                </Badge>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-muted-foreground">
                Sin alertas 🎉
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
