export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  // Accept both `limit` (frontend) and `perPage` (legacy) as query params
  const rawLimit = query.limit ?? query.perPage ?? '20';
  const limit = Math.min(100, Math.max(1, parseInt(String(rawLimit), 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): object {
  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      pages: Math.ceil(total / params.limit),
    },
  };
}
