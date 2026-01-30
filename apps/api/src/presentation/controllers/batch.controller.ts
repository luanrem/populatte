import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import type { User } from '../../core/entities/user.entity';
import { CreateBatchUseCase } from '../../core/use-cases/batch';
import type { ExcelFileInput } from '../../infrastructure/excel/strategies/excel-parsing.strategy';
import { ClerkAuthGuard } from '../../infrastructure/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { createBatchSchema, type CreateBatchDto } from '../dto/batch.dto';

@Controller('projects/:projectId/batches')
@UseGuards(ClerkAuthGuard)
export class BatchController {
  public constructor(private readonly createBatch: CreateBatchUseCase) {}

  @Post()
  @UseInterceptors(FilesInterceptor('documents', 20))
  public async create(
    @Param('projectId') projectId: string,
    @Body('mode') mode: string,
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    // Validate mode field with Zod
    let validated: CreateBatchDto;
    try {
      validated = createBatchSchema.parse({ mode });
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as {
          issues: Array<{ path: string[]; message: string }>;
        };
        const errors = zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        throw new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      }
      throw error;
    }

    // Validate file presence
    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    // Transform Express.Multer.File[] to ExcelFileInput[]
    const files: ExcelFileInput[] = uploadedFiles.map((file) => ({
      buffer: file.buffer,
      originalName: file.originalname,
    }));

    // Delegate to use case
    return this.createBatch.execute({
      projectId,
      userId: user.id,
      mode: validated.mode,
      files,
    });
  }
}
