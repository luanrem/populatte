import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import type { Step } from '../../core/entities/step.entity';
import type { User } from '../../core/entities/user.entity';
import {
  CreateStepUseCase,
  DeleteStepUseCase,
  ReorderStepsUseCase,
  UpdateStepUseCase,
} from '../../core/use-cases/step';
import { DualAuthGuard } from '../../infrastructure/auth/guards/dual-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  createStepSchema,
  reorderStepsSchema,
  updateStepSchema,
  type CreateStepDto,
  type ReorderStepsDto,
  type UpdateStepDto,
} from '../dto/step.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller('mappings/:mappingId/steps')
@UseGuards(DualAuthGuard)
export class StepController {
  public constructor(
    private readonly createStep: CreateStepUseCase,
    private readonly updateStep: UpdateStepUseCase,
    private readonly deleteStep: DeleteStepUseCase,
    private readonly reorderSteps: ReorderStepsUseCase,
  ) {}

  @Post()
  public async create(
    @Param('mappingId') mappingId: string,
    @Body(new ZodValidationPipe(createStepSchema)) body: CreateStepDto,
    @CurrentUser() user: User,
  ): Promise<Step> {
    return this.createStep.execute({
      mappingId,
      userId: user.id,
      action: body.action,
      selector: body.selector,
      selectorFallbacks: body.selectorFallbacks,
      sourceFieldKey: body.sourceFieldKey,
      fixedValue: body.fixedValue,
      optional: body.optional,
      clearBefore: body.clearBefore,
      pressEnter: body.pressEnter,
      waitMs: body.waitMs,
    });
  }

  @Patch(':stepId')
  public async update(
    @Param('mappingId') mappingId: string,
    @Param('stepId') stepId: string,
    @Body(new ZodValidationPipe(updateStepSchema)) body: UpdateStepDto,
    @CurrentUser() user: User,
  ): Promise<Step> {
    return this.updateStep.execute({
      stepId,
      mappingId,
      userId: user.id,
      action: body.action,
      selector: body.selector,
      selectorFallbacks: body.selectorFallbacks,
      sourceFieldKey: body.sourceFieldKey,
      fixedValue: body.fixedValue,
      optional: body.optional,
      clearBefore: body.clearBefore,
      pressEnter: body.pressEnter,
      waitMs: body.waitMs,
    });
  }

  @Delete(':stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(
    @Param('mappingId') mappingId: string,
    @Param('stepId') stepId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.deleteStep.execute({
      stepId,
      mappingId,
      userId: user.id,
    });
  }

  @Put('reorder')
  public async reorder(
    @Param('mappingId') mappingId: string,
    @Body(new ZodValidationPipe(reorderStepsSchema)) body: ReorderStepsDto,
    @CurrentUser() user: User,
  ): Promise<Step[]> {
    return this.reorderSteps.execute({
      mappingId,
      userId: user.id,
      orderedStepIds: body.orderedStepIds,
    });
  }
}
