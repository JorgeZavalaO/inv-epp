import { getCached, CACHE_KEYS, CACHE_TTL } from './cache/memory-cache';
import { fetchDashboardData, type DashboardData } from './dashboard';
import type { WarehouseScope } from './warehouse-scope';

export async function fetchDashboardDataCached(
  scope: WarehouseScope,
): Promise<DashboardData> {
  return getCached(
    `${CACHE_KEYS.DASHBOARD_KPIS}:${scope.cacheKey}`,
    () => fetchDashboardData(scope),
    CACHE_TTL.MEDIUM // 5 minutos de caché
  );
}

// ✅ FUNCIÓN PARA INVALIDAR CACHÉ DEL DASHBOARD
export async function invalidateDashboardCache(): Promise<void> {
  const { memoryCache } = await import('./cache/memory-cache');
  memoryCache.clear();
}
