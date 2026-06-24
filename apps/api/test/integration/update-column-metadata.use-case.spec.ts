import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { UpdateColumnMetadataUseCase } from '../../src/core/use-cases/batch/update-column-metadata.use-case';
import { BatchRepository } from '../../src/core/repositories/batch.repository';
import { ProjectRepository } from '../../src/core/repositories/project.repository';
import {
  Batch,
  BatchMode,
  BatchStatus,
  ColumnMetadata,
} from '../../src/core/entities/batch.entity';
import { ProjectStatus } from '../../src/core/entities/project.entity';
import type { Project } from '../../src/core/entities/project.entity';

const PROJECT_ID = 'project-123';
const USER_ID = 'user-456';
const BATCH_ID = 'batch-789';

const MOCK_PROJECT: Project = {
  id: PROJECT_ID,
  userId: USER_ID,
  name: 'Test Project',
  description: null,
  targetEntity: null,
  urls: [],
  status: ProjectStatus.Active,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

const COLUMNS: ColumnMetadata[] = [
  {
    label: 'A',
    originalHeader: 'A',
    normalizedKey: 'A',
    inferredType: 'string',
    position: 0,
  },
  {
    label: 'B',
    originalHeader: 'B',
    normalizedKey: 'B',
    inferredType: 'number',
    position: 1,
  },
];

function makeBatch(columnMetadata: ColumnMetadata[]): Batch {
  return {
    id: BATCH_ID,
    projectId: PROJECT_ID,
    userId: USER_ID,
    mode: BatchMode.ProfileMode,
    name: 'batch.xlsx',
    status: BatchStatus.Completed,
    fileCount: 1,
    rowCount: 1,
    columnMetadata,
    identifierFieldKey: null,
    secondaryFieldKey: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    deletedBy: null,
  };
}

describe('UpdateColumnMetadataUseCase', () => {
  let useCase: UpdateColumnMetadataUseCase;
  let batchRepository: {
    findById: jest.Mock;
    updateColumnMetadata: jest.Mock;
  };
  let projectRepository: { findByIdOnly: jest.Mock };
  let capturedMetadata: ColumnMetadata[] | undefined;

  beforeEach(() => {
    capturedMetadata = undefined;
    batchRepository = {
      findById: jest.fn().mockResolvedValue(makeBatch(COLUMNS)),
      updateColumnMetadata: jest
        .fn()
        .mockImplementation((_id: string, columnMetadata: ColumnMetadata[]) => {
          capturedMetadata = columnMetadata;
          return Promise.resolve(makeBatch(columnMetadata));
        }),
    };
    projectRepository = {
      findByIdOnly: jest.fn().mockResolvedValue(MOCK_PROJECT),
    };
    useCase = new UpdateColumnMetadataUseCase(
      batchRepository as unknown as BatchRepository,
      projectRepository as unknown as ProjectRepository,
    );
  });

  it('relabels an existing key and persists the merged metadata', async () => {
    const result = await useCase.execute(PROJECT_ID, BATCH_ID, USER_ID, [
      { normalizedKey: 'B', label: 'Produção (t)' },
    ]);

    expect(batchRepository.updateColumnMetadata).toHaveBeenCalledTimes(1);
    expect(capturedMetadata).toEqual([
      {
        label: 'A',
        originalHeader: 'A',
        normalizedKey: 'A',
        inferredType: 'string',
        position: 0,
      },
      {
        label: 'Produção (t)',
        originalHeader: 'B',
        normalizedKey: 'B',
        inferredType: 'number',
        position: 1,
      },
    ]);
    expect(result.columnMetadata[1]?.label).toBe('Produção (t)');
  });

  it('rejects an unknown normalizedKey (immutability guard)', async () => {
    await expect(
      useCase.execute(PROJECT_ID, BATCH_ID, USER_ID, [
        { normalizedKey: 'Z', label: 'nope' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(batchRepository.updateColumnMetadata).not.toHaveBeenCalled();
  });

  it('rejects duplicate keys in the request', async () => {
    await expect(
      useCase.execute(PROJECT_ID, BATCH_ID, USER_ID, [
        { normalizedKey: 'A', label: 'one' },
        { normalizedKey: 'A', label: 'two' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(batchRepository.updateColumnMetadata).not.toHaveBeenCalled();
  });

  it('throws NotFound when the project does not exist', async () => {
    projectRepository.findByIdOnly.mockResolvedValue(null);
    await expect(
      useCase.execute(PROJECT_ID, BATCH_ID, USER_ID, [
        { normalizedKey: 'A', label: 'x' },
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Forbidden when the project belongs to another user', async () => {
    projectRepository.findByIdOnly.mockResolvedValue({
      ...MOCK_PROJECT,
      userId: 'someone-else',
    });
    await expect(
      useCase.execute(PROJECT_ID, BATCH_ID, USER_ID, [
        { normalizedKey: 'A', label: 'x' },
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFound when the batch is not in the project', async () => {
    batchRepository.findById.mockResolvedValue({
      ...makeBatch(COLUMNS),
      projectId: 'other-project',
    });
    await expect(
      useCase.execute(PROJECT_ID, BATCH_ID, USER_ID, [
        { normalizedKey: 'A', label: 'x' },
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
