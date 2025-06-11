"use client";

import * as React from "react";
import { useDebounce } from "use-debounce";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Option {
  id: number;
  label: string;
}

export default function ComboboxEpp({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debounced] = useDebounce(query, 300);
  const [options, setOptions] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [panelWidth, setPanelWidth] = React.useState<number>();

  React.useEffect(() => {
    if (triggerRef.current) {
      setPanelWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setOptions([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!debounced) return setOptions([]);
    setLoading(true);
    fetch(`/api/epps?q=${encodeURIComponent(debounced)}`)
      .then((res) => res.json())
      .then((data: { id: number; code: string; name: string }[]) =>
        setOptions(data.map((d) => ({ id: d.id, label: `${d.code} — ${d.name}` })))
      )
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  // Si hay un value y no está en options, cargarlo
  React.useEffect(() => {
    if (value && !options.find((o) => o.id === value)) {
      fetch(`/api/epps/${value}`)
        .then((r) => r.json())
        .then((d: { id: number; code: string; name: string }) =>
          setOptions([{ id: d.id, label: `${d.code} — ${d.name}` }])
        )
        .catch(() => {});
    }
  }, [value, options]);

  const selectedLabel = React.useMemo(() => {
    return options.find((opt) => opt.id === value)?.label || "Selecciona un EPP";
  }, [options, value]);

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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        sideOffset={8}
        align="start"
        style={panelWidth ? { width: panelWidth } : undefined}
      >
        <Command>
          <CommandInput placeholder="Buscar EPP..." value={query} onValueChange={setQuery} />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm">Cargando...</span>
              </div>
            )}
            {!loading && options.length === 0 && <CommandEmpty>No se encontraron resultados</CommandEmpty>}
            {!loading &&
              options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
