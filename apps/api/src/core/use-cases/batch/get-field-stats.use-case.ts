import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { GetFieldStatsResult } from '../../entities/field-stats.entity';
import { InferredType } from '../../entities/field-stats.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';
import { RowRepository } from '../../repositories/row.repository';
import { TypeInferenceService } from '../../services/type-inference.service';

@Injectable()
export class GetFieldStatsUseCase {
  private readonly logger = new Logger(GetFieldStatsUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
    private readonly typeInferenceService: TypeInferenceService,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
  ): Promise<GetFieldStatsResult> {
    // Step 1: Find project WITHOUT userId filter (enables separate 404/403)
    const project = await this.projectRepository.findByIdOnly(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check if soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 3: Validate ownership (403 with security audit log)
    if (project.userId !== userId) {
      this.logger.warn(
        `Unauthorized batch access attempt - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find batch
    const batch = await this.batchRepository.findById(batchId);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Step 5: Defense-in-depth - verify batch belongs to project
    if (batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // Step 6: Count total rows in batch
    const totalRows = await this.rowRepository.countByBatchId(batchId);

    // Step 7: Zero-row edge case
    if (totalRows === 0) {
      return {
        totalRows: 0,
        fields: batch.columnMetadata.map((col) => ({
          fieldName: col.normalizedKey,
          presenceCount: 0,
          uniqueCount: 0,
          inferredType: InferredType.UNKNOWN,
          confidence: 0,
          sampleValues: [],
        })),
      };
    }

    // Step 8: Get field aggregations (presence/unique counts)
    const aggregations =
      await this.batchRepository.getFieldAggregations(batchId);

    // Step 9: Get sample rows for type inference
    const sampleRows = await this.rowRepository.getSampleRows(batchId, 100);

    // Step 10: For each field, infer type and extract sample values
    const fields = aggregations.map((agg) => {
      // Extract samples for this field from sample rows
      const samples = sampleRows
        .map((row) => row.data[agg.fieldName])
        .filter((value) => {
          if (value === null || value === undefined) {
            return false;
          }
          if (typeof value === 'string' && value.trim() === '') {
            return false;
          }
          return true;
        });

      // Infer type from samples
      const typeInference = this.typeInferenceService.inferType(samples);

      // Extract first 3 distinct non-empty values as sample values
      const distinctValues = new Set<unknown>();
      for (const value of samples) {
        if (distinctValues.size >= 3) {
          break;
        }
        distinctValues.add(value);
      }
      const sampleValues = Array.from(distinctValues);

      return {
        fieldName: agg.fieldName,
        presenceCount: agg.presenceCount,
        uniqueCount: agg.uniqueCount,
        inferredType: typeInference.type,
        confidence: typeInference.confidence,
        sampleValues,
      };
    });

    return {
      totalRows,
      fields,
    };
  }
}
