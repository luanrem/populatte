import {
  Step,
  StepAction,
  SelectorEntry,
} from '../../../../core/entities/step.entity';
import type { StepRow } from '../schema/steps.schema';

export class StepMapper {
  public static toDomain(row: StepRow): Step {
    return {
      id: row.id,
      mappingId: row.mappingId,
      action: row.action as StepAction,
      selector: row.selector as SelectorEntry,
      selectorFallbacks: (row.selectorFallbacks ?? []) as SelectorEntry[],
      sourceFieldKey: row.sourceFieldKey ?? null,
      fixedValue: row.fixedValue ?? null,
      stepOrder: row.stepOrder,
      optional: row.optional,
      clearBefore: row.clearBefore,
      pressEnter: row.pressEnter,
      waitMs: row.waitMs ?? null,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    };
  }
}
