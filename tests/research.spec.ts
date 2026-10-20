import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const sourceText = 'Published guidance recommends checking the accessible drain hose. [source]'
const researchFixture = {
  status: 'ok',
  text: sourceText,
  citations: [
    {
      start: sourceText.indexOf('[source]'),
      end: sourceText.length,
      url: 'https://www.example.com/repair-guide',
      title: 'Test fixture: drain troubleshooting',
    },
  ],
  checkedAt: '2026-10-20T10:00:00.000Z',
}

async function openEstimate(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Explore a washing machine example/ }).click()
  await expect(page.getByLabel('Service to look for')).toHaveValue(
    'washing machine drain pump repair',
  )
}

test('research requires a location and offers direct search when the provider is not configured', async ({
  page,
}) => {
  let requests = 0
  await page.route('**/api/research', (route) => {
    requests++
    return route.fulfill({ status: 503, json: { error: { code: 'not_configured' } } })
  })
  await openEstimate(page)
  await page.getByRole('button', { name: 'Research this repair' }).click()
  await expect(
    page.getByText('Enter your city or postcode in the nearby-services panel first.'),
  ).toBeVisible()
  expect(requests).toBe(0)
  await page.getByLabel('City or postcode').fill('Bengaluru 560001')
  await page.getByRole('button', { name: 'Research this repair' }).click()
  await expect(page.getByText(/Web research isn’t enabled yet/)).toBeVisible()
  expect(requests).toBe(1)
  const link = page.getByRole('link', { name: 'Search the web yourself' })
  const url = new URL((await link.getAttribute('href'))!)
  expect(url.searchParams.get('q')).toBe(
    'washing machine drain pump repair cost guidance in Bengaluru 560001',
  )
  await expect(page.getByText('WEB-SOURCED INFORMATION')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Find repair shops' })).toBeEnabled()
})

test('web research displays attributed sources, retains them between tabs, and clears them when scope changes', async ({
  page,
}) => {
  let sent: Record<string, unknown> = {}
  await page.route('**/api/research', (route) => {
    sent = route.request().postDataJSON()
    return route.fulfill({ status: 200, json: researchFixture })
  })
  await page.goto('/')
  await page.getByLabel('Brand and model').fill('Bosch WAN24209IN')
  await page.getByRole('button', { name: 'Not draining', exact: true }).click()
  await page.getByRole('button', { name: 'Explore my options' }).click()
  await page.getByLabel('City or postcode').fill('Bengaluru')
  await page.getByRole('button', { name: 'Research this repair' }).click()
  await expect(page.getByText('WEB-SOURCED INFORMATION')).toBeVisible()
  await expect(
    page.getByText('Published guidance recommends checking the accessible drain hose.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Source 1: Test fixture: drain troubleshooting' }),
  ).toHaveAttribute('href', researchFixture.citations[0].url)
  expect(sent).toMatchObject({
    brandModel: 'Bosch WAN24209IN',
    service: 'washing machine drain pump repair',
    location: 'Bengaluru',
    symptoms: 'Not draining',
  })
  expect(sent).not.toHaveProperty('photo')
  expect(sent).not.toHaveProperty('image')
  await page.getByRole('button', { name: 'Repair guidance', exact: true }).click()
  await page.getByRole('button', { name: 'Your estimate', exact: true }).click()
  await expect(page.getByText('WEB-SOURCED INFORMATION')).toBeVisible()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(audit.violations).toEqual([])
  await page.getByLabel('City or postcode').fill('Chennai')
  await expect(page.getByText('WEB-SOURCED INFORMATION')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Research this repair' })).toBeVisible()
})

test('unsafe source links never render as a research answer', async ({ page }) => {
  await page.route('**/api/research', (route) =>
    route.fulfill({
      status: 200,
      json: {
        ...researchFixture,
        citations: [{ ...researchFixture.citations[0], url: 'javascript:alert(1)' }],
      },
    }),
  )
  await openEstimate(page)
  await page.getByLabel('City or postcode').fill('Bengaluru')
  await page.getByRole('button', { name: 'Research this repair' }).click()
  await expect(page.getByText(/The research response couldn’t be verified/)).toBeVisible()
  await expect(page.getByText('WEB-SOURCED INFORMATION')).toHaveCount(0)
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)
})

test('Maps search follows the editable repair service', async ({ page, context }) => {
  await openEstimate(page)
  await page.getByLabel('Service to look for').fill('Bosch washing machine control board repair')
  await page.getByLabel('City or postcode').fill('Hyderabad 500001')
  await context.route('https://www.google.com/maps/**', (route) =>
    route.fulfill({ status: 200, body: '<title>Maps test fixture</title>' }),
  )
  const opened = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Find repair shops' }).click()
  const maps = await opened
  await maps.waitForURL('https://www.google.com/maps/**')
  expect(new URL(maps.url()).searchParams.get('query')).toBe(
    'Bosch washing machine control board repair in Hyderabad 500001',
  )
  await maps.close()
})
