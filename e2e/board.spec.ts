import { expect, test } from '@playwright/test';

/**
 * Happy path: VIP order completes before Normal when both are pending and one
 * bot is added. Uses Playwright clock control — no fixed sleeps.
 *
 * page.clock intercepts the browser's Date, setTimeout, and setInterval so
 * the OrderController's injected systemScheduler (which delegates to those
 * globals) advances deterministically with fastForward().
 */
test('VIP order completes first; both orders reach COMPLETE', async ({ page }) => {
  // Install fake clock before navigation so the module-level controller
  // starts with mocked time from the very first render.
  await page.clock.install({ time: new Date('2024-01-01T12:00:00.000Z') });
  await page.goto('/');

  // Add a Normal order first, then a VIP order
  await page.getByRole('button', { name: 'New Normal Order' }).click();
  await page.getByRole('button', { name: 'New VIP Order' }).click();

  // Verify VIP is at the front of the PENDING column
  const pendingCards = page.locator('[data-testid="pending-card"]');
  await expect(pendingCards).toHaveCount(2);
  await expect(pendingCards.first()).toContainText('VIP');

  // Add one bot — it immediately picks up the VIP order (front of queue)
  await page.getByRole('button', { name: '+ Bot' }).click();

  // Advance clock 10s: VIP order completes
  await page.clock.fastForward(10_000);

  // VIP should now be in COMPLETE; Normal still pending or processing
  await expect(page.locator('[data-testid="complete-card"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="complete-card"]').first()).toContainText('VIP');

  // Advance another 10s: Normal order completes
  await page.clock.fastForward(10_000);

  // Both orders complete
  await expect(page.locator('[data-testid="complete-card"]')).toHaveCount(2);
  // VIP completed first so it appears before Normal in the list
  const completeCards = page.locator('[data-testid="complete-card"]');
  await expect(completeCards.first()).toContainText('VIP');
  await expect(completeCards.nth(1)).toContainText('NORMAL');

  // Both cards show a completion timestamp in HH:MM:SS format
  const timestamps = page.locator('[data-testid="completed-at"]');
  await expect(timestamps).toHaveCount(2);
  await expect(timestamps.first()).toHaveText(/\d{2}:\d{2}:\d{2}/);
});
