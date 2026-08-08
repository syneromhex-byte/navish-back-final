import { PaginationQuery, PaginationMeta, PaginatedResult } from '../types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const parsePaginationQuery = (query: Record<string, unknown>): Required<PaginationQuery> => ({
  page: Math.max(1, Number(query.page) || DEFAULT_PAGE),
  limit: Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT)),
  search: (query.search as string) || '',
  sortBy: (query.sortBy as string) || 'createdAt',
  sortOrder: (query.sortOrder as 'asc' | 'desc') === 'asc' ? 'asc' : 'desc',
});

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
};

export const paginateArray = <T>(array: T[], page: number, limit: number): PaginatedResult<T> => {
  const start = (page - 1) * limit;
  const data = array.slice(start, start + limit);
  const meta = buildPaginationMeta(array.length, page, limit);
  return { data, meta };
};

export const buildPrismaSkipTake = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit,
});
