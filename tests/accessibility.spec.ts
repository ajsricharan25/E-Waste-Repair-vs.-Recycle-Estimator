import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('assessment and resources have no detected WCAG A or AA violations', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  async function checkPage() {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
  }

  await checkPage()
  await page.getByRole('button', { name: /Explore a washing machine example/ }).click()
  await checkPage()
  await page.getByRole('button', { name: 'Repair guidance', exact: true }).click()
  await checkPage()
  await page.getByRole('button', { name: 'Recycling value', exact: true }).click()
  await checkPage()

  const menu = page.getByRole('button', { name: 'Open navigation' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation').getByRole('button', { name: 'Repair resources' }).click()
  await checkPage()
})
