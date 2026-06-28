import { expect, test } from '@playwright/test';

// Fast cooking time so the 10s flow runs quickly and deterministically.
const FAST = '/?processMs=400';

test('a new normal order appears in the pending area', async ({ page }) => {
  await page.goto(FAST);
  await page.getByRole('button', { name: 'New Normal Order' }).click();

  const pending = page.getByRole('region', { name: 'Pending' });
  await expect(pending.locator('.order-card')).toHaveCount(1);
  await expect(pending.locator('.order-card').first()).toContainText('#1');
});

test('a VIP order queues ahead of an existing normal order', async ({ page }) => {
  await page.goto(FAST);
  await page.getByRole('button', { name: 'New Normal Order' }).click(); // #1 normal
  await page.getByRole('button', { name: 'New VIP Order' }).click(); // #2 vip

  const cards = page.getByRole('region', { name: 'Pending' }).locator('.order-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('#2'); // VIP jumps in front
  await expect(cards.nth(0)).toContainText('VIP');
  await expect(cards.nth(1)).toContainText('#1');
});

test('a bot cooks an order and it flows into the complete area', async ({ page }) => {
  await page.goto(FAST);
  await page.getByRole('button', { name: 'New Normal Order' }).click();
  await page.getByRole('button', { name: 'Add bot' }).click();

  const complete = page.getByRole('region', { name: 'Complete' });
  await expect(complete.locator('.order-card').first()).toContainText('#1', { timeout: 5000 });
});

test('the VIP order is cooked before the normal order', async ({ page }) => {
  await page.goto(FAST);
  await page.getByRole('button', { name: 'New Normal Order' }).click(); // #1 normal
  await page.getByRole('button', { name: 'New VIP Order' }).click(); // #2 vip
  await page.getByRole('button', { name: 'Add bot' }).click();

  // The first card to land in Complete should be the VIP (#2).
  const complete = page.getByRole('region', { name: 'Complete' });
  await expect(complete.locator('.order-card').first()).toContainText('#2', { timeout: 5000 });
});

test('removing a bot returns its order to the pending area', async ({ page }) => {
  await page.goto('/?processMs=10000'); // slow, so we can catch it mid-cook
  await page.getByRole('button', { name: 'New Normal Order' }).click();
  await page.getByRole('button', { name: 'Add bot' }).click();

  const pending = page.getByRole('region', { name: 'Pending' });
  await expect(pending.locator('.order-card')).toHaveCount(0); // now cooking on the bot

  await page.getByRole('button', { name: 'Remove bot' }).click();
  await expect(pending.locator('.order-card')).toHaveCount(1); // back in pending
  await expect(pending.locator('.order-card').first()).toContainText('#1');
});
