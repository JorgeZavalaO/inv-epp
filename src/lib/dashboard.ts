import prisma from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";

export interface KpiData {
  totalEpps: number;
  totalStock: number;
  lowStockEpps: number;
  deliveries7: number;
  returns7: number;
}

export interface MovementPoint {
  date: string;
  entry: number;
  exit: number;
  adjustment: number;
}

export interface LowStockRow {
  id: number;
  code: string;
  name: string;
  totalStock: number;
  minStock: number;
}

export interface ReturnsPieData {
  condition: "REUSABLE" | "DISCARDED";
  qty: number;
}

export interface TopDeliveredData {
  name: string;
  qty: number;
}

export interface ActivityItem {
  id: string;
  type: 'delivery' | 'return' | 'stock_low' | 'stock_entry';
  title: string;
  description: string;
  user?: string;
  time: Date;
  status?: 'success' | 'warning' | 'error';
  quantity?: number;
}

export interface ChartData {
  name: string;
  value: number;
  category?: string;
  trend?: number;
}

export interface CriticalAlert {
  id: string;
  type: 'stock_critical' | 'stock_low' | 'overdue_delivery' | 'maintenance_due';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  count?: number;
  actionUrl?: string;
  actionLabel?: string;
  time?: Date;
}

export interface EnhancedKpiItem {
  title: string;
  value: string | number;
  icon: string; // nombre del icono, el frontend lo resuelve
  trend?: { value: number; period: string };
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  description?: string;
}

export interface DashboardData {
  kpis: KpiData;
  movements: MovementPoint[];
  lowStockList: LowStockRow[];
  returnsPie: ReturnsPieData[];
  topDelivered: TopDeliveredData[];
  recentActivity: ActivityItem[];
  deliveryTrend: ChartData[];
  stockByCategory: ChartData[];
  monthlyActivity: ChartData[];
  topEpps: ChartData[];
  criticalAlerts: CriticalAlert[];
  // KPIs dinámicos para el dashboard
  kpisList: EnhancedKpiItem[];
}

// Función auxiliar para obtener EPPs con stock bajo
async function getLowStockList(): Promise<LowStockRow[]> {
  try {
    const lowStockEpps = await prisma.$queryRaw<LowStockRow[]>`
      SELECT 
        e.id,
        e.code,
        e.name,
        COALESCE(SUM(es.quantity), 0)::int as "totalStock",
        e."minStock"
      FROM "EPP" e
      LEFT JOIN "EPPStock" es ON e.id = es."eppId"
      GROUP BY e.id, e.code, e.name, e."minStock"
      HAVING COALESCE(SUM(es.quantity), 0) <= e."minStock"
      ORDER BY COALESCE(SUM(es.quantity), 0) ASC, e."minStock" DESC
      LIMIT 15
    `;

    return lowStockEpps;
  } catch (error) {
    console.error("Error fetching low stock list:", error);
    return [];
  }
}

// Función auxiliar para obtener los EPPs más entregados
async function getTopDelivered(since: Date): Promise<TopDeliveredData[]> {
  try {
    const topDelivered = await prisma.$queryRaw<TopDeliveredData[]>`
      SELECT 
        e.name,
        SUM(d.quantity)::int as qty
      FROM "Delivery" d
      INNER JOIN "EPP" e ON d."eppId" = e.id
      WHERE d."createdAt" >= ${since}
      GROUP BY e.id, e.name
      ORDER BY SUM(d.quantity) DESC
      LIMIT 5
    `;

    return topDelivered;
  } catch (error) {
    console.error("Error fetching top delivered:", error);
    return [];
  }
}

// Función para obtener actividad reciente
async function getRecentActivity(): Promise<ActivityItem[]> {
  try {
    const activities: ActivityItem[] = [];

    // Entregas recientes
    const recentDeliveries = await prisma.deliveryBatch.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        collaborator: true,
        user: true,
        deliveries: {
          include: { epp: true }
        }
      }
    });

    recentDeliveries.forEach(batch => {
      const totalItems = batch.deliveries.reduce((sum, d) => sum + d.quantity, 0);
      activities.push({
        id: `delivery-${batch.id}`,
        type: 'delivery',
        title: `Entrega a ${batch.collaborator.name}`,
        description: `${batch.deliveries.length} tipos de EPP, ${totalItems} unidades`,
        user: batch.user?.name || 'Usuario',
        time: batch.createdAt,
        status: 'success',
        quantity: totalItems
      });
    });

    // Devoluciones recientes
    const recentReturns = await prisma.returnBatch.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: { include: { epp: true } }
      }
    });

    recentReturns.forEach(batch => {
      const totalItems = batch.items.reduce((sum, item) => sum + item.quantity, 0);
      activities.push({
        id: `return-${batch.id}`,
        type: 'return',
        title: 'Devolución procesada',
        description: `${batch.items.length} tipos de EPP devueltos`,
        user: batch.user?.name || 'Usuario',
        time: batch.createdAt,
        status: 'success',
        quantity: totalItems
      });
    });

    return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}

