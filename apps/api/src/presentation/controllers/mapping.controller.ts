import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { User } from '../../core/entities/user.entity';
import {
  CreateMappingUseCase,
  DeleteMappingUseCase,
  GetMappingUseCase,
  ListMappingsUseCase,
  UpdateMappingUseCase,
} from '../../core/use-cases/mapping';
import { DualAuthGuard } from '../../infrastructure/auth/guards/dual-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  createMappingSchema,
  listMappingsQuerySchema,
  updateMappingSchema,
  type CreateMappingDto,
  type ListMappingsQueryDto,
  type UpdateMappingDto,
} from '../dto/mapping.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller('projects/:projectId/mappings')
@UseGuards(DualAuthGuard)
export class MappingController {
  public constructor(
    private readonly createMapping: CreateMappingUseCase,
    private readonly listMappings: ListMappingsUseCase,
    private readonly getMapping: GetMappingUseCase,
    private readonly updateMapping: UpdateMappingUseCase,
    private readonly deleteMapping: DeleteMappingUseCase,
  ) {}

  @Post()
  public async create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createMappingSchema)) body: CreateMappingDto,
    @CurrentUser() user: User,
  ) {
    return this.createMapping.execute({
      projectId,
      userId: user.id,
      name: body.name,
      targetUrl: body.targetUrl,
      successTrigger: body.successTrigger,
      successConfig: body.successConfig,
    });
  }

  @Get()
  public async list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(listMappingsQuerySchema))
    query: ListMappingsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.listMappings.execute(
      projectId,
      user.id,
      query.limit,
      query.offset,
      query.targetUrl,
      query.isActive,
    );
  }

  @Get(':mappingId')
  public async getById(
    @Param('projectId') projectId: string,
    @Param('mappingId') mappingId: string,
    @CurrentUser() user: User,
  ) {
    return this.getMapping.execute(projectId, mappingId, user.id);
  }

  @Patch(':mappingId')
  public async update(
    @Param('projectId') projectId: string,
    @Param('mappingId') mappingId: string,
    @Body(new ZodValidationPipe(updateMappingSchema)) body: UpdateMappingDto,
    @CurrentUser() user: User,
  ) {
    return this.updateMapping.execute({
      projectId,
      mappingId,
      userId: user.id,
      name: body.name,
      targetUrl: body.targetUrl,
      isActive: body.isActive,
      successTrigger: body.successTrigger,
      successConfig: body.successConfig,
    });
  }

  @Delete(':mappingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(
    @Param('projectId') projectId: string,
    @Param('mappingId') mappingId: string,
    @CurrentUser() user: User,
  ) {
    await this.deleteMapping.execute({
      projectId,
      mappingId,
      userId: user.id,
    });
  }
}
