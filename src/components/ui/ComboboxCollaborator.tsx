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
  id:       number;
  label:    string;
  position?: string;
  location?: string;
  documentId?: string | null;
  status?:   "ACTIVE" | "INACTIVE";
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
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [panelWidth, setPanelWidth] = React.useState<number>();

  React.useEffect(() => {
    if (triggerRef.current) setPanelWidth(triggerRef.current.offsetWidth);
  }, [open]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      (c.position?.toLowerCase().includes(q) ?? false) ||
      (c.location?.toLowerCase().includes(q) ?? false) ||
      (c.documentId?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const selected = options.find((c) => c.id === value);
  const selectedLabel = selected
    ? `${selected.label}${selected.status === "INACTIVE" ? " (Dado de baja)" : ""}`
    : "Selecciona colaborador";

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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              d="M19 9l-7 7-7-7" />
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
            placeholder="Buscar colaborador..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && <CommandEmpty>No hay colaboradores</CommandEmpty>}
            {filtered.map((c) => (
              <CommandItem
                key={c.id}
                // ahora filtramos por etiqueta, no por id
                value={c.label}
                disabled={c.status === "INACTIVE"}
                className={c.status === "INACTIVE" ? "opacity-60" : undefined}
                onSelect={() => {
                  if (c.status === "INACTIVE") return;
                  onChange(c.id);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="flex items-center gap-2">
                    {c.label}
                    {c.status === "INACTIVE" && (
                      <span className="rounded border border-muted-foreground/30 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        Dado de baja
                      </span>
                    )}
                  </span>
                  {(c.position || c.location || c.documentId) && (
                    <span className="text-xs text-muted-foreground">
                      {[c.documentId, c.position, c.location].filter(Boolean).join(" • ")}
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
