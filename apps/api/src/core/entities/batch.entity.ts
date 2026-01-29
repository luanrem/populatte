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
  status: BatchStatus;
  fileCount: number;
  rowCount: number;
  columnMetadata: ColumnMetadata[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CreateBatchData {
  projectId: string;
  userId: string;
  mode: BatchMode;
  fileCount: number;
  rowCount: number;
  columnMetadata: ColumnMetadata[];
}
