export interface FieldValuesQuery {
  batchId: string;
  fieldKey: string;
  limit: number;
  offset: number;
  search?: string;
}

export interface FieldValuesResult {
  values: string[];
  matchingCount: number;
  totalDistinctCount: number;
}
