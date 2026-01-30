export enum InferredType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  UNKNOWN = 'UNKNOWN',
}

export interface TypeInference {
  type: InferredType;
  confidence: number;
}

export interface FieldStats {
  fieldName: string;
  presenceCount: number;
  uniqueCount: number;
  inferredType: InferredType;
  confidence: number;
  sampleValues: unknown[];
}

export interface GetFieldStatsResult {
  totalRows: number;
  fields: FieldStats[];
}
