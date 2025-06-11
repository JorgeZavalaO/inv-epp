"use client";

import * as React from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface WarehouseOption {
  id: number;
  label: string;
}

export default function ComboboxWarehouse({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: WarehouseOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [panelWidth, setPanelWidth] = React.useState<number>();

  // Ajustar ancho del panel al del trigger
  React.useEffect(() => {
    if (triggerRef.current) {
      setPanelWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // Limpiar query al abrir o cerrar
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((w) => w.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const selectedLabel =
    options.find((w) => w.id === value)?.label || "Selecciona un almacén";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {selectedLabel}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={8}
        align="start"
        className="p-0"
        style={panelWidth ? { width: panelWidth } : undefined}
      >
        <Command>
          <CommandInput
            placeholder="Buscar almacén..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && <CommandEmpty>No hay almacenes</CommandEmpty>}
            {filtered.map((w) => (
              <CommandItem
                key={w.id}
                value={String(w.id)}
                onSelect={() => {
                  onChange(w.id);
                  setOpen(false);
                }}
              >
                {w.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
