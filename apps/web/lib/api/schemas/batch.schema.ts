import { z } from 'zod';

export const columnMetadataSchema = z.object({
  originalHeader: z.string(),
  normalizedKey: z.string(),
  inferredType: z.string(),
  position: z.number(),
});

export const batchResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  mode: z.enum(['LIST_MODE', 'PROFILE_MODE']),
  name: z.string().nullable().optional(),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']),
  fileCount: z.number(),
  rowCount: z.number(),
  columnMetadata: z.array(columnMetadataSchema),
  totalRows: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  deletedBy: z.string().nullable(),
});

export const batchListResponseSchema = z.object({
  items: z.array(batchResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const validationMessageSchema = z.object({
  field: z.string(),
  type: z.string(),
  message: z.string(),
});

export const rowResponseSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(['DRAFT', 'VALID', 'WARNING', 'ERROR']),
  validationMessages: z.array(validationMessageSchema),
  sourceFileName: z.string(),
  sourceSheetName: z.string(),
  sourceRowIndex: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const paginatedRowsResponseSchema = z.object({
  items: z.array(rowResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const uploadBatchResponseSchema = z.object({
  batchId: z.string(),
  rowCount: z.number(),
  mode: z.enum(['LIST_MODE', 'PROFILE_MODE']),
  fileCount: z.number(),
});

export type ColumnMetadata = z.infer<typeof columnMetadataSchema>;
export type BatchResponse = z.infer<typeof batchResponseSchema>;
export type BatchListResponse = z.infer<typeof batchListResponseSchema>;
export type RowResponse = z.infer<typeof rowResponseSchema>;
export type UploadBatchResponse = z.infer<typeof uploadBatchResponseSchema>;
export type PaginatedRowsResponse = z.infer<typeof paginatedRowsResponseSchema>;
