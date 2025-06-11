"use client";

import * as React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface UserOption {
  id:    number;
  label: string;
  email: string;
}

export default function ComboboxUser({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: UserOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [panelWidth, setPanelWidth] = React.useState<number>();

  React.useEffect(() => {
    if (triggerRef.current) {
      setPanelWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((u) => u.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const selectedLabel =
    options.find((u) => u.id === value)?.label || "Selecciona un usuario";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className="w-full justify-between"
          role="combobox"
          aria-expanded={open}
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {selectedLabel}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            placeholder="Buscar usuario..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && <CommandEmpty>No hay usuarios</CommandEmpty>}
            {filtered.map((u) => (
              <CommandItem
                key={u.id}
                value={String(u.id)}
                onSelect={() => {
                  onChange(u.id);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span>{u.label}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