// Función para obtener datos de gráficos
async function getChartData(monthStart: Date): Promise<{
  deliveryTrend: ChartData[];
  stockByCategory: ChartData[];
  monthlyActivity: ChartData[];
  topEpps: ChartData[];
}> {
  try {
    // Tendencia de entregas (últimos 30 días)
    const deliveryTrendRaw = await prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT 
        DATE(db."createdAt") as day,
        COUNT(*)::int as count
      FROM "DeliveryBatch" db
      WHERE db."createdAt" >= ${monthStart}
      GROUP BY DATE(db."createdAt")
      ORDER BY day ASC
    `;

    const deliveryTrend: ChartData[] = deliveryTrendRaw.map(item => ({
      name: format(new Date(item.day), 'MMM dd'),
      value: item.count
    }));

    // Stock por categoría
    const stockByCategoryRaw = await prisma.$queryRaw<{ category: string; total: number }[]>`
      SELECT 
        e.category,
        COALESCE(SUM(es.quantity), 0)::int as total
      FROM "EPP" e
      LEFT JOIN "EPPStock" es ON e.id = es."eppId"
      GROUP BY e.category
      HAVING COALESCE(SUM(es.quantity), 0) > 0
      ORDER BY total DESC
    `;

    const stockByCategory: ChartData[] = stockByCategoryRaw.map(item => ({
      name: item.category,
      value: item.total
    }));

    // Actividad mensual (últimos 12 meses) - Simplificado
    const monthlyActivityRaw = await prisma.$queryRaw<{ month: string; deliveries: number; returns: number }[]>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', series.month_start), 'YYYY-MM') as month,
        COALESCE(deliveries.count, 0)::int as deliveries,
        COALESCE(returns.count, 0)::int as returns
      FROM generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '11 months'), 
        DATE_TRUNC('month', NOW()), 
        '1 month'::interval
      ) AS series(month_start)
      LEFT JOIN (
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*)::int as count
        FROM "DeliveryBatch" 
        WHERE "createdAt" >= DATE_TRUNC('month', NOW() - INTERVAL '11 months')
        GROUP BY DATE_TRUNC('month', "createdAt")
      ) deliveries ON series.month_start = deliveries.month
      LEFT JOIN (
        SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*)::int as count
        FROM "ReturnBatch"
        WHERE "createdAt" >= DATE_TRUNC('month', NOW() - INTERVAL '11 months')
        GROUP BY DATE_TRUNC('month', "createdAt")
      ) returns ON series.month_start = returns.month
      ORDER BY series.month_start ASC
    `;

    const monthlyActivity: ChartData[] = monthlyActivityRaw.map(item => ({
      name: format(new Date(item.month + '-01'), 'MMM'),
      value: item.deliveries + item.returns
    }));

    // Top EPPs convertir TopDeliveredData a ChartData
    const topEppsRaw = await getTopDelivered(monthStart);
    const topEpps: ChartData[] = topEppsRaw.map(item => ({
      name: item.name,
      value: item.qty
    }));

    return {
      deliveryTrend,
      stockByCategory,
      monthlyActivity,
      topEpps
    };
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return {
      deliveryTrend: [],
      stockByCategory: [],
      monthlyActivity: [],
      topEpps: []
    };
  }
}

