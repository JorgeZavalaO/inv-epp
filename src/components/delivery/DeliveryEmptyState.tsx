"use client";

import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateNew: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export default function DeliveryEmptyState({ 
  onCreateNew, 
  hasFilters = false, 
  onClearFilters 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Package className="h-8 w-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {hasFilters ? "No se encontraron entregas" : "No hay entregas registradas"}
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-md">
        {hasFilters 
          ? "No hay entregas que coincidan con los filtros aplicados. Intenta ajustar tus criterios de búsqueda."
          : "Comienza creando tu primera entrega de EPP para llevar un control de los elementos entregados."
        }
      </p>
      
      <div className="flex gap-3">
        {hasFilters && onClearFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
        
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva entrega
        </Button>
      </div>
    </div>
  );
}
