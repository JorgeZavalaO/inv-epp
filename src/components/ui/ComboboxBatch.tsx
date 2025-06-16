"use client";

import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface BatchOption {
  id:   number;
  code: string;
  date: string; // ISO
}

export default function ComboboxBatch({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: BatchOption[];
}) {
  const [open, setOpen]   = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef        = React.useRef<HTMLButtonElement>(null);
  const [panelW, setW]    = React.useState<number>();

  React.useEffect(() => {
    if (triggerRef.current) setW(triggerRef.current.offsetWidth);
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? options.filter(
          (b) =>
            b.code.toLowerCase().includes(q) ||
            new Date(b.date).toLocaleDateString().includes(q),
        )
      : options;
  }, [options, query]);

  const label =
    options.find((o) => o.id === value)?.code ?? "Selecciona pedido";

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
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="p-0"
        style={panelW ? { width: panelW } : undefined}
      >
        <Command>
          <CommandInput
            placeholder="Buscar pedido…"
            value={query}
            onValueChange={setQuery}
            className="px-3 py-2"
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && <CommandEmpty>No hay pedidos</CommandEmpty>}

            {filtered.map((b) => (
              <CommandItem
                key={b.id}
                onSelect={() => {
                  onChange(b.id);
                  setOpen(false);
                }}
                className="flex justify-between px-3 py-2 cursor-pointer"
              >
                <span>{b.code}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(b.date).toLocaleDateString()}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
