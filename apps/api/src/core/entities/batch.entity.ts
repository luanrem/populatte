export enum BatchStatus {
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

export enum BatchMode {
  ListMode = 'LIST_MODE',
  ProfileMode = 'PROFILE_MODE',
}

export interface ColumnMetadata {
  originalHeader: string;
  normalizedKey: string;
  inferredType: string;
  position: number;
}

export interface Batch {
  id: string;
  projectId: string;
  userId: string;
  mode: BatchMode;
  name: string | null;
  status: BatchStatus;
  fileCount: number;
  rowCount: number;
  columnMetadata: ColumnMetadata[];
  identifierFieldKey: string | null;
  secondaryFieldKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CreateBatchData {
  projectId: string;
  userId: string;
  mode: BatchMode;
  name?: string | null;
  fileCount: number;
  rowCount: number;
  columnMetadata: ColumnMetadata[];
  identifierFieldKey?: string | null;
  secondaryFieldKey?: string | null;
}

export interface UpdateBatchData {
  name?: string;
  identifierFieldKey?: string | null;
  secondaryFieldKey?: string | null;
}