// Función para obtener alertas críticas
async function getCriticalAlerts(): Promise<CriticalAlert[]> {
  try {
    const alerts: CriticalAlert[] = [];

    // Alertas de stock crítico
    const criticalStock = await prisma.$queryRaw<{ id: number; name: string; totalStock: number; minStock: number }[]>`
      SELECT 
        e.id,
        e.name,
        COALESCE(SUM(es.quantity), 0)::int as "totalStock",
        e."minStock"
      FROM "EPP" e
      LEFT JOIN "EPPStock" es ON e.id = es."eppId"
      GROUP BY e.id, e.name, e."minStock"
      HAVING COALESCE(SUM(es.quantity), 0) = 0 AND e."minStock" > 0
      LIMIT 5
    `;

    criticalStock.forEach(stock => {
      alerts.push({
        id: `critical-stock-${stock.id}`,
        type: 'stock_critical',
        title: 'Stock agotado',
        description: `${stock.name} está sin existencias`,
        severity: 'high',
        actionUrl: `/stock-movements`,
        actionLabel: 'Gestionar stock'
      });
    });

    // Alertas de stock bajo
    const lowStock = await prisma.$queryRaw<{ id: number; name: string; totalStock: number; minStock: number }[]>`
      SELECT 
        e.id,
        e.name,
        COALESCE(SUM(es.quantity), 0)::int as "totalStock",
        e."minStock"
      FROM "EPP" e
      LEFT JOIN "EPPStock" es ON e.id = es."eppId"
      GROUP BY e.id, e.name, e."minStock"
      HAVING COALESCE(SUM(es.quantity), 0) > 0 AND COALESCE(SUM(es.quantity), 0) <= e."minStock"
      LIMIT 10
    `;

    lowStock.forEach(stock => {
      alerts.push({
        id: `low-stock-${stock.id}`,
        type: 'stock_low',
        title: 'Stock bajo',
        description: `${stock.name}: ${stock.totalStock} unidades (mín. ${stock.minStock})`,
        severity: 'medium',
        count: stock.totalStock,
        actionUrl: `/stock-movements`,
        actionLabel: 'Ver stock'
      });
    });

    return alerts.slice(0, 15); // Limitar a 15 alertas máximo
  } catch (error) {
    console.error("Error fetching critical alerts:", error);
    return [];
  }
}

// Función auxiliar para procesar movimientos por día
interface MovementRaw {
  createdAt: Date;
  type: 'ENTRY' | 'TRANSFER_IN' | 'EXIT' | 'TRANSFER_OUT' | 'ADJUSTMENT';
  quantity: number;
}

