"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";

interface Props {
  year: number;
  warehouses: Array<{ id: number; name: string }>;
  categories: string[];
  selected: { year?: number; warehouseId?: number; category?: string };
}

export default function ReportsFilters({ year, warehouses, categories, selected }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  const updateParam = (key: string, value?: string) => {
    const url = new URL(window.location.href);
    if (value && value.length) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    startTransition(() => router.push(url.pathname + "?" + url.searchParams.toString()));
  };

  const onExport = async () => {
    const query = params.toString();
    const res = await fetch(`/api/reports/export?${query}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reportes-${params.get("year") ?? year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onClear = () => {
    const url = new URL(window.location.href);
    ["year", "warehouseId", "category", "from", "to"].forEach(k => url.searchParams.delete(k));
    startTransition(() => router.push(url.pathname));
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-3 items-center py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Año</span>
          <Select value={String(selected.year ?? year)} onValueChange={(v) => updateParam("year", v)}>
            <SelectTrigger size="sm" className="min-w-28">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Almacén</span>
          <Select value={selected.warehouseId ? String(selected.warehouseId) : "__all"} onValueChange={(v) => updateParam("warehouseId", v === "__all" ? undefined : v)}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Categoría</span>
          <Select value={selected.category ?? "__all"} onValueChange={(v) => updateParam("category", v === "__all" ? undefined : v)}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 ml-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Rango</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="size-4" />
                    <span className="sr-only">Abrir selector</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" sideOffset={8} align="end">
                  <div className="p-3">
                    <Calendar
                      mode="range"
                      selected={((): DateRange | undefined => {
                        const f = params.get('from');
                        const t = params.get('to');
                        if (!f && !t) return undefined;
                        return { from: f ? new Date(f) : undefined, to: t ? new Date(t) : undefined };
                      })()}
                      onSelect={(range: DateRange | undefined) => {
                        if (!range) return;
                        updateParam('from', range.from ? range.from.toISOString().slice(0,10) : undefined);
                        updateParam('to', range.to ? range.to.toISOString().slice(0,10) : undefined);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Input readOnly value={params.get('from') ?? ''} placeholder="Desde" className="w-28" />
              <Input readOnly value={params.get('to') ?? ''} placeholder="Hasta" className="w-28" />
            </div>
          </div>

          <Button onClick={onExport} disabled={isPending} className="ml-auto" size="sm">
            <Download size={16} /> Exportar Excel
          </Button>

          <Button variant="ghost" onClick={onClear} size="sm">
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
