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
  /**
   * Human-facing display name for the column/cell — the INBOUND annotation
   * (ADR 0001 / POP-24). Editable by the user; defaults to `normalizedKey`.
   * The UI shows `label`, but every join/fill still keys off `normalizedKey`.
   */
  label: string;
  originalHeader: string;
  /**
   * Immutable join key (ADR 0001 / POP-24, see
   * docs/adr/0002-normalizedkey-immutability.md).
   *
   * This is the ONLY coherence thread between `Step.sourceFieldKey`,
   * `IngestionRow.data` and the column — there is no foreign key. It is assigned
   * once at ingestion and MUST NOT change afterwards. The `updateColumnMetadata`
   * write path only relabels existing keys and rejects unknown/changed keys.
   */
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

/**
 * Single label edit for the INBOUND write path (ADR 0001 / POP-24, F2).
 * Targets an existing column by its immutable `normalizedKey`; only `label`
 * is mutable. Unknown keys are rejected (the immutability guard).
 */
export interface ColumnLabelUpdate {
  normalizedKey: string;
  label: string;
}
