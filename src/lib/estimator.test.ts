import { describe, expect, it } from 'vitest'
import {
  appliances,
  estimate,
  formatMoney,
  getDefaultReplacementCost,
  type ApplianceId,
  type AssessmentInput,
  type Currency,
} from './estimator'

const baseline: AssessmentInput = {
  appliance: 'washing-machine',
  age: 4,
  symptoms: 'Not draining',
  currency: 'INR',
}

describe('symptom-based estimates', () => {
  it.each(
    appliances.flatMap((appliance) =>
      appliance.symptomSuggestions.map((symptoms) => ({ appliance, symptoms })),
    ),
  )('recognises the $appliance.name suggestion "$symptoms"', ({ appliance, symptoms }) => {
    const result = estimate({
      ...baseline,
      appliance: appliance.id,
      age: appliance.defaultAge,
      symptoms,
    })
    expect(result.matched).toBe(true)
    expect(result.repairCost.low).toBeGreaterThan(0)
    expect(result.repairCost.high).toBeGreaterThanOrEqual(result.repairCost.low)
    expect(result.materials.length).toBeGreaterThan(0)
    expect(result.recyclingValue.high).toBeGreaterThan(result.recyclingValue.low)
    expect(result.explanation).toContain('illustrative assumptions')
  })

  it('recommends exploring an economical repair on a younger appliance', () => {
    const result = estimate(baseline)
    expect(result.recommendation).toBe('repair')
    expect(result.fault).toMatch(/drain/i)
    expect(result.remainingYears).toBe(6)
  })

  it('recognises the demo symptom with a typographic apostrophe', () => {
    const result = estimate({
      ...baseline,
      symptoms: 'The washing machine won’t drain. Water stays in the drum after the cycle ends.',
    })
    expect(result.matched).toBe(true)
    expect(result.fault).toContain('drain filter')
    expect(result.recommendation).toBe('repair')
  })

  it.each(['won’t', 'won‘t', 'wonʼt', 'won＇t'])(
    'normalises the apostrophe in %s',
    (contraction) => {
      const result = estimate({ ...baseline, symptoms: `“The washer ${contraction} drain.”` })
      expect(result.matched).toBe(true)
      expect(result.fault).toContain('drain filter')
    },
  )

  it('suggests considering recycling when a confirmed repair would approach replacement cost', () => {
    const result = estimate({
      ...baseline,
      appliance: 'television',
      symptoms: 'The screen is cracked',
    })
    expect(result.recommendation).toBe('recycle')
    expect(result.explanation).toContain('written quote')
  })

  it('takes an entered replacement price into account', () => {
    const result = estimate({ ...baseline, replacementCost: 3000 })
    expect(result.replacementCost).toBe(3000)
    expect(result.recommendation).toBe('recycle')
  })

  it('asks for inspection when the economic comparison is close', () => {
    expect(estimate({ ...baseline, replacementCost: 5000 }).recommendation).toBe('inspect')
  })

  it('does not invent a fault for unsupported symptoms', () => {
    const result = estimate({
      ...baseline,
      symptoms: 'Something is unusual but I cannot describe it',
    })
    expect(result.matched).toBe(false)
    expect(result.recommendation).toBe('inspect')
    expect(result.fault).toMatch(/diagnosis/)
    expect(result.explanation).toContain('broad planning allowance')
  })

  it('asks for inspection when symptoms match several possible issues', () => {
    const result = estimate({
      ...baseline,
      symptoms: 'Not draining and making a loud grinding noise',
    })
    expect(result.recommendation).toBe('inspect')
    expect(result.fault).toContain('Several possible causes')
  })

  it('keeps remaining life non-negative beyond the assumed lifespan', () => {
    const result = estimate({ ...baseline, age: 20 })
    expect(result.remainingYears).toBe(0)
    expect(result.recommendation).toBe('inspect')
    expect(result.explanation).toContain('not a guarantee')
  })

  it('considers age when a repair is a substantial share of replacement cost', () => {
    const result = estimate({ ...baseline, age: 10, replacementCost: 7000 })
    expect(result.recommendation).toBe('recycle')
  })
})

