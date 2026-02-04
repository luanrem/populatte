/**
 * Mappings API Functions
 *
 * Functions for fetching mapping data from the backend.
 * Uses fetchWithAuth for authenticated requests.
 */

import { API_BASE_URL, fetchWithAuth } from './client';

/**
 * Mapping list item returned by the API
 * Includes step count for filtering empty mappings
 */
export interface MappingListItem {
  id: string;
  name: string;
  targetUrl: string;
  stepCount: number;
  isActive: boolean;
}

/**
 * Mapping step details
 */
export interface MappingStep {
  id: string;
  stepOrder: number;
  action: 'fill' | 'click' | 'wait';
  selector: {
    type: 'css' | 'xpath';
    value: string;
  };
  selectorFallbacks?: Array<{
    type: 'css' | 'xpath';
    value: string;
  }>;
  sourceFieldKey?: string;
  fixedValue?: string;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number;
  optional?: boolean;
}

/**
 * Mapping with full step details
 */
export interface MappingWithSteps {
  id: string;
  name: string;
  targetUrl: string;
  isActive: boolean;
  successTrigger: 'url_change' | 'text_appears' | 'element_disappears' | null;
  successConfig: { selector?: string } | null;
  steps: MappingStep[];
}

/**
 * Fetch mappings matching a URL for a project
 *
 * The backend supports inverted prefix matching: `currentUrl LIKE storedUrl%`
 * This returns all active mappings where the stored targetUrl is a prefix of the current URL.
 *
 * @param projectId - Project ID to fetch mappings for
 * @param currentUrl - Current page URL to match against
 * @returns Array of matching mappings with step counts
 * @throws Error on network or API failure
 */
export async function fetchMappingsByUrl(
  projectId: string,
  currentUrl: string
): Promise<MappingListItem[]> {
  const params = new URLSearchParams({
    targetUrl: currentUrl,
    isActive: 'true',
  });

  const response = await fetchWithAuth(
    `${API_BASE_URL}/projects/${projectId}/mappings?${params.toString()}`
  );

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Failed to fetch mappings';
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Failed to fetch mappings') {
        throw e;
      }
      throw new Error(`Failed to fetch mappings: ${response.statusText}`);
    }
  }

  const data = await response.json();

  // API returns array of mappings with stepCount
  const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);

  return items.map(
    (mapping: {
      id: string;
      name: string;
      targetUrl: string;
      isActive: boolean;
      stepCount?: number;
      _count?: { steps: number };
    }) => ({
      id: mapping.id,
      name: mapping.name,
      targetUrl: mapping.targetUrl,
      isActive: mapping.isActive,
      // Handle both direct stepCount and Prisma _count format
      stepCount: mapping.stepCount ?? mapping._count?.steps ?? 0,
    })
  );
}

/**
 * Fetch a single mapping with its steps
 *
 * @param projectId - Project ID
 * @param mappingId - Mapping ID to fetch
 * @returns Mapping with full step details
 * @throws Error on network or API failure
 */
export async function fetchMappingWithSteps(
  projectId: string,
  mappingId: string
): Promise<MappingWithSteps> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/projects/${projectId}/mappings/${mappingId}`
  );

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Failed to fetch mapping';
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Failed to fetch mapping') {
        throw e;
      }
      throw new Error(`Failed to fetch mapping: ${response.statusText}`);
    }
  }

  const data = await response.json();

  // Map API response to MappingWithSteps format
  return {
    id: data.id,
    name: data.name,
    targetUrl: data.targetUrl,
    isActive: data.isActive,
    successTrigger: data.successTrigger ?? null,
    successConfig: data.successConfig ?? null,
    steps: (data.steps ?? []).map(
      (step: {
        id: string;
        stepOrder: number;
        action: string;
        selector: { type: string; value: string };
        selectorFallbacks?: Array<{ type: string; value: string }>;
        sourceFieldKey?: string | null;
        fixedValue?: string | null;
        clearBefore?: boolean;
        pressEnter?: boolean;
        waitMs?: number | null;
        optional?: boolean;
      }) => ({
        id: step.id,
        stepOrder: step.stepOrder,
        action: step.action as 'fill' | 'click' | 'wait',
        selector: {
          type: step.selector.type as 'css' | 'xpath',
          value: step.selector.value,
        },
        selectorFallbacks: step.selectorFallbacks?.map((fb) => ({
          type: fb.type as 'css' | 'xpath',
          value: fb.value,
        })),
        sourceFieldKey: step.sourceFieldKey ?? undefined,
        fixedValue: step.fixedValue ?? undefined,
        clearBefore: step.clearBefore ?? undefined,
        pressEnter: step.pressEnter ?? undefined,
        waitMs: step.waitMs ?? undefined,
        optional: step.optional ?? undefined,
      })
    ),
  };
}
