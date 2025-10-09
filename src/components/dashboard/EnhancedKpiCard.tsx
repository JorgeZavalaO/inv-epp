import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Package, Boxes, Truck, RotateCcw, AlertTriangle } from "lucide-react";

interface EnhancedKpiCardProps {
  title: string;
  value: string | number;
  icon: string; // nombre del icono
  trend?: {
    value: number;
    period: string;
  };
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  description?: string;
  className?: string;
}

export default function EnhancedKpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  status = 'neutral', 
  description,
  className 
}: EnhancedKpiCardProps) {
  // Resolver icono por nombre
  const iconMap: Record<string, React.ReactNode> = {
    Package: <Package className="w-4 h-4" />,
    Boxes: <Boxes className="w-4 h-4" />,
    Truck: <Truck className="w-4 h-4" />,
    RotateCcw: <RotateCcw className="w-4 h-4" />,
    AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  };
  const statusColors = {
    good: 'border-l-green-500 bg-green-50/50',
    warning: 'border-l-yellow-500 bg-yellow-50/50',
    critical: 'border-l-red-500 bg-red-50/50',
    neutral: 'border-l-blue-500 bg-blue-50/50'
  };

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trendValue < 0) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'text-green-600';
    if (trendValue < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
      statusColors[status],
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-white/60">
                {iconMap[icon] ?? null}
              </div>
              <div className="text-sm font-medium text-gray-600">
                {title}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              
              {description && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {trend && (
          <div className="mt-4 pt-4 border-t border-gray-200/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                {getTrendIcon(trend.value)}
                <span className={getTrendColor(trend.value)}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </div>
              <span className="text-gray-500">{trend.period}</span>
            </div>
          </div>
        )}

        {status !== 'neutral' && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs px-2 py-0.5"
            >
              {status === 'good' ? 'Bien' : status === 'warning' ? 'Atención' : 'Crítico'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}