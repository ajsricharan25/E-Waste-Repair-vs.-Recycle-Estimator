import { appliances } from './estimator'
import type { ApplianceId, Assessment, AssessmentInput } from './estimator'

// These are suggested search terms, not confirmed component diagnoses. Exact
// fault labels keep unknown or conflicting assessments on a general search.
const componentServices: Record<ApplianceId, Record<string, string>> = {
  'washing-machine': {
    'Possible drain filter blockage or pump fault': 'washing machine drain pump repair',
    'Possible load imbalance, drive belt, or motor fault': 'washing machine drum motor repair',
    'Possible inlet hose or door seal leak': 'washing machine hose door seal repair',
    'Possible imbalance or drum bearing wear': 'washing machine drum bearing repair',
  },
  refrigerator: {
    'Possible airflow, thermostat, or cooling-system fault': 'refrigerator cooling system repair',
    'Possible door seal or defrost-system fault': 'refrigerator defrost door seal repair',
    'Possible blocked defrost drain or water-line leak': 'refrigerator drain water line repair',
    'Possible fan obstruction or compressor vibration': 'refrigerator fan compressor repair',
  },
  laptop: {
    'Possible battery wear': 'laptop battery replacement',
    'Possible display panel or display connection damage': 'laptop screen repair',
    'Possible storage, memory, or software bottleneck': 'laptop performance diagnostics',
    'Possible charger, charging port, or power-circuit fault': 'laptop charging port repair',
  },
  smartphone: {
    'Possible battery wear': 'smartphone battery replacement',
    'Possible display or touch-panel damage': 'smartphone screen replacement',
    'Possible cable, charging port, or power-circuit fault': 'smartphone charging port repair',
    'Possible audio setting, speaker, or microphone fault': 'smartphone speaker microphone repair',
  },
  television: {
    'Possible broken display panel': 'television screen replacement',
    'Possible backlight or video-board fault': 'television backlight repair',
    'Possible external power or internal power-board fault': 'television power board repair',
    'Possible audio setting or speaker fault': 'television speaker repair',
  },
  microwave: {
    'Possible high-voltage heating-system fault': 'microwave heating system repair',
    'Possible turntable alignment or motor fault': 'microwave turntable motor repair',
    'Possible control-lock setting or keypad fault': 'microwave keypad repair',
    'Possible door latch or interlock fault': 'microwave door interlock repair',
  },
}

export function getSuggestedService(input: AssessmentInput, result: Assessment): string {
  const appliance = appliances.find((item) => item.id === input.appliance)
  if (!appliance) throw new Error('Choose a supported appliance.')
  const deviceName = appliance.name.toLowerCase()

  if (result.fault === 'Professional safety assessment needed') {
    return `${deviceName} safety assessment`
  }
  if (result.recommendation === 'recycle') return 'authorized e-waste recycling'
  if (!result.matched) return `${deviceName} repair diagnosis`

  return componentServices[input.appliance][result.fault] ?? `${deviceName} repair diagnosis`
}

function searchText(value: string, field: string, required = true): string {
  if (typeof value !== 'string') throw new Error(`Enter a valid ${field}.`)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw new Error(`Remove unsupported characters from the ${field}.`)
  }
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  if (required && !normalized) throw new Error(`Enter a ${field}.`)
  if (normalized.length > 120) throw new Error(`Keep the ${field} to 120 characters or fewer.`)
  return normalized
}

export function buildMapsSearchUrl(service: string, location: string): string {
  const query = `${searchText(service, 'repair service')} in ${searchText(location, 'city or postcode')}`
  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', query)
  return url.toString()
}

export function buildWebSearchUrl(service: string, brandModel: string, location: string): string {
  const brand = searchText(brandModel, 'brand and model', false)
  const repair = searchText(service, 'repair service')
  const area = searchText(location, 'city or postcode')
  const query = [brand, repair, 'cost guidance in', area].filter(Boolean).join(' ')
  const url = new URL('https://www.google.com/search')
  url.searchParams.set('q', query)
  return url.toString()
}
