/**
 * Projects API Functions
 *
 * Functions for fetching project data from the backend.
 * Uses fetchWithAuth for authenticated requests.
 */

import { API_BASE_URL, fetchWithAuth } from './client';
import type { ProjectSummary } from '../types/responses';

/**
 * Fetch all projects for the authenticated user
 *
 * @returns Array of project summaries
 * @throws Error on network or API failure
 */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/projects`);

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Failed to fetch projects';
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Failed to fetch projects') {
        throw e;
      }
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
  }

  const data = await response.json();

  // Map API response to ProjectSummary format
  // API returns: { id, name, createdAt, updatedAt, batchCount }
  return data.map((project: { id: string; name: string; batchCount?: number }) => ({
    id: project.id,
    name: project.name,
    batchCount: project.batchCount ?? 0,
  }));
}
