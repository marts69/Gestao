import { useMemo } from 'react';

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export function useSearch<T>(items: T[], searchTerm: string, selector: (item: T) => Array<string | undefined | null>) {
  return useMemo(() => {
    const query = normalize(searchTerm);
    if (!query) return items;

    return items.filter((item) => selector(item).some((field) => normalize(String(field || '')).includes(query)));
  }, [items, searchTerm, selector]);
}
