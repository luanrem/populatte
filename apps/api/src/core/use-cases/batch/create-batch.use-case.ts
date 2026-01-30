import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { BatchMode } from '../../entities/batch.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { IngestionService } from '../../../infrastructure/excel/ingestion.service';
import type { ExcelFileInput } from '../../../infrastructure/excel/strategies/excel-parsing.strategy';

export interface CreateBatchInput {
  projectId: string;
  userId: string;
  mode: BatchMode;
  files: ExcelFileInput[];
  name?: string;
}

export interface CreateBatchResult {
  batchId: string;
  rowCount: number;
  mode: BatchMode;
  fileCount: number;
}

@Injectable()
export class CreateBatchUseCase {
  private readonly logger = new Logger(CreateBatchUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly ingestionService: IngestionService,
  ) {}

  @Transactional()
  public async execute(input: CreateBatchInput): Promise<CreateBatchResult> {
    // Step 1: Find project WITHOUT userId filter (enables separate 404/403)
    const project = await this.projectRepository.findByIdOnly(input.projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check if soft-deleted (specific error message per CONTEXT.md)
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 3: Validate ownership (403 with security audit log)
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized batch creation attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Delegate to IngestionService (all DB operations participate in THIS transaction)
    const result = await this.ingestionService.ingest({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      files: input.files,
      name: input.name,
    });

    // Step 5: Return summary
    return {
      batchId: result.batchId,
      rowCount: result.rowCount,
      mode: input.mode,
      fileCount: input.files.length,
    };
  }
}
