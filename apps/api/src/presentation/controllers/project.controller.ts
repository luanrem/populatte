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
  UseGuards,
} from '@nestjs/common';

import type { User } from '../../core/entities/user.entity';
import {
  CreateProjectUseCase,
  ListProjectsUseCase,
  GetProjectUseCase,
  UpdateProjectUseCase,
  DeleteProjectUseCase,
} from '../../core/use-cases/project';
import { ClerkAuthGuard } from '../../infrastructure/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectDto,
  type UpdateProjectDto,
} from '../dto/project.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller('projects')
@UseGuards(ClerkAuthGuard)
export class ProjectController {
  public constructor(
    private readonly createProject: CreateProjectUseCase,
    private readonly listProjects: ListProjectsUseCase,
    private readonly getProject: GetProjectUseCase,
    private readonly updateProject: UpdateProjectUseCase,
    private readonly deleteProject: DeleteProjectUseCase,
  ) {}

  @Post()
  public async create(
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.createProject.execute({
      userId: user.id,
      name: body.name,
      description: body.description,
      targetEntity: body.targetEntity,
      targetUrl: body.targetUrl,
    });
  }

  @Get()
  public async list(@CurrentUser() user: User) {
    return this.listProjects.execute(user.id);
  }

  @Get(':id')
  public async getById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.getProject.execute(id, user.id);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.updateProject.execute(id, user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.deleteProject.execute(id, user.id);
  }
}
