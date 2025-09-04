"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalCount: number;
}

const PAGE_SIZE_OPTIONS = [
  { value: 5, label: "5 por página" },
  { value: 10, label: "10 por página" },
  { value: 20, label: "20 por página" },
  { value: 50, label: "50 por página" },
  { value: 100, label: "100 por página" },
];

export default function PageSizeSelector({ 
  pageSize, 
  onPageSizeChange, 
  totalCount 
}: PageSizeSelectorProps) {
  // Filtrar opciones que son mayores al total de elementos
  const availableOptions = PAGE_SIZE_OPTIONS.filter(option => 
    option.value <= totalCount || option.value <= 20
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Mostrar</span>
      <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
        <SelectTrigger className="w-auto">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
