export enum ProjectStatus {
  Active = 'active',
  Archived = 'archived',
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  targetEntity: string | null;
  targetUrl: string | null;
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
  targetUrl?: string | null;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  targetEntity?: string | null;
  targetUrl?: string | null;
  status?: ProjectStatus;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  targetEntity: string | null;
  targetUrl: string | null;
  status: ProjectStatus;
}
