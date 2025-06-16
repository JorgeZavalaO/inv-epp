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

export interface DashboardData {
  kpis: KpiData;
  movements: MovementPoint[];
  lowStockList: LowStockRow[];
  returnsPie: ReturnsPieData[];
  topDelivered: TopDeliveredData[];
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

    // Ejecutar queries en paralelo para mejor performance
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
      // Total de EPPs
      prisma.ePP.count(),
      
      // Entregas de los últimos 7 días
      prisma.delivery.count({ 
        where: { createdAt: { gte: weekStart } } 
      }),
      
      // Devoluciones de los últimos 7 días
      prisma.returnItem.count({ 
        where: { createdAt: { gte: weekStart } } 
      }),
      
      // Stock total
      prisma.ePPStock.aggregate({ 
        _sum: { quantity: true } 
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

    return {
      kpis,
      movements,
      lowStockList,
      returnsPie: completeReturnsPie,
      topDelivered: topDeliveredRaw,
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
    };
  }
}

// Función auxiliar para invalidar cache (si usas Next.js con revalidation)
export function revalidateDashboard() {
  // Esta función puede ser usada para invalidar el cache del dashboard
  // cuando se realizan operaciones que afecten los datos
  console.log("Dashboard data should be revalidated");
}