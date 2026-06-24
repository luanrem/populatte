export enum ProjectStatus {
  Active = 'active',
  Archived = 'archived',
}

export interface ProjectUrl {
  url: string;
  isPrimary: boolean;
  label?: string;
}

/**
 * Loose URL shape accepted from the transport layer (DTO/Zod), where
 * `isPrimary` may be omitted or set on more than one entry. It is reconciled
 * into the canonical {@link ProjectUrl} invariant by {@link normalizeProjectUrls}.
 */
export interface ProjectUrlInput {
  url: string;
  isPrimary?: boolean | undefined;
  label?: string | undefined;
}

/**
 * Enforces the project URL invariant: exactly one primary URL in a non-empty
 * list, order preserved. If no entry is flagged as primary, the first one is
 * promoted; if several are, only the first flagged entry stays primary. An
 * empty list stays empty (projects may have no URL yet).
 */
export function normalizeProjectUrls(urls: ProjectUrlInput[]): ProjectUrl[] {
  if (urls.length === 0) {
    return [];
  }

  const flaggedIndex = urls.findIndex((entry) => entry.isPrimary === true);
  const primaryIndex = flaggedIndex === -1 ? 0 : flaggedIndex;

  return urls.map((entry, index) => {
    const normalized: ProjectUrl = {
      url: entry.url,
      isPrimary: index === primaryIndex,
    };

    if (entry.label !== undefined) {
      normalized.label = entry.label;
    }

    return normalized;
  });
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  targetEntity: string | null;
  urls: ProjectUrl[];
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateProjectData {
  userId: string;
  name: string;
  description?: string | null;
  targetEntity?: string | null;
  urls: ProjectUrl[];
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  targetEntity?: string | null;
  urls?: ProjectUrl[];
  status?: ProjectStatus;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  targetEntity: string | null;
  urls: ProjectUrl[];
  status: ProjectStatus;
}