describe('safety and uncertainty', () => {
  it.each([
    'The charger has exposed wiring and the laptop is not charging',
    'The power cord is frayed and the laptop is not charging',
    'There is a frayed charging cable and it is not charging',
    'Bare copper is visible on the cable and it is not charging',
    'The power cable has exposed conductors and it is not charging',
  ])('requires professional handling for damaged electrical wiring: %s', (symptoms) => {
    const result = estimate({ ...baseline, appliance: 'laptop', symptoms })
    expect(result.recommendation).toBe('inspect')
    expect(result.safetyWarning).toContain('Disconnect power only if it is safe')
    expect(result.fault).toBe('Professional safety assessment needed')
    expect(result.guide[0].title).toBe('Stop use and keep clear')
  })

  it.each([
    'There is smoke from the back',
    'Sparks when I plug it in',
    'Battery is swelling',
    'The battery is swollen',
    'The case is bulging',
    'Burning smell when charging',
    'It gives me an electric shock',
    'Battery is leaking',
    'It is overheating',
  ])('prioritises a professional safety assessment for "%s"', (symptoms) => {
    const result = estimate({ ...baseline, appliance: 'smartphone', symptoms })
    expect(result.recommendation).toBe('inspect')
    expect(result.matched).toBe(false)
    expect(result.safetyWarning).toContain('Stop using and charging')
    expect(result.guide).toHaveLength(2)
    expect(result.guide[0].title).toContain('Stop use')
    expect(result.fault).toBe('Professional safety assessment needed')
  })

  it.each(['microwave', 'refrigerator', 'television'] as const)(
    'provides device-specific handling precautions for %s',
    (appliance) => {
      const result = estimate({
        ...baseline,
        appliance,
        symptoms: appliances.find((item) => item.id === appliance)!.symptomSuggestions[0],
      })
      expect(result.safetyWarning).toMatch(/technician/)
    },
  )

  it('does not suggest opening a microwave to fix heating', () => {
    const result = estimate({ ...baseline, appliance: 'microwave', symptoms: 'Not heating' })
    expect(result.safetyWarning).toContain('Never remove a microwave cover')
    expect(result.guide[1].description).toContain(
      'Do not test an empty microwave or open its housing',
    )
  })
})

describe('currencies and indicative material values', () => {
  it.each(appliances)('has usable independent USD assumptions for $name', (appliance) => {
    const result = estimate({
      ...baseline,
      appliance: appliance.id,
      currency: 'USD',
      symptoms: appliance.symptomSuggestions[0],
    })
    expect(result.replacementCost).toBe(getDefaultReplacementCost(appliance.id, 'USD'))
    expect(result.repairCost.high).toBeLessThan(1000)
    expect(result.recyclingValue.high).toBeGreaterThan(0)
    expect(result.recyclingValue.high).toBeLessThan(100)
  })

  it('uses the listed INR default replacement prices', () => {
    for (const appliance of appliances) {
      expect(getDefaultReplacementCost(appliance.id, 'INR')).toBe(appliance.defaultReplacementCost)
    }
  })

  it('formats rupees and dollars without disguising small scrap values as zero', () => {
    expect(formatMoney(28000, 'INR')).toBe('₹28,000')
    expect(formatMoney(550, 'USD')).toBe('$550')
    expect(formatMoney(0.23, 'USD')).toBe('$0.23')
  })

  it('keeps the recycling range below the gross material subtotal and explains fees', () => {
    const result = estimate(baseline)
    const subtotal = result.materials.reduce((sum, material) => sum + material.value, 0)
    expect(result.recyclingValue.low).toBeLessThan(result.recyclingValue.high)
    expect(result.recyclingValue.high).toBeLessThan(subtotal)
    expect(result.explanation).toContain('lower or zero after collection and processing fees')
  })
})

describe('input validation', () => {
  it.each([null, undefined, false, true, 4, 'saved assessment', [], {}])(
    'rejects a malformed persisted assessment: %s',
    (input) => {
      expect(() => estimate(input)).toThrow()
    },
  )

  it.each([
    { appliance: null },
    { appliance: '__proto__' },
    { appliance: 1 },
    { currency: null },
    { currency: 1 },
    { age: null },
    { age: '4' },
    { age: true },
    { age: undefined },
    { symptoms: null },
    { symptoms: 42 },
    { symptoms: [] },
    { symptoms: undefined },
    { replacementCost: null },
    { replacementCost: '28000' },
    { replacementCost: true },
  ])('rejects invalid persisted fields: %j', (fields) => {
    expect(() => estimate({ ...baseline, ...fields })).toThrow()
  })

  it.each([-1, NaN, Infinity, 101])('rejects invalid age %s', (age) => {
    expect(() => estimate({ ...baseline, age })).toThrow(/age/)
  })

  it.each([0, -1, NaN, Infinity, 100000001])(
    'rejects invalid replacement price %s',
    (replacementCost) => {
      expect(() => estimate({ ...baseline, replacementCost })).toThrow(/replacement cost/)
    },
  )

  it.each(['', '   '])('requires a symptom description', (symptoms) => {
    expect(() => estimate({ ...baseline, symptoms })).toThrow(/symptom/)
  })

  it('rejects unsupported runtime appliance and currency values', () => {
    expect(() => estimate({ ...baseline, appliance: 'toaster' as ApplianceId })).toThrow(
      /supported appliance/,
    )
    expect(() => estimate({ ...baseline, currency: 'EUR' as Currency })).toThrow(/INR or USD/)
  })
})
