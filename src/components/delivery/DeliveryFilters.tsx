"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/lib/useDebounce";

interface FilterOption {
  id: number;
  name: string;
}

interface FilterProps {
  search: string;
  collaboratorId: string;
  warehouseId: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  collaborators: FilterOption[];
  warehouses: FilterOption[];
  locations?: FilterOption[];
  onSearchChange: (value: string) => void;
  onCollaboratorChange: (value: string) => void;
  onWarehouseChange: (value: string) => void;
  onLocationChange?: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function DeliveryFilters({
  search,
  collaboratorId,
  warehouseId,
  location,
  dateFrom,
  dateTo,
  collaborators,
  warehouses,
  locations = [],
  onSearchChange,
  onCollaboratorChange,
  onWarehouseChange,
  onLocationChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: FilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  
  // Debounce para la búsqueda
  const debouncedSearch = useDebounce(searchInput, 500);
  
  // Efecto para aplicar la búsqueda con debounce
  useEffect(() => {
    if (debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, search, onSearchChange]);
  
  // Sincronizar input cuando cambie el prop search (por ejemplo, al limpiar filtros)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const activeFiltersCount = [
    collaboratorId,
    warehouseId,
  location,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0 || search;

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda principal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por código, colaborador u operador..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 rounded-full text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {/* Filtro por colaborador */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Colaborador</label>
                  <Select value={collaboratorId || "0"} onValueChange={(v) => onCollaboratorChange(v === "0" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los colaboradores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todos los colaboradores</SelectItem>
                      {collaborators.map((collab) => (
                        <SelectItem key={collab.id} value={collab.id.toString()}>
                          {collab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por almacén */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Almacén</label>
                  <Select value={warehouseId || "0"} onValueChange={(v) => onWarehouseChange(v === "0" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los almacenes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todos los almacenes</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por sede (location) */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Sede</label>
                  <Select value={location || "0"} onValueChange={(v) => onLocationChange?.(v === "0" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las sedes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todas las sedes</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro por fecha */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Desde</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Hasta</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => onDateToChange(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Chips de filtros activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <Badge variant="secondary" className="text-xs">
              Búsqueda: &ldquo;{search}&rdquo;
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onSearchChange("")}
              />
            </Badge>
          )}
          
          {collaboratorId && (
            <Badge variant="secondary" className="text-xs">
              Colaborador: {collaborators.find(c => c.id.toString() === collaboratorId)?.name}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onCollaboratorChange("")}
              />
            </Badge>
          )}
          
          {warehouseId && (
            <Badge variant="secondary" className="text-xs">
              Almacén: {warehouses.find(w => w.id.toString() === warehouseId)?.name}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onWarehouseChange("")}
              />
            </Badge>
          )}
          
          {dateFrom && (
            <Badge variant="secondary" className="text-xs">
              Desde: {new Date(dateFrom).toLocaleDateString()}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onDateFromChange("")}
              />
            </Badge>
          )}
          
          {dateTo && (
            <Badge variant="secondary" className="text-xs">
              Hasta: {new Date(dateTo).toLocaleDateString()}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onDateToChange("")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
