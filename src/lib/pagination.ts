export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function parseStrictInteger(value?: string | null) {
  if (value == null || !/^[+-]?\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parsePagination(
  pageValue?: string | null,
  limitValue?: string | null,
  defaultLimit = DEFAULT_PAGE_SIZE,
) {
  const parsedPage = parseStrictInteger(pageValue);
  const parsedLimit = parseStrictInteger(limitValue);
  const fallbackLimit = Number.isSafeInteger(defaultLimit)
    ? defaultLimit
    : DEFAULT_PAGE_SIZE;
  const limit = parsedLimit !== undefined
    ? Math.min(Math.max(parsedLimit, 1), MAX_PAGE_SIZE)
    : Math.min(Math.max(fallbackLimit, 1), MAX_PAGE_SIZE);

  return {
    page: parsedPage !== undefined ? Math.max(parsedPage, 1) : 1,
    limit,
  };
}

export function createPaginationMeta(
  requestedPage: number,
  limit: number,
  totalCount: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);

  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getPaginationSkip(meta: Pick<PaginationMeta, "page" | "limit">) {
  return (meta.page - 1) * meta.limit;
}
