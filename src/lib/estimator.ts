export type ApplianceId =
  'washing-machine' | 'refrigerator' | 'laptop' | 'smartphone' | 'television' | 'microwave'

export type Currency = 'INR' | 'USD'

export interface AssessmentInput {
  appliance: ApplianceId
  age: number
  symptoms: string
  replacementCost?: number
  currency: Currency
}

export interface Assessment {
  recommendation: 'repair' | 'recycle' | 'inspect'
  headline: string
  fault: string
  explanation: string
  summary: string
  repairCost: { low: number; high: number }
  replacementCost: number
  recyclingValue: { low: number; high: number }
  materials: { name: string; weightKg: number; value: number }[]
  guide: { title: string; description: string }[]
  safetyWarning: string | null
  lifespan: number
  remainingYears: number
  matched: boolean
}

export interface Appliance {
  id: ApplianceId
  name: string
  shortName: string
  defaultReplacementCost: number
  defaultAge: number
  symptomSuggestions: string[]
}

export const appliances: Appliance[] = [
  {
    id: 'washing-machine',
    name: 'Washing machine',
    shortName: 'Washer',
    defaultReplacementCost: 28000,
    defaultAge: 4,
    symptomSuggestions: ['Not draining', 'Drum not spinning', 'Leaking water', 'Loud noise'],
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    shortName: 'Fridge',
    defaultReplacementCost: 38000,
    defaultAge: 5,
    symptomSuggestions: ['Not cooling', 'Ice buildup', 'Leaking water', 'Loud noise'],
  },
  {
    id: 'laptop',
    name: 'Laptop',
    shortName: 'Laptop',
    defaultReplacementCost: 60000,
    defaultAge: 3,
    symptomSuggestions: [
      'Battery drains quickly',
      'Screen is cracked',
      'Running slowly',
      'Not charging',
    ],
  },
  {
    id: 'smartphone',
    name: 'Smartphone',
    shortName: 'Phone',
    defaultReplacementCost: 25000,
    defaultAge: 2,
    symptomSuggestions: [
      'Battery drains quickly',
      'Screen is cracked',
      'Not charging',
      'Speaker not working',
    ],
  },
  {
    id: 'television',
    name: 'Television',
    shortName: 'TV',
    defaultReplacementCost: 32000,
    defaultAge: 4,
    symptomSuggestions: ['Sound but no picture', 'Screen is cracked', 'Not turning on', 'No sound'],
  },
  {
    id: 'microwave',
    name: 'Microwave',
    shortName: 'Microwave',
    defaultReplacementCost: 10000,
    defaultAge: 3,
    symptomSuggestions: [
      'Not heating',
      'Turntable not spinning',
      'Buttons not responding',
      'Door not closing',
    ],
  },
]

type Cost = [number, number]
type GuideStep = Assessment['guide'][number]
type MaterialName = 'Steel' | 'Aluminium' | 'Copper' | 'Circuit boards' | 'Plastic'

interface FaultProfile {
  pattern: RegExp
  fault: string
  cost: Record<Currency, Cost>
  check: GuideStep
}

interface ApplianceProfile {
  lifespan: number
  usdReplacement: number
  generalCost: Record<Currency, Cost>
  materials: Partial<Record<MaterialName, number>>
  faults: FaultProfile[]
  warning?: string
}

