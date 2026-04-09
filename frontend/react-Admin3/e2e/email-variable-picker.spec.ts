import { test, expect } from '@playwright/test';

test('email variable picker — scalar + array-element happy path', async ({ page }) => {
  // 1. Open an email template in the admin
  await page.goto('/admin/email/templates/1/edit');

  // Open the MJML Editor tab — this is where the basic-mode toolbar lives
  await page.getByRole('tab', { name: 'MJML Editor' }).click();

  // Wait for the toolbar button to be ready (ensures form + vm loaded)
  const insertVariableBtn = page.getByTitle('Insert Variable');
  await expect(insertVariableBtn).toBeVisible({ timeout: 15000 });

  // 2. Click the variable button in the basic-mode toolbar
  await insertVariableBtn.click();

  // 3. Type "fir" — assert user.firstname visible & match highlighted
  const filter = page.getByPlaceholder(/filter/i);
  await expect(filter).toBeVisible();
  await filter.fill('fir');

  const firstNameRow = page.getByTestId('variable-row-user.firstname');
  await expect(firstNameRow).toBeVisible();
  await expect(firstNameRow.locator('mark')).toContainText('fir');

  // 4. Click the leaf — assert {{ user.firstname }} present in editor
  await firstNameRow.click();
  const editor = page.locator('.cm-content');
  await expect(editor).toContainText('{{ user.firstname }}');

  // 5. Re-open picker, drill to order.items[].amount.vat, pick it
  await insertVariableBtn.click();
  // Clear any residual filter
  await filter.fill('');

  await page.getByTestId('variable-row-order').click();
  await page.getByTestId('variable-row-order.items[]').click();
  await page.getByTestId('variable-row-order.items[].amount').click();
  await page.getByTestId('variable-row-order.items[].amount.vat').click();

  // 6. AlertDialog appears → click "Insert as loop"
  const alert = page.getByRole('alertdialog');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/"order\.items" is an array/);
  await alert.getByRole('button', { name: /Insert as loop/i }).click();

  // 7. Full loop block present in editor
  await expect(editor).toContainText('{% for item in order.items %}');
  await expect(editor).toContainText('{{ item.amount.vat }}');
  await expect(editor).toContainText('{% endfor %}');
});
