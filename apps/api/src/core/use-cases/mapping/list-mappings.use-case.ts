import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';

export interface MappingListItem {
  id: string;
  name: string;
  targetUrl: string;
  isActive: boolean;
  stepCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListMappingsResult {
  items: MappingListItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListMappingsUseCase {
  private readonly logger = new Logger(ListMappingsUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mappingRepository: MappingRepository,
  ) {}

  public async execute(
    projectId: string,
    userId: string,
    limit: number,
    offset: number,
    targetUrl?: string,
    isActive?: boolean,
  ): Promise<ListMappingsResult> {
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
        `Unauthorized mapping list attempt - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Get paginated mappings with optional filters
    const result = await this.mappingRepository.findByProjectIdPaginated(
      projectId,
      limit,
      offset,
      targetUrl,
      isActive,
    );

    // Step 5: For each mapping, count steps (parallelized with Promise.all)
    const mappingsWithStepCount = await Promise.all(
      result.items.map(async (mapping) => {
        const stepCount = await this.mappingRepository.countStepsByMappingId(
          mapping.id,
        );
        return {
          id: mapping.id,
          name: mapping.name,
          targetUrl: mapping.targetUrl,
          isActive: mapping.isActive,
          stepCount,
          createdAt: mapping.createdAt,
          updatedAt: mapping.updatedAt,
        };
      }),
    );

    // Step 6: Calculate page from offset (1-indexed)
    const page = Math.floor(offset / limit) + 1;

    return {
      items: mappingsWithStepCount,
      total: result.total,
      page,
      limit,
    };
  }
}
