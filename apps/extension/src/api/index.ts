/**
 * API Module
 *
 * Provides API client and auth functions for the extension.
 *
 * Usage:
 *   import { API_BASE_URL, fetchWithAuth, exchangeCode, getMe } from '@/api';
 */

export { API_BASE_URL, fetchWithAuth } from './client';
export { exchangeCode, getMe } from './auth';
