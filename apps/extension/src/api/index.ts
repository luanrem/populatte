/**
 * API Module
 *
 * Provides API client and auth functions for the extension.
 *
 * Usage:
 *   import { API_BASE_URL, fetchWithAuth, exchangeCode, getMe } from '@/api';
 *   import { fetchProjects, fetchBatches } from '@/api';
 *   import { fetchMappingsByUrl, fetchMappingWithSteps } from '@/api';
 */

export { API_BASE_URL, fetchWithAuth } from './client';
export { exchangeCode, getMe } from './auth';
export { fetchProjects } from './projects';
export { fetchBatches } from './batches';
export { fetchMappingsByUrl, fetchMappingWithSteps } from './mappings';
export type { MappingListItem, MappingWithSteps, MappingStep } from './mappings';
export { fetchRowByIndex } from './rows';
export type { RowData } from './rows';
