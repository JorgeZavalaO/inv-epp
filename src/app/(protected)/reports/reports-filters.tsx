"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  collaborators: Array<{ id: number; name: string }>;
  locations: string[];
  selected: { year?: number; warehouseId?: number; category?: string; collaboratorId?: number; location?: string };
}

/** Parses a `yyyy-mm-dd` URL value as a local date (react-day-picker works with local days). */
function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Formats a local date as `yyyy-mm-dd` without going through UTC. */
function toDateParam(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(value: string | null): string {
  const date = parseDateParam(value);
  return date ? date.toLocaleDateString("es-PE") : "";
}

export default function ReportsFilters({ year, warehouses, categories, collaborators, locations, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [pickingStart, setPickingStart] = useState(false);

  const fromParam = params.get("from");
  const toParam = params.get("to");

  // Keep the calendar in sync with the URL (back/forward, "Limpiar", year change, etc.).
  useEffect(() => {
    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);
    setRange(from || to ? { from, to } : undefined);
  }, [fromParam, toParam]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  /** Applies every change in a single navigation so no param overwrites another. */
  const applyParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  };

  const updateParam = (key: string, value?: string) => applyParams({ [key]: value });

  const onYearChange = (value: string) => {
    // The year defines the default range, so an explicit range must not override it.
    setRange(undefined);
    setPickingStart(false);
    applyParams({ year: value, from: undefined, to: undefined });
  };

  const onSelectRange = (next: DateRange | undefined) => {
    if (!next?.from) {
      setRange(undefined);
      setPickingStart(false);
      applyParams({ from: undefined, to: undefined });
      return;
    }

    // react-day-picker defaults `to` to the clicked day, so the first click only
    // starts the range; the second one completes it before hitting the server.
    if (!pickingStart) {
      setRange({ from: next.from, to: undefined });
      setPickingStart(true);
      return;
    }

    const from = toDateParam(next.from);
    const to = toDateParam(next.to ?? next.from);
    setRange(next);
    setPickingStart(false);
    applyParams({ from, to });
    setCalendarOpen(false);
  };

  const onCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    setPickingStart(false);
    if (open) {
      const from = parseDateParam(fromParam);
      const to = parseDateParam(toParam);
      setRange(from || to ? { from, to } : undefined);
    }
  };

  const triggerDownload = async (res: Response, name: string) => {
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExportXlsx = async () => {
    const query = params.toString();
    const res = await fetch(`/api/reports/export?${query}`);
    if (!res.ok) return;
    await triggerDownload(res, `reportes-${params.get("year") ?? year}.xlsx`);
  };

  const onClear = () => {
    setRange(undefined);
    setPickingStart(false);
    setCalendarOpen(false);
    applyParams({
      year: undefined,
      warehouseId: undefined,
      category: undefined,
      collaboratorId: undefined,
      location: undefined,
      from: undefined,
      to: undefined,
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-3 items-center py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Año</span>
          <Select value={String(selected.year ?? year)} onValueChange={onYearChange}>
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

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Localidad</span>
          <Select value={selected.location ?? "__all"} onValueChange={(v) => updateParam("location", v === "__all" ? undefined : v)}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas</SelectItem>
              {locations.map(l => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Colaborador</span>
          <Select value={selected.collaboratorId ? String(selected.collaboratorId) : "__all"} onValueChange={(v) => updateParam("collaboratorId", v === "__all" ? undefined : v)}>
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              {collaborators.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 ml-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Rango</Label>
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
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
                      defaultMonth={range?.from}
                      selected={range}
                      onSelect={onSelectRange}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Input readOnly value={formatDateDisplay(fromParam)} placeholder="Desde" className="w-28" title={fromParam ?? undefined} />
              <Input readOnly value={formatDateDisplay(toParam)} placeholder="Hasta" className="w-28" title={toParam ?? undefined} />
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button onClick={onExportXlsx} disabled={isPending} size="sm">
              <Download size={16} /> Excel
            </Button>
          </div>

          <Button variant="ghost" onClick={onClear} size="sm">
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
