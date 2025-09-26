// ✅ DASHBOARD CON CACHÉ OPTIMIZADO
// lib/dashboard-cached.ts

import { getCached, CACHE_KEYS, CACHE_TTL } from './cache/memory-cache';
import { fetchDashboardData, type DashboardData } from './dashboard';

export async function fetchDashboardDataCached(): Promise<DashboardData> {
  return getCached(
    CACHE_KEYS.DASHBOARD_KPIS,
    fetchDashboardData,
    CACHE_TTL.MEDIUM // 5 minutos de caché
  );
}

// ✅ FUNCIÓN PARA INVALIDAR CACHÉ DEL DASHBOARD
export async function invalidateDashboardCache(): Promise<void> {
  const { memoryCache } = await import('./cache/memory-cache');
  memoryCache.clear();
}