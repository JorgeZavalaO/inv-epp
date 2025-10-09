"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Award } from "lucide-react";

interface TopDeliveredItem {
  name: string;
  qty: number;
}

interface TopDeliveredListProps {
  data: TopDeliveredItem[];
}

export default function TopDeliveredList({ data }: TopDeliveredListProps) {
  // Calcular total de entregas
  const totalDelivered = data.reduce((sum, item) => sum + item.qty, 0);

  // Función para obtener el color según la posición
  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case 1:
        return "bg-gray-100 text-gray-700 border-gray-300";
      case 2:
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  // Función para obtener el icono según la posición
  const getRankIcon = (index: number) => {
    if (index < 3) {
      return <Award className="w-4 h-4" />;
    }
    return <Package className="w-4 h-4" />;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          EPPs Más Entregados
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Top 5 de equipos más solicitados (últimos 30 días)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay datos de entregas</p>
          </div>
        ) : (
          <>
            {data.slice(0, 5).map((item, index) => {
              // Calcular porcentaje respecto al total
              const percentage = totalDelivered > 0 
                ? ((item.qty / totalDelivered) * 100).toFixed(1)
                : "0";

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                >
                  {/* Posición/Ranking */}
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${getRankColor(index)}`}>
                    {index < 3 ? (
                      getRankIcon(index)
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Información del EPP */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {item.qty} unidades
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {percentage}% del total
                      </span>
                    </div>
                    
                    {/* Barra de progreso visual */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Cantidad destacada */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {item.qty}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Resumen total */}
            <div className="pt-3 mt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total entregado</span>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {totalDelivered.toLocaleString()} unidades
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
