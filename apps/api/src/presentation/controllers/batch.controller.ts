import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import type { User } from '../../core/entities/user.entity';
import {
  CreateBatchUseCase,
  DeleteBatchUseCase,
  GetBatchUseCase,
  GetFieldStatsUseCase,
  GetFieldValuesUseCase,
  ListBatchesUseCase,
  ListRowsUseCase,
  UpdateBatchUseCase,
} from '../../core/use-cases/batch';
import { UpdateRowStatusUseCase } from '../../core/use-cases/row';
import type { ExcelFileInput } from '../../infrastructure/excel/strategies/excel-parsing.strategy';
import { DualAuthGuard } from '../../infrastructure/auth/guards/dual-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  createBatchSchema,
  fieldValuesQuerySchema,
  paginationQuerySchema,
  updateBatchSchema,
} from '../dto/batch.dto';
import type {
  FieldValuesQueryDto,
  PaginationQueryDto,
  UpdateBatchDto,
} from '../dto/batch.dto';
import { updateRowStatusSchema } from '../dto/row.dto';
import type { UpdateRowStatusDto } from '../dto/row.dto';
import { FileContentValidationPipe } from '../pipes/file-content-validation.pipe';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller('projects/:projectId/batches')
@UseGuards(DualAuthGuard)
export class BatchController {
  public constructor(
    private readonly createBatch: CreateBatchUseCase,
    private readonly deleteBatchUseCase: DeleteBatchUseCase,
    private readonly getBatch: GetBatchUseCase,
    private readonly getFieldStatsUseCase: GetFieldStatsUseCase,
    private readonly getFieldValuesUseCase: GetFieldValuesUseCase,
    private readonly listBatches: ListBatchesUseCase,
    private readonly listRowsUseCase: ListRowsUseCase,
    private readonly updateBatchUseCase: UpdateBatchUseCase,
    private readonly updateRowStatusUseCase: UpdateRowStatusUseCase,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('documents', 50, {
      limits: { fileSize: 5 * 1024 * 1024, files: 50 },
    }),
  )
  public async create(
    @Param('projectId') projectId: string,
    @Body('mode') mode: string,
    @UploadedFiles(new FileContentValidationPipe())
    uploadedFiles: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    // Validate mode field with Zod
    const result = createBatchSchema.safeParse({ mode });
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
    const validated = result.data;

    // Validate file presence
    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    // Transform Express.Multer.File[] to ExcelFileInput[]
    const files: ExcelFileInput[] = uploadedFiles.map((file) => ({
      buffer: file.buffer,
      originalName: file.originalname,
    }));

    // Extract original filename from first uploaded file
    const batchName = uploadedFiles[0]?.originalname;

    // Delegate to use case
    return this.createBatch.execute({
      projectId,
      userId: user.id,
      mode: validated.mode,
      files,
      name: batchName,
    });
  }

  @Get()
  public async list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.listBatches.execute(
      projectId,
      user.id,
      query.limit,
      query.offset,
    );
  }

  @Put(':batchId')
  public async update(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @Body(new ZodValidationPipe(updateBatchSchema)) body: UpdateBatchDto,
    @CurrentUser() user: User,
  ) {
    return this.updateBatchUseCase.execute(projectId, batchId, user.id, body);
  }

  @Patch(':batchId')
  public async patch(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @Body(new ZodValidationPipe(updateBatchSchema)) body: UpdateBatchDto,
    @CurrentUser() user: User,
  ) {
    return this.updateBatchUseCase.execute(projectId, batchId, user.id, body);
  }

  @Delete(':batchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: User,
  ) {
    await this.deleteBatchUseCase.execute(projectId, batchId, user.id);
  }

  @Get(':batchId')
  public async getById(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: User,
  ) {
    return this.getBatch.execute(projectId, batchId, user.id);
  }

  @Get(':batchId/rows')
  public async listRows(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.listRowsUseCase.execute(
      projectId,
      batchId,
      user.id,
      query.limit,
      query.offset,
    );
  }

  @Get(':batchId/field-stats')
  public async getFieldStats(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: User,
  ) {
    return this.getFieldStatsUseCase.execute(projectId, batchId, user.id);
  }

  @Get(':batchId/fields/:fieldKey/values')
  public async getFieldValues(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @Param('fieldKey') fieldKey: string,
    @Query(new ZodValidationPipe(fieldValuesQuerySchema))
    query: FieldValuesQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.getFieldValuesUseCase.execute(
      projectId,
      batchId,
      decodeURIComponent(fieldKey),
      user.id,
      query.limit,
      query.offset,
      query.search,
    );
  }

  @Patch(':batchId/rows/:rowId/status')
  public async updateRowStatus(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @Param('rowId') rowId: string,
    @Body(new ZodValidationPipe(updateRowStatusSchema))
    body: UpdateRowStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.updateRowStatusUseCase.execute(
      projectId,
      batchId,
      rowId,
      user.id,
      body,
    );
  }
}
