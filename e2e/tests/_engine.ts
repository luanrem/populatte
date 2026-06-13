import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

/** The bundled REAL fill engine (window.PopulatteEngine.executeSteps). */
const engineSource = readFileSync(resolve(__dirname, '../dist/engine.global.js'), 'utf-8');

export interface FillStepLike {
  id: string;
  stepOrder: number;
  action: 'fill' | 'click' | 'wait';
  selector: { type: 'css' | 'xpath'; value: string };
  selectorFallbacks: { type: 'css' | 'xpath'; value: string }[];
  // Production shape: the extension maps API null -> undefined (apps/extension/src/api/mappings.ts),
  // and the engine's getStepValue distinguishes undefined (absent) from a real key. Mocks MUST
  // omit these (undefined), never use null, or getStepValue takes the wrong branch.
  sourceFieldKey?: string;
  fixedValue?: string;
  optional: boolean;
  clearBefore: boolean;
  pressEnter: boolean;
  waitMs: number | null;
}

export interface ExecutionResultLike {
  success: boolean;
  stepResults: { stepId: string; success: boolean; skipped?: boolean; error?: string }[];
}

/** Inject the real engine into the page and run executeSteps with a mock mapping + row. */
export async function runEngine(
  page: Page,
  steps: FillStepLike[],
  rowData: Record<string, unknown>,
): Promise<ExecutionResultLike> {
  await page.addScriptTag({ content: engineSource });
  return page.evaluate(
    ([s, r]) =>
      (window as unknown as {
        PopulatteEngine: { executeSteps: (a: unknown, b: unknown) => Promise<ExecutionResultLike> };
      }).PopulatteEngine.executeSteps(s, r),
    [steps, rowData] as const,
  );
}

/** Convenience builder for a fill step with sensible defaults. */
export function fillStep(partial: Partial<FillStepLike> & { id: string; selector: FillStepLike['selector'] }): FillStepLike {
  return {
    stepOrder: 1,
    action: 'fill',
    selectorFallbacks: [],
    optional: false,
    clearBefore: true,
    pressEnter: false,
    waitMs: null,
    ...partial,
  };
}
