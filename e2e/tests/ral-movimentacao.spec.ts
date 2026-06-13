import { test, expect } from '@playwright/test';

import { runEngine, fillStep } from './_engine';

/**
 * Trilho 1 — RAL fixture (real DOM from the IE-exported .mhtml snapshot of
 * "Movimentação da Produção Bruta", converted by scripts/convert-mhtml.mjs).
 *
 * Exercises the REAL engine, including the F2 fixes:
 *  - US-2.1 radio-by-value (rblSinal +/-)
 *  - US-2.2 pt-BR decimal (number -> comma)
 */
const FIXTURE = '/e2e/fixtures/generated/ral-movimentacao.html';

const GRID_CELL = 'input[name$="$ctl02$ProducaoTonelada"]'; // Jan / Produção (t)
const SINAL_GROUP = 'input[type="radio"][name$="rblSinal"]'; // selector matches the group
const SINAL_PLUS = 'input[name$="rblSinal"][value="+"]';
const SINAL_MINUS = 'input[name$="rblSinal"][value="-"]';

test.describe('RAL: Movimentação da Produção Bruta', () => {
  test('structure: a plain text grid cell fills on the real DOM (pre-formatted pt-BR)', async ({ page }) => {
    await page.goto(FIXTURE);

    await runEngine(page, [fillStep({ id: 'g1', selector: { type: 'css', value: GRID_CELL }, fixedValue: '1.234,56' })], {});

    await expect(page.locator(GRID_CELL)).toHaveValue('1.234,56');
  });

  test('US-2.2: numeric row value is filled with pt-BR comma decimal', async ({ page }) => {
    await page.goto(FIXTURE);

    // row carries a real JS number (profile mode stores cell.v raw)
    await runEngine(page, [fillStep({ id: 'g1', selector: { type: 'css', value: GRID_CELL }, sourceFieldKey: 'qtd' })], { qtd: 1500.5 });

    await expect(page.locator(GRID_CELL)).toHaveValue('1500,5');
  });

  test('US-2.2: integer fills without grouping or forced decimals; pre-formatted string passes through', async ({ page }) => {
    await page.goto(FIXTURE);

    await runEngine(page, [fillStep({ id: 'g1', selector: { type: 'css', value: GRID_CELL }, sourceFieldKey: 'qtd' })], { qtd: 2024 });
    await expect(page.locator(GRID_CELL)).toHaveValue('2024');

    await runEngine(page, [fillStep({ id: 'g2', selector: { type: 'css', value: GRID_CELL }, sourceFieldKey: 'qtd' })], { qtd: '1.500,50' });
    await expect(page.locator(GRID_CELL)).toHaveValue('1.500,50');
  });

  test('US-2.1: radio-by-value selects the option matching the data value', async ({ page }) => {
    await page.goto(FIXTURE);

    // selector matches the group; value "+" selects the matching option
    await runEngine(page, [fillStep({ id: 'r1', selector: { type: 'css', value: SINAL_GROUP }, fixedValue: '+' })], {});
    await expect(page.locator(SINAL_PLUS)).toBeChecked();

    // value "-" now selects "-" and unchecks "+"
    await runEngine(page, [fillStep({ id: 'r2', selector: { type: 'css', value: SINAL_GROUP }, fixedValue: '-' })], {});
    await expect(page.locator(SINAL_MINUS)).toBeChecked();
    await expect(page.locator(SINAL_PLUS)).not.toBeChecked();
  });

  test('US-2.1: a value with no matching radio option fails clearly', async ({ page }) => {
    await page.goto(FIXTURE);

    const result = await runEngine(page, [fillStep({ id: 'r1', selector: { type: 'css', value: SINAL_GROUP }, fixedValue: 'X' })], {});

    expect(result.success).toBe(false);
    expect(result.stepResults[0]?.error).toContain('No radio option matching value');
  });
});
