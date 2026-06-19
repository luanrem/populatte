import { BatchMapper } from '../../src/infrastructure/database/drizzle/mappers/batch.mapper';
import type { IngestionBatchRow } from '../../src/infrastructure/database/drizzle/schema/ingestion-batches.schema';

function baseRow(columnMetadata: unknown): IngestionBatchRow {
  return {
    id: 'batch-1',
    projectId: 'project-1',
    userId: 'user-1',
    mode: 'PROFILE_MODE',
    name: 'b.xlsx',
    status: 'COMPLETED',
    fileCount: 1,
    rowCount: 1,
    columnMetadata,
    identifierFieldKey: null,
    secondaryFieldKey: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    deletedBy: null,
  } as unknown as IngestionBatchRow;
}

describe('BatchMapper.toDomain — columnMetadata label backfill (F1)', () => {
  it('defaults label to normalizedKey for legacy columns without label', () => {
    const batch = BatchMapper.toDomain(
      baseRow([
        {
          originalHeader: 'A1',
          normalizedKey: 'A1',
          inferredType: 'string',
          position: 0,
        },
      ]),
    );

    expect(batch.columnMetadata[0]?.label).toBe('A1');
  });

  it('preserves an explicit label', () => {
    const batch = BatchMapper.toDomain(
      baseRow([
        {
          label: 'Produção (t)',
          originalHeader: 'B1',
          normalizedKey: 'B1',
          inferredType: 'number',
          position: 1,
        },
      ]),
    );

    expect(batch.columnMetadata[0]?.label).toBe('Produção (t)');
  });

  it('returns an empty array when column_metadata is not an array', () => {
    expect(BatchMapper.toDomain(baseRow(null)).columnMetadata).toEqual([]);
  });
});
