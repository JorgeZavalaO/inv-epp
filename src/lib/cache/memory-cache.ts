// ✅ SISTEMA DE CACHÉ SIMPLE EN MEMORIA
// lib/cache/memory-cache.ts

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>();

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  // Limpiar items expirados cada 5 minutos
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

export const memoryCache = new MemoryCache();

// Iniciar limpieza automática en servidor
if (typeof window === 'undefined') {
  memoryCache.startCleanup();
}

// ✅ WRAPPER PARA CACHÉ CON FUNCIÓN
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = memoryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  memoryCache.set(key, data, ttlSeconds);
  return data;
}

// ✅ CONSTANTES DE CACHÉ
export const CACHE_KEYS = {
  DASHBOARD_KPIS: 'dashboard:kpis',
  WAREHOUSES: 'warehouses:all',
  EPP_CATEGORIES: 'epps:categories',
  LOW_STOCK: 'stock:low',
  COLLABORATORS: 'collaborators:all',
  DELIVERY_STATS: (filters?: string) => `delivery:stats${filters ? `:${filters}` : ''}`,
} as const;

export const CACHE_TTL = {
  SHORT: 60,      // 1 minuto
  MEDIUM: 300,    // 5 minutos
  LONG: 1800,     // 30 minutos
  VERY_LONG: 3600 // 1 hora
} as const;