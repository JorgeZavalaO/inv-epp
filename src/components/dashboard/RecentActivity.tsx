import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  RotateCcw, 
  Package, 
  AlertTriangle,
  Clock,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: 'delivery' | 'return' | 'stock_low' | 'stock_entry';
  title: string;
  description: string;
  user?: string;
  time: Date;
  status?: 'success' | 'warning' | 'error';
  quantity?: number;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: ActivityItem['type']) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'delivery':
        return <Truck className={`${iconClass} text-blue-600`} />;
      case 'return':
        return <RotateCcw className={`${iconClass} text-orange-600`} />;
      case 'stock_entry':
        return <Package className={`${iconClass} text-green-600`} />;
      case 'stock_low':
        return <AlertTriangle className={`${iconClass} text-red-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-500`} />;
    }
  };

  const getTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'delivery':
        return 'bg-blue-100 text-blue-700';
      case 'return':
        return 'bg-orange-100 text-orange-700';
      case 'stock_entry':
        return 'bg-green-100 text-green-700';
      case 'stock_low':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status?: ActivityItem['status']) => {
    if (!status) return null;
    
    const variants = {
      success: { variant: 'default' as const, text: 'Completado' },
      warning: { variant: 'secondary' as const, text: 'Pendiente' },
      error: { variant: 'destructive' as const, text: 'Error' }
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.text}
      </Badge>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Actividad Reciente
        </CardTitle>
        <p className="text-sm text-muted-foreground">Últimas acciones realizadas en el sistema</p>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                {getIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {activity.description}
                    </p>
                  </div>
                  {getStatusBadge(activity.status)}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    {activity.user && (
                      <>
                        <User className="w-3 h-3" />
                        <span>{activity.user}</span>
                      </>
                    )}
                    {activity.quantity && (
                      <span className="text-gray-400">
                        • {activity.quantity} unidades
                      </span>
                    )}
                  </div>
                  <span>
                    {formatDistanceToNow(activity.time, { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}