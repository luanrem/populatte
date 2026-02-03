// Shared TypeScript types for Populatte
// This package provides type definitions used across all apps

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  clerkId: string;
  email: string;
  name?: string;
}

export interface Project extends BaseEntity {
  userId: string;
  name: string;
  status: ProjectStatus;
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}
