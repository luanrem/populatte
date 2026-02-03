export enum RowStatus {
  Draft = 'DRAFT',
  Valid = 'VALID',
  Warning = 'WARNING',
  Error = 'ERROR',
}

export enum FillStatus {
  Pending = 'PENDING',
  Valid = 'VALID',
  Error = 'ERROR',
}

export interface ValidationMessage {
  field: string;
  type: string;
  message: string;
}

export interface Row {
  id: string;
  batchId: string;
  data: Record<string, unknown>;
  status: RowStatus;
  validationMessages: ValidationMessage[];
  sourceFileName: string;
  sourceSheetName: string;
  sourceRowIndex: number;
  fillStatus: FillStatus;
  fillErrorMessage: string | null;
  fillErrorStep: string | null;
  fillUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateRowData {
  batchId: string;
  data: Record<string, unknown>;
  status?: RowStatus;
  validationMessages?: ValidationMessage[];
  sourceFileName: string;
  sourceSheetName: string;
  sourceRowIndex: number;
}

export interface UpdateRowStatusData {
  fillStatus: FillStatus;
  fillErrorMessage?: string | null;
  fillErrorStep?: string | null;
}