function processMovementsByDay(movements: MovementRaw[]): MovementPoint[] {
  const today = new Date();
  const days: MovementPoint[] = [];
  
  // Crear array de los últimos 30 días
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    days.push({
      date: format(date, 'yyyy-MM-dd'),
      entry: 0,
      exit: 0,
      adjustment: 0,
    });
  }

  // Agrupar movimientos por día
  const movementsByDate = movements.reduce((acc, movement) => {
    const date = format(new Date(movement.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = { entry: 0, exit: 0, adjustment: 0 };
    }

    switch (movement.type) {
      case 'ENTRY':
      case 'TRANSFER_IN':
        acc[date].entry += movement.quantity;
        break;
      case 'EXIT':
      case 'TRANSFER_OUT':
        acc[date].exit += movement.quantity;
        break;
      case 'ADJUSTMENT':
        acc[date].adjustment += Math.abs(movement.quantity);
        break;
    }

    return acc;
  }, {} as Record<string, { entry: number; exit: number; adjustment: number }>);

  // Aplicar los datos agrupados a los días
  return days.map(day => ({
    ...day,
    ...(movementsByDate[day.date] || {}),
  }));
}

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const today = startOfDay(new Date());
    const weekStart = subDays(today, 7);
    const monthStart = subDays(today, 29);

    // ✅ OPTIMIZACIÓN: Ejecutar queries en paralelo con mejor performance
    const [
      totalEpps,
      deliveries7,
      returns7,
      stockSum,
      lowStockList,
      movementsRaw,
      returnsPieRaw,
      topDeliveredRaw,
    ] = await Promise.all([
      // Total de EPPs (con cache natural de COUNT)
      prisma.ePP.count(),
      
      // ✅ OPTIMIZACIÓN: Entregas usando índice optimizado
      prisma.delivery.count({ 
        where: { 
          createdAt: { gte: weekStart } 
        } 
      }),
      
      // ✅ OPTIMIZACIÓN: Devoluciones usando índice optimizado
      prisma.returnItem.count({ 
        where: { 
          createdAt: { gte: weekStart } 
        } 
      }),
      
      // ✅ OPTIMIZACIÓN: Stock total con aggregate optimizado
      prisma.ePPStock.aggregate({ 
        _sum: { quantity: true },
        where: { quantity: { gt: 0 } } // Solo contar stock positivo
      }),
      
      // Lista de EPPs con stock bajo
      getLowStockList(),
      
      // Movimientos del último mes
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { 
          createdAt: true, 
          type: true, 
          quantity: true 
        },
        orderBy: { createdAt: 'asc' }
      }),
      
      // Devoluciones por condición
      prisma.returnItem.groupBy({
        by: ["condition"],
        where: { createdAt: { gte: monthStart } },
        _sum: { quantity: true },
      }),
      
      // Top EPPs entregados
      getTopDelivered(monthStart),
    ]);

    // Preparar KPIs
    const kpis: KpiData = {
      totalEpps: totalEpps || 0,
      totalStock: stockSum._sum.quantity || 0,
      lowStockEpps: lowStockList.length,
      deliveries7: deliveries7 || 0,
      returns7: returns7 || 0,
    };

    // Procesar movimientos por día
    const movements = processMovementsByDay(movementsRaw);

    // Formatear datos de devoluciones
    const returnsPie: ReturnsPieData[] = returnsPieRaw.map(item => ({
      condition: item.condition,
      qty: item._sum.quantity || 0,
    }));

    // Asegurar que ambas condiciones estén presentes
    const conditions: ("REUSABLE" | "DISCARDED")[] = ["REUSABLE", "DISCARDED"];
    const completeReturnsPie = conditions.map(condition => {
      const existing = returnsPie.find(item => item.condition === condition);
      return existing || { condition, qty: 0 };
    });

    // Obtener datos adicionales para el dashboard mejorado
    const [recentActivity, chartData, criticalAlerts] = await Promise.all([
      getRecentActivity(),
      getChartData(monthStart),
      getCriticalAlerts()
    ]);

    // KPIs dinámicos para EnhancedKpiCard
    const kpisList: EnhancedKpiItem[] = [
      {
        title: "EPPs Totales",
        value: kpis.totalEpps,
        icon: "Package",
        trend: { value: 0, period: "vs mes anterior" },
        status: "good",
        description: "Tipos de EPP registrados"
      },
      {
        title: "Stock Total",
        value: kpis.totalStock,
        icon: "Boxes",
        trend: { value: 0, period: "vs semana anterior" },
        status: "neutral",
        description: "Unidades en inventario"
      },
      {
        title: "Stock Crítico",
        value: kpis.lowStockEpps,
        icon: "AlertTriangle",
        trend: { value: 0, period: "vs mes anterior" },
        status: (kpis.lowStockEpps > 5 ? "critical" : "warning"),
        description: "EPPs con stock bajo"
      },
      {
        title: "Entregas Semanales",
        value: kpis.deliveries7,
        icon: "Truck",
        trend: { value: 0, period: "vs semana anterior" },
        status: "good",
        description: "Últimos 7 días"
      },
    ];

    return {
      kpis,
      movements,
      lowStockList,
      returnsPie: completeReturnsPie,
      topDelivered: topDeliveredRaw,
      recentActivity,
      deliveryTrend: chartData.deliveryTrend,
      stockByCategory: chartData.stockByCategory,
      monthlyActivity: chartData.monthlyActivity,
      topEpps: chartData.topEpps,
      criticalAlerts,
      kpisList
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    
    // Retornar datos vacíos en caso de error
    return {
      kpis: {
        totalEpps: 0,
        totalStock: 0,
        lowStockEpps: 0,
        deliveries7: 0,
        returns7: 0,
      },
      movements: [],
      lowStockList: [],
      returnsPie: [
        { condition: "REUSABLE", qty: 0 },
        { condition: "DISCARDED", qty: 0 },
      ],
      topDelivered: [],
      recentActivity: [],
      deliveryTrend: [],
      stockByCategory: [],
      monthlyActivity: [],
      topEpps: [],
      criticalAlerts: [],
      kpisList: []
    };
  }
}

// Función auxiliar para invalidar cache (si usas Next.js con revalidation)
export function revalidateDashboard() {
  // Esta función puede ser usada para invalidar el cache del dashboard
  // cuando se realizan operaciones que afecten los datos
  console.log("Dashboard data should be revalidated");
}