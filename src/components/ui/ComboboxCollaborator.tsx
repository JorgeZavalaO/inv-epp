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

interface CollaboratorOption {
  id: number;
  label: string;
  position?: string;
  location?: string;
}

export default function ComboboxCollaborator({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: CollaboratorOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return options.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.position?.toLowerCase().includes(q) ?? false) ||
        (c.location?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const selectedLabel =
    options.find((c) => c.id === value)?.label || "Selecciona colaborador";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
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
      <PopoverContent sideOffset={8} align="start" className="p-0 w-full">
        <Command>
          <CommandInput
            placeholder="Buscar colaborador..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && <CommandEmpty>No hay colaboradores</CommandEmpty>}
            {filtered.map((c) => (
              <CommandItem
                key={c.id}
                value={String(c.id)}
                onSelect={() => {
                  onChange(c.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <div className="flex flex-col">
                  <span>{c.label}</span>
                  {(c.position || c.location) && (
                    <span className="text-xs text-muted-foreground">
                      {c.position ?? ""}{c.position && c.location ? " • " : ""}
                      {c.location ?? ""}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