const profiles: Record<ApplianceId, ApplianceProfile> = {
  'washing-machine': {
    lifespan: 10,
    usdReplacement: 550,
    generalCost: { INR: [1500, 14000], USD: [90, 320] },
    materials: { Steel: 35, Aluminium: 2, Copper: 1.2, 'Circuit boards': 0.3, Plastic: 8 },
    faults: [
      {
        pattern:
          /(?:not|won'?t|doesn'?t|isn'?t)\s+drain|drain(?:ing)?\s+(?:issue|problem)|water\s+(?:stuck|left|remain)|blocked?\s+(?:filter|drain)/i,
        fault: 'Possible drain filter blockage or pump fault',
        cost: { INR: [1200, 3500], USD: [90, 180] },
        check: {
          title: 'Check the external drain hose',
          description:
            'With power off, look for visible kinks in the accessible drain hose. Check your model’s manual before using a user-accessible filter; trapped water can spill. Leave pump access to a technician.',
        },
      },
      {
        pattern:
          /(?:not|won'?t|doesn'?t|isn'?t)\s+spin|drum.*(?:stuck|stop)|spin.*(?:fail|problem)/i,
        fault: 'Possible load imbalance, drive belt, or motor fault',
        cost: { INR: [2000, 6500], USD: [120, 260] },
        check: {
          title: 'Check the load',
          description:
            'After the drum stops, redistribute the laundry and follow the manual’s load limit. If the issue returns, ask a technician to check the drive system.',
        },
      },
      {
        pattern: /leak|puddle|water\s+on\s+(?:the\s+)?floor/i,
        fault: 'Possible inlet hose or door seal leak',
        cost: { INR: [1000, 4000], USD: [90, 200] },
        check: {
          title: 'Locate the visible leak',
          description:
            'Close the water supply and inspect accessible hoses and the door seal visually. Do not touch a wet plug, socket, or appliance; have the power isolated safely.',
        },
      },
      {
        pattern: /noise|noisy|rattl|grind|bang|vibrat/i,
        fault: 'Possible imbalance or drum bearing wear',
        cost: { INR: [2000, 8000], USD: [100, 300] },
        check: {
          title: 'Check stability',
          description:
            'With the machine off, check whether it stands level and whether an external object is rattling against it. Persistent grinding needs a technician.',
        },
      },
    ],
  },
  refrigerator: {
    lifespan: 12,
    usdReplacement: 800,
    generalCost: { INR: [1500, 18000], USD: [100, 500] },
    materials: { Steel: 32, Aluminium: 3, Copper: 1.4, 'Circuit boards': 0.25, Plastic: 12 },
    warning:
      'Keep the sealed cooling system closed. Refrigerant handling and compressor work require a qualified technician. Use an authorised recycler for end-of-life appliances.',
    faults: [
      {
        pattern: /(?:not|isn'?t|stopped)\s+cool|warm|freez.*(?:fail|not)|(?:not|won'?t)\s+freez/i,
        fault: 'Possible airflow, thermostat, or cooling-system fault',
        cost: { INR: [2000, 12000], USD: [120, 400] },
        check: {
          title: 'Check airflow and settings',
          description:
            'Check the temperature setting, clear items blocking internal vents, and check that the door seals fully. Keep perishable food safely chilled elsewhere if the fridge cannot maintain a safe temperature.',
        },
      },
      {
        pattern: /ice\s*(?:build|buildup)|frost|icing|frozen/i,
        fault: 'Possible door seal or defrost-system fault',
        cost: { INR: [1500, 5000], USD: [100, 230] },
        check: {
          title: 'Inspect the door seal',
          description:
            'Look for gaps or food debris on the door seal and clean it with a damp cloth. Follow the manual for defrosting; never chip ice with a sharp tool.',
        },
      },
      {
        pattern: /leak|puddle|water\s+on\s+(?:the\s+)?floor/i,
        fault: 'Possible blocked defrost drain or water-line leak',
        cost: { INR: [1000, 3500], USD: [90, 180] },
        check: {
          title: 'Inspect accessible water connections',
          description:
            'Check the manual and look for visible leaks without moving heavy equipment or opening panels. Avoid wet electrical parts and arrange service if the source is unclear.',
        },
      },
      {
        pattern: /noise|noisy|rattl|buzz|hum/i,
        fault: 'Possible fan obstruction or compressor vibration',
        cost: { INR: [1500, 7000], USD: [100, 280] },
        check: {
          title: 'Check clearance',
          description:
            'Check that the fridge is level and has the ventilation clearance specified in its manual. Record when the noise happens for a technician.',
        },
      },
    ],
  },
  laptop: {
    lifespan: 6,
    usdReplacement: 800,
    generalCost: { INR: [1500, 30000], USD: [70, 500] },
    materials: { Aluminium: 0.5, Copper: 0.08, 'Circuit boards': 0.25, Plastic: 0.4 },
    faults: [
      {
        pattern: /battery|drain.*(?:quick|fast)|short.*charge/i,
        fault: 'Possible battery wear',
        cost: { INR: [2500, 6500], USD: [70, 160] },
        check: {
          title: 'Check battery health',
          description:
            'Use your operating system’s battery-health report and review power usage. Ask an authorised technician about replacement if capacity is low; do not open or puncture the battery.',
        },
      },
      {
        pattern: /screen|display|crack/i,
        fault: 'Possible display panel or display connection damage',
        cost: { INR: [5000, 14000], USD: [140, 320] },
        check: {
          title: 'Check an external display',
          description:
            'If the laptop is otherwise safe to use, try an external monitor. Avoid pressing cracked glass and ask a technician to confirm whether the panel or cable needs replacement.',
        },
      },
      {
        pattern: /slow|lag|freez|hang/i,
        fault: 'Possible storage, memory, or software bottleneck',
        cost: { INR: [1500, 6000], USD: [60, 180] },
        check: {
          title: 'Review storage and startup apps',
          description:
            'Back up important files, check free storage, and review startup apps in system settings. Use built-in diagnostics before paying for hardware replacement.',
        },
      },
      {
        pattern: /charg|(?:not|won'?t|doesn'?t)\s+(?:turn|power)|dead|no\s+power/i,
        fault: 'Possible charger, charging port, or power-circuit fault',
        cost: { INR: [2000, 8000], USD: [80, 220] },
        check: {
          title: 'Inspect the charger externally',
          description:
            'Look for visible cable damage. If safe, test with a known-compatible manufacturer-approved charger. Do not insert metal tools into the port or use a damaged charger.',
        },
      },
    ],
  },
  smartphone: {
    lifespan: 5,
    usdReplacement: 500,
    generalCost: { INR: [1000, 18000], USD: [50, 350] },
    materials: { Aluminium: 0.025, Copper: 0.015, 'Circuit boards': 0.04, Plastic: 0.025 },
    faults: [
      {
        pattern: /battery|drain.*(?:quick|fast)|short.*charge/i,
        fault: 'Possible battery wear',
        cost: { INR: [1500, 4500], USD: [50, 110] },
        check: {
          title: 'Review battery health',
          description:
            'Check battery health and app power use in settings. Arrange a professional replacement for a worn battery; glued-in batteries should not be pried out.',
        },
      },
      {
        pattern: /screen|display|crack|touch/i,
        fault: 'Possible display or touch-panel damage',
        cost: { INR: [3000, 12000], USD: [90, 280] },
        check: {
          title: 'Protect your data',
          description:
            'If it is safe to operate, back up your phone before service. Avoid pressing on cracked glass and have the display inspected professionally.',
        },
      },
      {
        pattern: /charg|(?:not|won'?t|doesn'?t)\s+(?:turn|power)|dead|no\s+power/i,
        fault: 'Possible cable, charging port, or power-circuit fault',
        cost: { INR: [1000, 4500], USD: [50, 130] },
        check: {
          title: 'Check the cable and adapter',
          description:
            'Try a known-compatible undamaged cable and approved adapter if the phone is safe to use. Inspect the port visually; do not insert metal tools or liquids.',
        },
      },
      {
        pattern: /speaker|sound|audio|microphone/i,
        fault: 'Possible audio setting, speaker, or microphone fault',
        cost: { INR: [1000, 3500], USD: [50, 120] },
        check: {
          title: 'Check audio settings',
          description:
            'Check volume, silent mode, and Bluetooth output. Remove a case that blocks the speaker and test a voice recording before booking service.',
        },
      },
    ],
  },
  television: {
    lifespan: 9,
    usdReplacement: 450,
    generalCost: { INR: [1500, 27000], USD: [80, 450] },
    materials: { Steel: 3, Aluminium: 1, Copper: 0.2, 'Circuit boards': 0.5, Plastic: 3 },
    warning:
      'Keep the television housing closed. Internal power supplies can retain a dangerous charge after unplugging; internal repairs belong with a qualified technician.',
    faults: [
      {
        pattern: /crack|shatter|broken\s+(?:screen|panel)/i,
        fault: 'Possible broken display panel',
        cost: { INR: [18000, 28000], USD: [300, 500] },
        check: {
          title: 'Document the panel damage',
          description:
            'Take a photo without touching cracked glass and request a panel replacement quote using the exact model number. Panel replacement can cost close to a replacement TV.',
        },
      },
      {
        pattern:
          /no\s+picture|black\s+screen|blank\s+screen|sound.*(?:no|without).*picture|backlight/i,
        fault: 'Possible backlight or video-board fault',
        cost: { INR: [3000, 8000], USD: [100, 220] },
        check: {
          title: 'Check the input source',
          description:
            'Check the selected input and try another compatible HDMI cable or source. If the on-screen menu is also absent, ask a technician to inspect the display system.',
        },
      },
      {
        pattern: /(?:not|won'?t|doesn'?t)\s+(?:turn|power)|dead|no\s+power/i,
        fault: 'Possible external power or internal power-board fault',
        cost: { INR: [2500, 7000], USD: [90, 200] },
        check: {
          title: 'Check external power',
          description:
            'Inspect the power cable without opening the housing. If safe, check a known-working wall outlet and the physical power button before arranging service.',
        },
      },
      {
        pattern: /no\s+sound|sound.*(?:not|fail)|speaker|audio/i,
        fault: 'Possible audio setting or speaker fault',
        cost: { INR: [1500, 4500], USD: [80, 150] },
        check: {
          title: 'Check audio output',
          description:
            'Check mute, volume, and the selected audio output. Disconnect external audio devices and test a second source before booking service.',
        },
      },
    ],
  },
  microwave: {
    lifespan: 8,
    usdReplacement: 180,
    generalCost: { INR: [1000, 8000], USD: [70, 230] },
    materials: { Steel: 9, Aluminium: 0.3, Copper: 0.4, 'Circuit boards': 0.15, Plastic: 1.5 },
    warning:
      'Never remove a microwave cover, defeat a door interlock, or work on internal components. Its high-voltage capacitor can remain dangerous even when unplugged. Internal work requires a qualified technician.',
    faults: [
      {
        pattern: /(?:not|won'?t|doesn'?t|isn'?t|stopped)\s+heat|cold\s+food|magnetron/i,
        fault: 'Possible high-voltage heating-system fault',
        cost: { INR: [3500, 7000], USD: [130, 230] },
        check: {
          title: 'Check settings only',
          description:
            'Check the manual for demo mode and cooking settings. Do not test an empty microwave or open its housing. Have a qualified technician diagnose the heating system.',
        },
      },
      {
        pattern: /turntable|plate.*(?:spin|turn)|(?:not|won'?t)\s+spin/i,
        fault: 'Possible turntable alignment or motor fault',
        cost: { INR: [800, 2200], USD: [60, 100] },
        check: {
          title: 'Reseat the removable turntable',
          description:
            'With the microwave unplugged and cool, clean and reseat only the removable glass tray and roller ring as directed by the manual. Leave motor access to a technician.',
        },
      },
      {
        pattern: /button|keypad|control|respond/i,
        fault: 'Possible control-lock setting or keypad fault',
        cost: { INR: [1500, 3500], USD: [80, 140] },
        check: {
          title: 'Check the control lock',
          description:
            'Use the manual to check whether child lock is enabled. Clean the outside controls with power disconnected. A persistent fault needs professional service.',
        },
      },
      {
        pattern: /door|latch/i,
        fault: 'Possible door latch or interlock fault',
        cost: { INR: [1200, 3000], USD: [70, 130] },
        check: {
          title: 'Stop using a damaged door',
          description:
            'Leave the microwave unplugged if the door is damaged or will not close correctly. Have a qualified technician inspect it; never bypass its interlock.',
        },
      },
    ],
  },
}

// Illustrative gross material prices per kg; these are not live commodity rates.
const materialRates: Record<Currency, Record<MaterialName, number>> = {
  INR: { Steel: 25, Aluminium: 120, Copper: 550, 'Circuit boards': 200, Plastic: 8 },
  USD: { Steel: 0.15, Aluminium: 0.8, Copper: 5, 'Circuit boards': 2, Plastic: 0.05 },
}

const hazardPattern =
  /smok(?:e|es|ing)|spark|sw(?:ell|oll)|bulg|puff(?:ed|ing)?|burn(?:ing|t|ed)|scorch|(?:electric\s+)?shock|on\s+fire|flame|overheat|too\s+hot|extremely\s+hot|battery.*(?:leak|punctur)|(?:leak|punctur).*battery|(?:gas|refrigerant)\s+leak|(?:exposed|bare)\s+(?:wires?|wiring|copper|conductors?)|(?:frayed|damaged|split|cut)\s+(?:(?:power|charging)\s+)?(?:cord|cable|wire)|(?:cord|cable|wir(?:e|ing)).{0,30}(?:frayed|exposed|bare)/i

function rounded(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value > 0 && value < 10 ? 2 : 0,
  }).format(value)
}

export function getDefaultReplacementCost(appliance: ApplianceId, currency: Currency): number {
  const option = appliances.find((item) => item.id === appliance)
  if (!option) throw new Error('Choose a supported appliance.')
  if (currency !== 'INR' && currency !== 'USD') throw new Error('Choose INR or USD.')
  return currency === 'INR' ? option.defaultReplacementCost : profiles[appliance].usdReplacement
}

export function estimate(input: unknown): Assessment {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Provide an assessment with appliance details and symptoms.')
  }
  const data = input as Record<string, unknown>
  if (!appliances.some((item) => item.id === data.appliance)) {
    throw new Error('Choose a supported appliance.')
  }
  const appliance = data.appliance as ApplianceId
  const { age, currency } = data
  if (currency !== 'INR' && currency !== 'USD') throw new Error('Choose INR or USD.')
  const defaultReplacement = getDefaultReplacementCost(appliance, currency)
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 0 || age > 100) {
    throw new Error('Enter an appliance age between 0 and 100 years.')
  }
  if (typeof data.symptoms !== 'string' || !data.symptoms.trim()) {
    throw new Error('Describe at least one symptom.')
  }
  const replacementCost =
    data.replacementCost === undefined ? defaultReplacement : data.replacementCost
  if (
    typeof replacementCost !== 'number' ||
    !Number.isFinite(replacementCost) ||
    replacementCost <= 0 ||
    replacementCost > 100000000
  ) {
    throw new Error('Enter a replacement cost greater than zero and no more than 100,000,000.')
  }

  const profile = profiles[appliance]
  const symptoms = data.symptoms
    .trim()
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201a\u201b\u2032\u02bc]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f\u2033]/g, '"')
  const hazard = hazardPattern.test(symptoms)
  const matches = profile.faults.filter((candidate) => candidate.pattern.test(symptoms))
  const fault = matches[0]
  const multipleFaults = matches.length > 1
  const matched = !hazard && Boolean(fault)
  // The age adjustment is deliberately bounded; it is a planning assumption,
  // not a prediction of failure or the useful life of an individual appliance.
  const remainingYears = Math.max(0, rounded(profile.lifespan - age))
  const cost =
    !hazard && fault && !multipleFaults ? fault.cost[currency] : profile.generalCost[currency]
  const [low, high] = cost
  const midpoint = (low + high) / 2
  const repairFraction = midpoint / replacementCost

  let recommendation: Assessment['recommendation'] = 'inspect'
  if (matched && !multipleFaults) {
    if (repairFraction >= 0.6 || (remainingYears <= 1 && repairFraction >= 0.25)) {
      recommendation = 'recycle'
    } else if (repairFraction <= 0.4 && remainingYears >= 2) {
      recommendation = 'repair'
    }
  }

  const materials = (Object.entries(profile.materials) as [MaterialName, number][]).map(
    ([name, weightKg]) => ({
      name,
      weightKg,
      value: rounded(weightKg * materialRates[currency][name]),
    }),
  )
  const grossMaterialValue = materials.reduce((total, material) => total + material.value, 0)
  const recyclingValue = {
    low: rounded(grossMaterialValue * 0.55),
    high: rounded(grossMaterialValue * 0.85),
  }
  const assumptions =
    'Repair prices and material rates are illustrative assumptions, not live shop quotes or market prices. Material weights represent a typical device, exclude battery and refrigerant recovery, and do not measure your appliance. Recycling proceeds may be lower or zero after collection and processing fees. Age-based remaining life is a planning estimate, not a guarantee.'

  let explanation: string
  if (hazard) {
    explanation =
      'Your description includes a possible safety hazard. A qualified professional needs to assess it before a repair or recycling decision. The displayed repair range is only a broad planning allowance; no component diagnosis is made.'
  } else if (!fault) {
    explanation =
      'These symptoms do not match a supported fault pattern. A technician should diagnose the appliance; the repair range is a broad planning allowance, not a diagnosis.'
  } else if (multipleFaults) {
    explanation =
      'Your description matches more than one possible issue. A technician should determine whether these symptoms share a cause before quoting a repair. The displayed repair range is a broad planning allowance.'
  } else {
    explanation = `Your symptoms suggest ${fault.fault.replace(/^Possible /, '').toLowerCase()}, which needs confirmation. The midpoint repair estimate is ${Math.round(repairFraction * 100)}% of the replacement price. `
    explanation +=
      recommendation === 'repair'
        ? 'That cost and the assumed remaining service life make a repair worth exploring.'
        : recommendation === 'recycle'
          ? 'The estimated repair cost or appliance age makes replacement and responsible recycling worth considering. Confirm the fault and a written quote before retiring a repairable device.'
          : 'Cost and remaining service life do not clearly favour one option, so get a diagnosis and written quote first.'
  }

  const safetyWarning = hazard
    ? 'Stop using and charging the device. Do not open, press, puncture, or handle a hot, smoking, wet, or swollen device. Disconnect power only if it is safe; keep people away and contact emergency services for smoke or fire. Arrange professional handling and tell the service provider about the hazard.'
    : (profile.warning ?? null)

  const guide: Assessment['guide'] = hazard
    ? [
        {
          title: 'Stop use and keep clear',
          description:
            'Do not run another test or attempt to open the device. If it is hot, smoking, swollen, or wet, do not handle it. For smoke or fire, move away and contact emergency services.',
        },
        {
          title: 'Arrange professional assessment',
          description:
            'Describe the hazard to a qualified service provider and follow their handling instructions. Do not place damaged electronics or batteries in household waste.',
        },
      ]
    : [
        {
          title: 'Record the model and check coverage',
          description:
            'Find the model number on an accessible label, note the symptoms, and check warranty or service coverage before paying for a repair. Switch off and unplug before any external physical inspection, only if the plug and surroundings are dry and safe.',
        },
        fault && !multipleFaults
          ? fault.check
          : {
              title: 'Record the symptoms',
              description:
                'Note when the problem happens and any displayed error codes. Consult the manufacturer’s troubleshooting guide without opening covers or accessing internal components.',
            },
        {
          title: 'Compare a written repair quote',
          description:
            'Ask a qualified technician to confirm the fault, parts, labour, diagnostic fees, and repair warranty. Compare the full quote with an equivalent replacement and consider how long you expect to keep the device.',
        },
        {
          title: 'Choose a responsible next step',
          description:
            'If retiring the appliance, ask an authorised e-waste recycler about collection fees and accepted devices. Back up and securely erase personal data where possible. Leave batteries, refrigerants, and raw-material recovery to professionals.',
        },
      ]

  return {
    recommendation,
    headline: hazard
      ? 'A safety check comes first'
      : recommendation === 'repair'
        ? 'A repair looks worth exploring'
        : recommendation === 'recycle'
          ? 'Consider recycling after a confirmed quote'
          : 'Get a diagnosis before deciding',
    fault: hazard
      ? 'Professional safety assessment needed'
      : multipleFaults
        ? 'Several possible causes need inspection'
        : (fault?.fault ?? 'The cause needs a technician’s diagnosis'),
    explanation: `${explanation} ${assumptions}`,
    summary: explanation,
    repairCost: { low, high },
    replacementCost,
    recyclingValue,
    materials,
    guide,
    safetyWarning,
    lifespan: profile.lifespan,
    remainingYears,
    matched,
  }
}
