'use server';

import { globalSearch, type GlobalSearchResult } from '@/lib/data/search';

export async function searchGlobalAction(query: string): Promise<GlobalSearchResult[]> {
  try {
    return await globalSearch(query);
  } catch (error) {
    console.error('Global search error:', error);
    return [];
  }
}
