import { describe, expect, it } from 'vitest'
import { appliances, estimate } from './estimator'
import type { ApplianceId, AssessmentInput } from './estimator'
import { buildMapsSearchUrl, buildWebSearchUrl, getSuggestedService } from './service-search'

const washer: AssessmentInput = {
  appliance: 'washing-machine',
  age: 4,
  currency: 'INR',
  symptoms: 'The washing machine won’t drain. Water stays in the drum after the cycle ends.',
}

describe('component-specific service suggestions', () => {
  it('targets the possible drain pump fault in the washer example', () => {
    const service = getSuggestedService(washer, estimate(washer))
    expect(service).toBe('washing machine drain pump repair')
    const url = new URL(buildMapsSearchUrl(service, 'Bengaluru 560001'))
    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/maps/search/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('query')).toBe(
      'washing machine drain pump repair in Bengaluru 560001',
    )
  })

  it.each([
    ['laptop', 'Battery drains quickly', 'laptop battery replacement'],
    ['smartphone', 'Screen is cracked', 'smartphone screen replacement'],
    ['refrigerator', 'Not cooling', 'refrigerator cooling system repair'],
    ['television', 'Sound but no picture', 'television backlight repair'],
    ['microwave', 'Turntable not spinning', 'microwave turntable motor repair'],
  ] as const)('suggests a relevant service for %s: %s', (appliance, symptoms, expected) => {
    const input = { ...washer, appliance, age: 1, symptoms }
    expect(getSuggestedService(input, estimate(input))).toBe(expected)
  })

  it.each(appliances)(
    'covers every supported $name symptom without inventing an unknown term',
    (appliance) => {
      for (const symptoms of appliance.symptomSuggestions) {
        const input = { ...washer, appliance: appliance.id, age: 1, symptoms }
        const result = estimate(input)
        const service = getSuggestedService(input, result)
        if (result.recommendation === 'recycle') {
          expect(service).toBe('authorized e-waste recycling')
        } else {
          expect(service).not.toContain('diagnosis')
          expect(service).toMatch(new RegExp(`^${appliance.name.toLowerCase()}`))
        }
        expect(service.length).toBeLessThanOrEqual(120)
      }
    },
  )

  it('uses general diagnosis for unfamiliar symptoms', () => {
    const input = { ...washer, symptoms: 'The indicator alternates between violet and teal' }
    expect(getSuggestedService(input, estimate(input))).toBe('washing machine repair diagnosis')
  })

  it('does not select one component when multiple faults match', () => {
    const input = { ...washer, symptoms: 'Not draining and also leaking water' }
    expect(getSuggestedService(input, estimate(input))).toBe('washing machine repair diagnosis')
  })

  it('uses a safety assessment for hazardous battery symptoms', () => {
    const input = { ...washer, appliance: 'smartphone' as const, symptoms: 'Battery is swollen' }
    expect(getSuggestedService(input, estimate(input))).toBe('smartphone safety assessment')
  })

  it('prioritizes a safety assessment for exposed wiring', () => {
    const input = {
      ...washer,
      appliance: 'laptop' as const,
      symptoms: 'Not charging with exposed wiring',
    }
    expect(getSuggestedService(input, estimate(input))).toBe('laptop safety assessment')
  })

  it('directs an end-of-life recycling assessment to authorized recycling', () => {
    const input = {
      ...washer,
      appliance: 'television' as const,
      age: 10,
      symptoms: 'Screen is cracked',
    }
    expect(getSuggestedService(input, estimate(input))).toBe('authorized e-waste recycling')
  })

  it('keeps a new or unrecognized fault label on a general diagnosis search', () => {
    const result = { ...estimate(washer), fault: 'An unmapped fault profile' }
    expect(getSuggestedService(washer, result)).toBe('washing machine repair diagnosis')
  })

  it('rejects an unsupported appliance', () => {
    expect(() =>
      getSuggestedService({ ...washer, appliance: 'toaster' as ApplianceId }, estimate(washer)),
    ).toThrow('supported appliance')
  })
})

describe('search URLs', () => {
  it('normalizes whitespace without discarding Unicode or punctuation', () => {
    const url = new URL(buildMapsSearchUrl('  screen\t repair & replacement ', '  Montréal\n QC  '))
    expect(url.searchParams.get('query')).toBe('screen repair & replacement in Montréal QC')
    expect(url.searchParams.has('replacement')).toBe(false)
  })

  it('keeps query-like user text inside the search instead of changing the destination', () => {
    const url = new URL(buildMapsSearchUrl('screen repair?api=2#offers', 'ಬೆಂಗಳೂರು & query=other'))
    expect(url.hostname).toBe('www.google.com')
    expect(url.hash).toBe('')
    expect(url.searchParams.get('api')).toBe('1')
    expect([...url.searchParams.keys()]).toEqual(['api', 'query'])
    expect(url.searchParams.get('query')).toContain('ಬೆಂಗಳೂರು & query=other')
  })

  it('uses brand/model, service, and location for a web search', () => {
    const url = new URL(
      buildWebSearchUrl('laptop battery replacement', ' Lenovo ThinkPad T14 ', 'Hyderabad'),
    )
    expect(url.origin).toBe('https://www.google.com')
    expect(url.pathname).toBe('/search')
    expect(url.searchParams.get('q')).toBe(
      'Lenovo ThinkPad T14 laptop battery replacement cost guidance in Hyderabad',
    )
  })

  it('supports a web search when the exact brand/model is unknown', () => {
    const url = new URL(buildWebSearchUrl('washing machine drain pump repair', ' ', 'Chennai'))
    expect(url.searchParams.get('q')).toBe(
      'washing machine drain pump repair cost guidance in Chennai',
    )
  })

  it.each(['', '  ', '\n\t'])('requires a service and location for Maps: %j', (blank) => {
    expect(() => buildMapsSearchUrl(blank, 'Chennai')).toThrow('repair service')
    expect(() => buildMapsSearchUrl('laptop repair', blank)).toThrow('city or postcode')
  })

  it('requires a service and location for web search', () => {
    expect(() => buildWebSearchUrl('', '', 'Chennai')).toThrow('repair service')
    expect(() => buildWebSearchUrl('laptop repair', '', '')).toThrow('city or postcode')
  })

  it('bounds all user-controlled query fields', () => {
    const tooLong = 'a'.repeat(121)
    expect(() => buildMapsSearchUrl(tooLong, 'Chennai')).toThrow('120 characters')
    expect(() => buildMapsSearchUrl('laptop repair', tooLong)).toThrow('120 characters')
    expect(() => buildWebSearchUrl('laptop repair', tooLong, 'Chennai')).toThrow('120 characters')
  })

  it('rejects unsupported control characters and invalid runtime input', () => {
    expect(() => buildMapsSearchUrl('laptop\0repair', 'Chennai')).toThrow('unsupported characters')
    expect(() => buildWebSearchUrl('repair', 'model\u0001', 'Chennai')).toThrow(
      'unsupported characters',
    )
    expect(() => buildMapsSearchUrl(null as unknown as string, 'Chennai')).toThrow(
      'valid repair service',
    )
  })
})
