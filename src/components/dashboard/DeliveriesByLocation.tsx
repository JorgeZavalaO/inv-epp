"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp } from "lucide-react";

interface LocationDelivery {
  location: string;
  count: number;
}

interface DeliveriesByLocationProps {
  data: LocationDelivery[];
}

export default function DeliveriesByLocation({ data }: DeliveriesByLocationProps) {
  // Calcular total de entregas
  const totalDeliveries = data.reduce((sum, item) => sum + item.count, 0);

  // Encontrar el máximo para escalar las barras
  const maxCount = Math.max(...data.map(item => item.count), 1);

  // Obtener color según la posición
  const getBarColor = (index: number) => {
    if (index === 0) return "bg-blue-600";
    if (index === 1) return "bg-blue-500";
    if (index === 2) return "bg-blue-400";
    return "bg-blue-300";
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          Entregas por Ubicación
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sedes con mayor cantidad de entregas (últimos 30 días)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay datos de ubicaciones</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {data.slice(0, 6).map((item, index) => {
                // Calcular porcentaje
                const percentage = totalDeliveries > 0
                  ? ((item.count / totalDeliveries) * 100).toFixed(1)
                  : "0";

                // Calcular ancho de barra
                const barWidth = (item.count / maxCount) * 100;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {item.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {percentage}%
                        </span>
                        <span className="text-lg font-bold text-blue-600 min-w-[3rem] text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${getBarColor(index)}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Estadísticas adicionales */}
            <div className="pt-3 mt-3 border-t border-border/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ubicaciones
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {totalDeliveries}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total entregas
                  </div>
                </div>
              </div>
            </div>

            {/* Promedio por ubicación */}
            {data.length > 0 && (
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-gray-50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Promedio por ubicación
                </span>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {Math.round(totalDeliveries / data.length)} entregas
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
