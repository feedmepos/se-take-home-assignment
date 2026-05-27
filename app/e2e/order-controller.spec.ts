import { expect, test } from '@playwright/test'

test('VIP orders stay ahead of normal orders across role changes', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'New Normal Order' }).click()
  await page.getByRole('button', { name: 'New Normal Order' }).click()
  await page.getByRole('tab', { name: 'VIP Member' }).click()
  await page.getByRole('button', { name: 'New VIP Order' }).click()

  const pendingCards = page.getByTestId('pending-orders').getByRole('article')

  await expect(pendingCards.nth(0)).toContainText('Order #3')
  await expect(pendingCards.nth(1)).toContainText('Order #1')
  await expect(pendingCards.nth(2)).toContainText('Order #2')
})

test('a bot processes one order, completes it, and then idles', async ({ page }) => {
  test.setTimeout(20_000)

  await page.goto('/')
  await page.getByRole('button', { name: 'New Normal Order' }).click()
  await page.getByRole('tab', { name: 'Manager' }).click()
  await page.getByRole('button', { name: '+ Bot' }).click()

  await expect(page.getByTestId('pending-count')).toHaveText('0')
  await expect(page.getByTestId('bot-1')).toContainText('PROCESSING')
  await expect(page.getByTestId('bot-1')).toContainText('Processing Order #1')

  await expect(page.getByTestId('complete-orders')).toContainText('Order #1', {
    timeout: 12_000,
  })
  await expect(page.getByTestId('bot-1')).toContainText('IDLE')
})

test('removing the newest working bot returns that order to pending', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Normal Order' }).click()
  await page.getByRole('button', { name: 'New Normal Order' }).click()
  await page.getByRole('tab', { name: 'Manager' }).click()
  await page.getByRole('button', { name: '+ Bot' }).click()
  await page.getByRole('button', { name: '+ Bot' }).click()
  await page.getByRole('button', { name: '- Bot' }).click()

  await expect(page.getByTestId('bot-list')).not.toContainText('Bot #2')
  await expect(page.getByTestId('pending-orders')).toContainText('Order #2')
  await expect(page.getByTestId('bot-1')).toContainText('Processing Order #1')
})
