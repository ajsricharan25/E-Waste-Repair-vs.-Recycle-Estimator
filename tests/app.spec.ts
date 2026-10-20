import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openNavigation(page: Page, name: string | RegExp) {
  const menu = page.getByRole('button', { name: 'Open navigation' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation').getByRole('button', { name }).click()
}

async function useExample(page: Page) {
  await page.getByRole('button', { name: /Explore a washing machine example/ }).click()
  await expect(
    page.getByRole('heading', { name: 'A clearer picture of what’s next.' }),
  ).toBeVisible()
}

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('example gives an actionable estimate with repair and material details', async ({ page }) => {
  await useExample(page)
  await expect(page.getByRole('heading', { name: 'A repair looks worth exploring' })).toBeVisible()
  await expect(
    page.getByText('Possible drain filter blockage or pump fault', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Estimated repair', { exact: true })).toBeVisible()
  await expect(page.getByText('₹1,200', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Repair guidance', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check the external drain hose' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Look up model-specific repair guides' }),
  ).toHaveAttribute('href', /ifixit\.com\/Search\?query=Washing%20machine/)

  await page.getByRole('button', { name: 'Recycling value', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'There’s value in what’s inside.' })).toBeVisible()
  await expect(page.getByText('Steel', { exact: true })).toBeVisible()
  await expect(page.getByText('35 kg', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Your estimate', exact: true }).click()
  await expect(
    page.getByText('Possible drain filter blockage or pump fault', { exact: true }),
  ).toBeVisible()
})

test('device selection, symptom suggestions, currency, and editing work together', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Laptop', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Laptop', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Running slowly', exact: true }).click()
  await expect(page.getByLabel('What seems to be the problem?')).toHaveValue('Running slowly')
  await page.getByLabel('Estimate in').selectOption('USD')
  await page.getByLabel('Replacement budget', { exact: false }).fill('1000')
  await page.getByRole('button', { name: 'Explore my options' }).click()

  await expect(page.getByRole('heading', { name: 'Laptop', exact: true })).toBeVisible()
  await expect(
    page.getByText('Possible storage, memory, or software bottleneck', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('3 years old · USD estimates', { exact: true })).toBeVisible()
  await expect(page.getByText('$1,000', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit details' }).click()
  await expect(page.getByLabel('What seems to be the problem?')).toHaveValue('Running slowly')
  await expect(page.getByLabel('Replacement budget', { exact: false })).toHaveValue('1000')
  await expect(page.getByLabel('Estimate in')).toHaveValue('USD')
})

test('hazardous battery symptoms require professional handling instead of routine repair guidance', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Phone', exact: true }).click()
  await page
    .getByLabel('What seems to be the problem?')
    .fill('The battery is swollen and the phone smells burnt.')
  await page.getByRole('button', { name: 'Explore my options' }).click()
  await expect(page.getByRole('heading', { name: 'A safety check comes first' })).toBeVisible()
  await expect(page.getByText('GET A PROFESSIONAL OPINION', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Stop using and charging the device')
  await page.getByRole('button', { name: 'Repair guidance', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Stop use and keep clear' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Arrange professional assessment' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Review battery health' })).toHaveCount(0)
})

test('a costly TV panel repair offers recycling guidance and a recycler lookup', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'TV', exact: true }).click()
  await page.getByRole('button', { name: 'Screen is cracked', exact: true }).click()
  await page.getByLabel('How old is it?').fill('10')
  await page.getByRole('button', { name: 'Explore my options' }).click()
  await expect(
    page.getByRole('heading', { name: 'Consider recycling after a confirmed quote' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Find recyclers', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Find a responsible recycler.' })).toBeVisible()
  await page.getByRole('button', { name: 'Recycling value', exact: true }).click()
  await expect(page.getByText('Copper', { exact: true })).toBeVisible()
  await expect(page.getByText(/Collection and processing fees can reduce the payout/)).toBeVisible()
})

test('estimates survive reload and can be reopened and deleted', async ({ page }) => {
  await useExample(page)
  await page.getByRole('button', { name: 'Save estimate', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Estimate saved', exact: true })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('Estimate saved on this device.')
  await page.reload()
  await openNavigation(page, /^Saved estimates/)
  await expect(page.getByRole('heading', { name: 'Your saved estimates.' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.getByRole('button', { name: 'View estimate' }).click()
  await expect(page.getByRole('heading', { name: 'Washing machine', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Estimate saved', exact: true })).toBeDisabled()
  await openNavigation(page, /^Saved estimates/)
  await page.getByRole('button', { name: 'Delete Washing machine estimate' }).click()
  await expect(
    page.getByRole('heading', { name: 'A little space for your next steps.' }),
  ).toBeVisible()
  await page.reload()
  await openNavigation(page, /^Saved estimates/)
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('corrupt saved data does not stop a new assessment or the saved page from loading', async ({
  page,
}) => {
  await page.evaluate(() => localStorage.setItem('second-life-estimates-v1', '{invalid JSON'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Broken doesn’t mean finished.' })).toBeVisible()
  await openNavigation(page, /^Saved estimates/)
  await expect(
    page.getByRole('heading', { name: 'A little space for your next steps.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Assess a device' }).click()
  await useExample(page)
  await page.getByRole('button', { name: 'Save estimate', exact: true }).click()
  await page.reload()
  await openNavigation(page, /^Saved estimates/)
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('download contains the displayed estimate, guidance, and assumptions', async ({ page }) => {
  await useExample(page)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('second-life-washing-machine-estimate.txt')
  const path = await download.path()
  expect(path).toBeTruthy()
  const report = await readFile(path!, 'utf8')
  expect(report).toContain('Device: Washing machine')
  expect(report).toContain('Repair estimate: ₹1,200–₹3,500')
  expect(report).toContain('Check the external drain hose')
  expect(report).toContain('MATERIAL ASSUMPTIONS')
  expect(report).toContain('Photos are for reference and are not analyzed.')
})

test('photo input previews valid images and reports invalid and unreadable files', async ({
  page,
}) => {
  const fileInput = page.getByLabel('Add a photo')
  await fileInput.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  await expect(page.getByRole('alert')).toContainText('Choose a JPEG, PNG, or WebP image.')
  await fileInput.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not valid PNG bytes'),
  })
  await expect(page.getByRole('alert')).toContainText('We couldn’t read that image.')
  await fileInput.setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  })
  await expect(page.getByRole('alert')).toContainText('This photo is too large.')

  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  )
  await fileInput.setInputFiles({ name: 'appliance.png', mimeType: 'image/png', buffer: image })
  await expect(page.getByRole('img', { name: 'Your appliance reference photo' })).toBeVisible()
  await expect(page.getByText('appliance.png', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Remove photo' }).click()
  await expect(page.getByRole('img', { name: 'Your appliance reference photo' })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Click to add or drag and drop a photo/ }),
  ).toBeVisible()
})

test('shop lookup validates location and opens the correct Google Maps query', async ({
  page,
  context,
}) => {
  await useExample(page)
  await page.getByRole('button', { name: 'Find repair shops' }).click()
  await expect(page.getByRole('alert')).toContainText('Enter your city or postcode')
  await page.getByLabel('City or postcode').fill('Bengaluru 560001')
  await context.route('https://www.google.com/maps/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>Map search test</title>',
    }),
  )
  const newPageEvent = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Find repair shops' }).click()
  const mapsPage = await newPageEvent
  await mapsPage.waitForURL('https://www.google.com/maps/**')
  const url = new URL(mapsPage.url())
  expect(url.searchParams.get('api')).toBe('1')
  expect(url.searchParams.get('query')).toBe(
    'washing machine drain pump repair in Bengaluru 560001',
  )
  await mapsPage.close()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('how-it-works dialog explains the first version and closes by keyboard', async ({ page }) => {
  await openNavigation(page, 'How it works')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Photos aren’t analyzed.')
  await expect(dialog).toContainText('Shop search opens Google Maps')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'A little about Second Life' }).click()
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Let’s get started' }).click()
  await expect(dialog).not.toBeVisible()
})

test('form, results, saved estimates, and resources fit the viewport', async ({ page }) => {
  for (const width of [page.viewportSize()!.width, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Broken doesn’t mean finished.' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await useExample(page)
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Recycling value', exact: true }).click()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('button', { name: 'Save estimate', exact: true }).click()
    await openNavigation(page, /^Saved estimates/)
    await expectNoHorizontalOverflow(page)
    await openNavigation(page, 'Repair resources')
    await expect(page.getByRole('heading', { name: 'Keep good things going.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explore iFixit guides' })).toHaveAttribute(
      'href',
      'https://www.ifixit.com/Guide',
    )
    await expectNoHorizontalOverflow(page)
  }
})
