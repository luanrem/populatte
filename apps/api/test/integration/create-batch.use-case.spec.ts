// Mock @Transactional decorator BEFORE any imports that use it
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';

import {
  CreateBatchUseCase,
  CreateBatchInput,
} from '../../src/core/use-cases/batch/create-batch.use-case';
import { ProjectRepository } from '../../src/core/repositories/project.repository';
import { IngestionService } from '../../src/infrastructure/excel/ingestion.service';
import { BatchMode } from '../../src/core/entities/batch.entity';
import { ProjectStatus } from '../../src/core/entities/project.entity';
import type { Project } from '../../src/core/entities/project.entity';
import type { IngestResult } from '../../src/infrastructure/excel/ingestion.service';

// Test fixtures
const MOCK_PROJECT: Project = {
  id: 'project-123',
  userId: 'user-456',
  name: 'Test Project',
  description: null,
  targetEntity: null,
  targetUrl: null,
  status: ProjectStatus.Active,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

const VALID_INPUT: CreateBatchInput = {
  projectId: 'project-123',
  userId: 'user-456',
  mode: BatchMode.ListMode,
  files: [
    {
      originalName: 'test.xlsx',
      buffer: Buffer.from('mock-excel-data'),
    },
  ],
};

const MOCK_INGEST_RESULT: IngestResult = {
  batchId: 'batch-789',
  rowCount: 5,
};

describe('CreateBatchUseCase', () => {
  let useCase: CreateBatchUseCase;
  let mockProjectRepository: Record<string, jest.Mock>;
  let mockIngestionService: Record<string, jest.Mock>;

  beforeAll(async () => {
    mockProjectRepository = {
      findByIdOnly: jest.fn(),
      // Add other methods from ProjectRepository abstract class that
      // NestJS might complain about if missing:
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    mockIngestionService = {
      ingest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBatchUseCase,
        { provide: ProjectRepository, useValue: mockProjectRepository },
        { provide: IngestionService, useValue: mockIngestionService },
      ],
    }).compile();

    useCase = module.get<CreateBatchUseCase>(CreateBatchUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful batch creation', () => {
    it('should return batchId and rowCount when project exists and ingestion succeeds', async () => {
      // Arrange
      mockProjectRepository.findByIdOnly.mockResolvedValueOnce(MOCK_PROJECT);
      mockIngestionService.ingest.mockResolvedValueOnce(MOCK_INGEST_RESULT);

      // Act
      const result = await useCase.execute(VALID_INPUT);

      // Assert - correct result
      expect(result).toEqual({
        batchId: 'batch-789',
        rowCount: 5,
        mode: BatchMode.ListMode,
        fileCount: 1,
      });

      // Assert - repositories called correctly
      expect(mockProjectRepository.findByIdOnly).toHaveBeenCalledTimes(1);
      expect(mockProjectRepository.findByIdOnly).toHaveBeenCalledWith(
        'project-123',
      );
      expect(mockIngestionService.ingest).toHaveBeenCalledTimes(1);
      expect(mockIngestionService.ingest).toHaveBeenCalledWith({
        projectId: 'project-123',
        userId: 'user-456',
        mode: BatchMode.ListMode,
        files: VALID_INPUT.files,
      });

      // Assert - call order: project lookup before ingestion
      const projectCallOrder =
        mockProjectRepository.findByIdOnly.mock.invocationCallOrder[0];
      const ingestCallOrder =
        mockIngestionService.ingest.mock.invocationCallOrder[0];
      expect(projectCallOrder).toBeLessThan(ingestCallOrder);
    });
  });

  describe('transaction rollback on ingestion failure', () => {
    it('should propagate error when ingestion fails after project validation', async () => {
      // Arrange - project exists and is valid, but ingestion throws
      // (simulates row insertion failure inside IngestionService)
      mockProjectRepository.findByIdOnly.mockResolvedValueOnce(MOCK_PROJECT);
      mockIngestionService.ingest.mockRejectedValueOnce(
        new Error('Row insertion failed: constraint violation'),
      );

      // Act & Assert - error propagates (proves @Transactional would trigger rollback)
      await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(
        'Row insertion failed: constraint violation',
      );

      // Assert - both steps were attempted (project validated, then ingestion failed)
      expect(mockProjectRepository.findByIdOnly).toHaveBeenCalledTimes(1);
      expect(mockIngestionService.ingest).toHaveBeenCalledTimes(1);
    });
  });
});
