import { Inject, Injectable } from '@nestjs/common';

import type { Batch } from '../../core/entities/batch.entity';
import { BatchMode, ColumnMetadata } from '../../core/entities/batch.entity';
import { RowStatus } from '../../core/entities/row.entity';
import type { CreateRowData } from '../../core/entities/row.entity';
import { BatchRepository } from '../../core/repositories/batch.repository';
import { RowRepository } from '../../core/repositories/row.repository';
import { LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY } from './excel.constants';
import type {
  ExcelFileInput,
  ExcelParsingStrategy,
} from './strategies/excel-parsing.strategy';
import type { CellType } from './types';

/**
 * Input data for batch ingestion
 */
export interface IngestInput {
  projectId: string;
  userId: string;
  mode: BatchMode;
  files: ExcelFileInput[];
}

/**
 * Result of successful ingestion
 */
export interface IngestResult {
  batchId: string;
  rowCount: number;
}

/**
 * Orchestrates Excel file ingestion: strategy selection -> parsing -> batch creation -> row persistence
 * Contains NO parsing logic (delegated to strategies) and NO transaction management (delegated to use cases)
 *
 * @see ExcelParsingStrategy - Parsing logic abstraction
 * @see ListModeStrategy - Header-based parsing implementation
 * @see ProfileModeStrategy - Cell-address parsing implementation
 */
@Injectable()
export class IngestionService {
  public constructor(
    @Inject(LIST_MODE_STRATEGY)
    private readonly listModeStrategy: ExcelParsingStrategy,
    @Inject(PROFILE_MODE_STRATEGY)
    private readonly profileModeStrategy: ExcelParsingStrategy,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  /**
   * Orchestrates parse-then-persist flow
   *
   * Flow:
   * 1. Select parsing strategy based on mode
   * 2. Validate file count (delegates to strategy)
   * 3. Parse files (delegates to strategy)
   * 4. Build column metadata from type map
   * 5. Create batch record
   * 6. Map ParsedRow[] to CreateRowData[]
   * 7. Persist rows
   * 8. Return result
   *
   * @param input - Project, user, mode, and file buffers
   * @returns Batch ID and row count
   * @throws Error if strategy throws during validation or parsing
   * @throws Error if repository throws during persistence
   */
  public async ingest(input: IngestInput): Promise<IngestResult> {
    // 1. Select strategy
    const strategy = this.getStrategy(input.mode);

    // 2. Validate file count (throws if invalid)
    strategy.validateFileCount(input.files.length);

    // 3. Parse files (throws if unparseable)
    const parseResult = strategy.parse(input.files);

    // 4. Build column metadata
    const columnMetadata = this.buildColumnMetadata(parseResult.typeMap);

    // 5. Create batch record
    const batch: Batch = await this.batchRepository.create({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      fileCount: input.files.length,
      rowCount: parseResult.rows.length,
      columnMetadata,
    });

    // 6. Map parsed rows to CreateRowData
    const rowData: CreateRowData[] = parseResult.rows.map((row) => ({
      batchId: batch.id,
      data: row.data,
      status: RowStatus.Draft,
      validationMessages: [],
      sourceFileName: row.sourceFileName,
      sourceSheetName: row.sheetName,
      sourceRowIndex: row.rowIndex,
    }));

    // 7. Persist rows
    await this.rowRepository.createMany(rowData);

    // 8. Return result
    return { batchId: batch.id, rowCount: parseResult.rows.length };
  }

  /**
   * Selects parsing strategy based on batch mode
   *
   * @param mode - BatchMode enum value
   * @returns Strategy instance
   * @throws Error if mode is unknown
   */
  private getStrategy(mode: BatchMode): ExcelParsingStrategy {
    if (mode === BatchMode.ListMode) {
      return this.listModeStrategy;
    }

    if (mode === BatchMode.ProfileMode) {
      return this.profileModeStrategy;
    }

    throw new Error(`Unknown batch mode: ${String(mode)}`);
  }

  /**
   * Converts type map to ColumnMetadata array
   *
   * @param typeMap - Record of column/cell identifier to CellType
   * @returns ColumnMetadata array for batch persistence
   */
  private buildColumnMetadata(
    typeMap: Record<string, CellType>,
  ): ColumnMetadata[] {
    return Object.entries(typeMap).map(([key, inferredType], index) => ({
      originalHeader: key,
      normalizedKey: key,
      inferredType,
      position: index,
    }));
  }
}
