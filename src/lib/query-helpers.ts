/**
 * Shared query helper functions for parsing sort and include parameters.
 * Reduces code duplication across services.
 */

export interface SortResult {
  [field: string]: 'asc' | 'desc';
}

/**
 * Parses a sort string into a Prisma orderBy object.
 * @param sort - Sort string (e.g., "-createdAt" for descending, "name" for ascending)
 * @param validFields - Array of valid field names to sort by
 * @param defaultField - Default field to sort by if invalid or not provided
 */
export function parseSort(
  sort: string | undefined,
  validFields: string[],
  defaultField: string = 'createdAt'
): SortResult {
  if (!sort) return { [defaultField]: 'desc' };

  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;

  const orderField = validFields.includes(field) ? field : defaultField;
  return { [orderField]: desc ? 'desc' : 'asc' };
}

/**
 * Parses an include string into a Prisma include object.
 * @param include - Comma-separated list of relations to include
 * @param validIncludes - Array of valid relation names
 */
export function parseIncludes(
  include: string | undefined,
  validIncludes: string[]
): Record<string, boolean> {
  if (!include) return {};

  const includes: Record<string, boolean> = {};

  include.split(',').forEach((inc) => {
    const trimmed = inc.trim();
    if (validIncludes.includes(trimmed)) {
      includes[trimmed] = true;
    }
  });

  return includes;
}
