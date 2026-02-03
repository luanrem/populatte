import { Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import {
  CreateStepData,
  Step,
  UpdateStepData,
} from '../../../../core/entities/step.entity';
import { StepRepository } from '../../../../core/repositories/step.repository';
import { DrizzleService } from '../drizzle.service';
import { steps } from '../schema';
import { StepMapper } from '../mappers/step.mapper';

@Injectable()
export class DrizzleStepRepository extends StepRepository {
  public constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  public async findById(id: string): Promise<Step | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(steps)
      .where(eq(steps.id, id))
      .limit(1);

    const row = result[0];
    return row ? StepMapper.toDomain(row) : null;
  }

  public async findByMappingId(mappingId: string): Promise<Step[]> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(steps)
      .where(eq(steps.mappingId, mappingId))
      .orderBy(asc(steps.stepOrder));

    return result.map((row) => StepMapper.toDomain(row));
  }

  public async create(data: CreateStepData): Promise<Step> {
    const result = await this.drizzle
      .getClient()
      .insert(steps)
      .values({
        mappingId: data.mappingId,
        action: data.action,
        selector: data.selector,
        selectorFallbacks: data.selectorFallbacks ?? [],
        sourceFieldKey: data.sourceFieldKey ?? null,
        fixedValue: data.fixedValue ?? null,
        stepOrder: data.stepOrder,
        optional: data.optional ?? false,
        clearBefore: data.clearBefore ?? false,
        pressEnter: data.pressEnter ?? false,
        waitMs: data.waitMs ?? null,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to create step');
    }

    return StepMapper.toDomain(row);
  }

  public async update(id: string, data: UpdateStepData): Promise<Step | null> {
    const result = await this.drizzle
      .getClient()
      .update(steps)
      .set({
        ...(data.action !== undefined && { action: data.action }),
        ...(data.selector !== undefined && { selector: data.selector }),
        ...(data.selectorFallbacks !== undefined && {
          selectorFallbacks: data.selectorFallbacks,
        }),
        ...(data.sourceFieldKey !== undefined && {
          sourceFieldKey: data.sourceFieldKey,
        }),
        ...(data.fixedValue !== undefined && { fixedValue: data.fixedValue }),
        ...(data.stepOrder !== undefined && { stepOrder: data.stepOrder }),
        ...(data.optional !== undefined && { optional: data.optional }),
        ...(data.clearBefore !== undefined && {
          clearBefore: data.clearBefore,
        }),
        ...(data.pressEnter !== undefined && { pressEnter: data.pressEnter }),
        ...(data.waitMs !== undefined && { waitMs: data.waitMs }),
        updatedAt: new Date(),
      })
      .where(eq(steps.id, id))
      .returning();

    const row = result[0];
    return row ? StepMapper.toDomain(row) : null;
  }

  public async delete(id: string): Promise<void> {
    await this.drizzle.getClient().delete(steps).where(eq(steps.id, id));
  }

  public async reorder(
    mappingId: string,
    orderedStepIds: string[],
  ): Promise<void> {
    for (let i = 0; i < orderedStepIds.length; i++) {
      const stepId = orderedStepIds[i];
      if (stepId !== undefined) {
        await this.drizzle
          .getClient()
          .update(steps)
          .set({ stepOrder: i + 1, updatedAt: new Date() })
          .where(and(eq(steps.id, stepId), eq(steps.mappingId, mappingId)));
      }
    }
  }
}
