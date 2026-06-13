import { test, expect } from '@playwright/test';

import { runEngine, fillStep } from './_engine';

/**
 * Trilho 1 — synthetic forms. Exercises the REAL executeSteps engine against the
 * controlled HTML in docs/test-documents/. These should be fully GREEN today.
 */
test.describe('synthetic: formulario-simples', () => {
  test('fills all text fields via real executeSteps (sourceFieldKey + fixedValue)', async ({ page }) => {
    await page.goto('/docs/test-documents/formulario-simples.html');

    const steps = [
      fillStep({ id: 's1', stepOrder: 1, selector: { type: 'css', value: '#nome' }, sourceFieldKey: 'nome_completo' }),
      fillStep({ id: 's2', stepOrder: 2, selector: { type: 'css', value: '#email' }, sourceFieldKey: 'email' }),
      fillStep({ id: 's3', stepOrder: 3, selector: { type: 'css', value: '#telefone' }, sourceFieldKey: 'telefone' }),
      fillStep({ id: 's4', stepOrder: 4, selector: { type: 'css', value: '#cargo' }, fixedValue: 'Analista de Dados' }),
    ];
    const row = {
      nome_completo: 'Maria Aparecida da Silva',
      email: 'maria.silva@mineradora.com.br',
      telefone: '(31) 98877-6655',
    };

    const result = await runEngine(page, steps, row);

    expect(result.success).toBe(true);
    expect(result.stepResults.every((r) => r.success)).toBe(true);
    await expect(page.locator('#nome')).toHaveValue('Maria Aparecida da Silva');
    await expect(page.locator('#email')).toHaveValue('maria.silva@mineradora.com.br');
    await expect(page.locator('#telefone')).toHaveValue('(31) 98877-6655');
    await expect(page.locator('#cargo')).toHaveValue('Analista de Dados');
  });

  test('required step on a missing selector fails and aborts', async ({ page }) => {
    await page.goto('/docs/test-documents/formulario-simples.html');

    const steps = [
      fillStep({ id: 's1', stepOrder: 1, selector: { type: 'css', value: '#does-not-exist' }, fixedValue: 'x' }),
      fillStep({ id: 's2', stepOrder: 2, selector: { type: 'css', value: '#nome' }, fixedValue: 'never reached' }),
    ];

    const result = await runEngine(page, steps, {});

    expect(result.success).toBe(false);
    // required failure aborts -> second step never runs
    expect(result.stepResults).toHaveLength(1);
    await expect(page.locator('#nome')).toHaveValue('');
  });
});
