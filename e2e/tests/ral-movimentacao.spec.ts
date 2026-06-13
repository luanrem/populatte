import { test, expect } from '@playwright/test';

import { runEngine, fillStep } from './_engine';

/**
 * Trilho 1 — RAL fixture (real DOM from the IE-exported .mhtml snapshot of
 * "Movimentação da Produção Bruta", converted by scripts/convert-mhtml.mjs).
 *
 * Two of these tests are GAP MARKERS (test.fail): they assert the DESIRED behavior
 * that the engine does NOT yet produce. They document the F2 gaps (US-2.1 radio-by-value,
 * US-2.2 pt-BR decimals). When the fixes land, these tests start PASSING — Playwright
 * then flags the test.fail() as an "unexpected pass", the signal to remove the marker.
 */
const FIXTURE = '/e2e/fixtures/generated/ral-movimentacao.html';

const GRID_CELL = 'input[name$="$ctl02$ProducaoTonelada"]'; // Jan / Produção (t)
const SINAL_PLUS = 'input[name$="rblSinal"][value="+"]';

test.describe('RAL: Movimentação da Produção Bruta', () => {
  test('structure: a plain text grid cell fills on the real DOM (pre-formatted pt-BR)', async ({ page }) => {
    await page.goto(FIXTURE);

    const steps = [fillStep({ id: 'g1', selector: { type: 'css', value: GRID_CELL }, fixedValue: '1.234,56' })];
    const result = await runEngine(page, steps, {});

    expect(result.success).toBe(true);
    await expect(page.locator(GRID_CELL)).toHaveValue('1.234,56');
  });

  test.fail('GAP US-2.2: numeric row value should be formatted as pt-BR decimal', async ({ page }) => {
    await page.goto(FIXTURE);

    // row carries a real JS number; the engine currently does String(1500.5) -> "1500.5"
    const steps = [fillStep({ id: 'g1', selector: { type: 'css', value: GRID_CELL }, sourceFieldKey: 'qtd' })];
    await runEngine(page, steps, { qtd: 1500.5 });

    // DESIRED (fails today): RAL expects "1.500,50"
    await expect(page.locator(GRID_CELL)).toHaveValue('1.500,50');
  });

  test.fail('GAP US-2.1: filling rblSinal with "+" should SELECT the matching radio', async ({ page }) => {
    await page.goto(FIXTURE);

    // engine treats radio as truthy-check; "+" is not truthy -> leaves it unchecked
    const steps = [fillStep({ id: 'r1', selector: { type: 'css', value: SINAL_PLUS }, fixedValue: '+' })];
    await runEngine(page, steps, {});

    // DESIRED (fails today): the "+" radio is selected
    await expect(page.locator(SINAL_PLUS)).toBeChecked();
  });
});
