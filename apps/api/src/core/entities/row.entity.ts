export enum RowStatus {
  Valid = 'VALID',
  Warning = 'WARNING',
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
