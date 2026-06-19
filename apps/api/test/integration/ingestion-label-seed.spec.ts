import { IngestionService } from '../../src/infrastructure/excel/ingestion.service';
import { BatchMode } from '../../src/core/entities/batch.entity';
import type {
  Batch,
  CreateBatchData,
} from '../../src/core/entities/batch.entity';
import { CellType } from '../../src/infrastructure/excel/types';
import type { ParseResult } from '../../src/infrastructure/excel/types';
import type { ExcelParsingStrategy } from '../../src/infrastructure/excel/strategies/excel-parsing.strategy';
import type { BatchRepository } from '../../src/core/repositories/batch.repository';
import type { RowRepository } from '../../src/core/repositories/row.repository';

describe('IngestionService — label seed (F1)', () => {
  it('seeds columnMetadata.label to the trimmed key', async () => {
    const parseResult: ParseResult = {
      typeMap: { ' A1 ': CellType.String, B2: CellType.Number },
      rows: [
        {
          rowIndex: 1,
          sheetName: 'Sheet1',
          sourceFileName: 'f.xlsx',
          data: {},
        },
      ],
    };
    const strategy: ExcelParsingStrategy = {
      validateFileCount: jest.fn(),
      parse: jest.fn().mockReturnValue(parseResult),
    };

    let captured: CreateBatchData | undefined;
    const batchRepository = {
      create: jest.fn((data: CreateBatchData): Promise<Batch> => {
        captured = data;
        return Promise.resolve({ id: 'batch-1' } as unknown as Batch);
      }),
    };
    const rowRepository = {
      createMany: jest.fn().mockResolvedValue(undefined),
    };

    const service = new IngestionService(
      strategy,
      strategy,
      batchRepository as unknown as BatchRepository,
      rowRepository as unknown as RowRepository,
    );

    await service.ingest({
      projectId: 'p',
      userId: 'u',
      mode: BatchMode.ProfileMode,
      files: [{ buffer: Buffer.from('x'), originalName: 'f.xlsx' }],
    });

    expect(captured?.columnMetadata).toEqual([
      {
        label: 'A1',
        originalHeader: 'A1',
        normalizedKey: 'A1',
        inferredType: 'string',
        position: 0,
      },
      {
        label: 'B2',
        originalHeader: 'B2',
        normalizedKey: 'B2',
        inferredType: 'number',
        position: 1,
      },
    ]);
  });
});
