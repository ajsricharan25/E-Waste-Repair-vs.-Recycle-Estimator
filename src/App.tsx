import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Earth,
  ExternalLink,
  Heart,
  Info,
  Laptop,
  Leaf,
  Lightbulb,
  MapPin,
  Menu,
  Microwave,
  Plus,
  Recycle,
  Refrigerator,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sprout,
  Trash2,
  TriangleAlert,
  Tv,
  Upload,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import DeviceIllustration from './components/DeviceIllustration'
import WebResearchPanel from './components/WebResearchPanel'
import { appliances, estimate, formatMoney, getDefaultReplacementCost } from './lib/estimator'
import type { ApplianceId, AssessmentInput, Currency } from './lib/estimator'
import { readSavedEstimates, writeSavedEstimates } from './lib/storage'
import type { SavedEstimate } from './lib/storage'
import { buildMapsSearchUrl, getSuggestedService } from './lib/service-search'

type Page = 'estimate' | 'saved' | 'resources'
type Detail = 'overview' | 'guide' | 'materials'
type Result = ReturnType<typeof estimate>

const deviceIcons: Record<ApplianceId, LucideIcon> = {
  'washing-machine': WashingMachine,
  refrigerator: Refrigerator,
  laptop: Laptop,
  smartphone: Smartphone,
  television: Tv,
  microwave: Microwave,
}

const steps = [
  {
    icon: Search,
    title: 'Tell us what’s wrong',
    text: 'A few details about your device and the symptoms you’ve noticed.',
  },
  {
    icon: Wrench,
    title: 'Understand your options',
    text: 'Explore a likely cause, repair costs, and the value of its materials.',
  },
  {
    icon: Sprout,
    title: 'Give it a better ending',
    text: 'Try a safe check, find a repair professional, or recycle responsibly.',
  },
]

function App() {
  const [page, setPage] = useState<Page>('estimate')
  const [menuOpen, setMenuOpen] = useState(false)
  const [appliance, setAppliance] = useState<ApplianceId>('washing-machine')
  const [currency, setCurrency] = useState<Currency>('INR')
  const [age, setAge] = useState('4')
  const [replacementCost, setReplacementCost] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [brandModel, setBrandModel] = useState('')
  const [repairService, setRepairService] = useState('')
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [formError, setFormError] = useState('')
  const [assessment, setAssessment] = useState<{ input: AssessmentInput; result: Result } | null>(
    null,
  )
  const [detail, setDetail] = useState<Detail>('overview')
  const [saved, setSaved] = useState<SavedEstimate[]>(readSavedEstimates)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [location, setLocation] = useState('')
  const [shopError, setShopError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const photoRequest = useRef(0)
  const howDialog = useRef<HTMLDialogElement>(null)
  const contentHeading = useRef<HTMLHeadingElement>(null)
  const device = appliances.find((item) => item.id === appliance)!

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url)
    },
    [photo],
  )
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function focusContent() {
    requestAnimationFrame(() => contentHeading.current?.focus({ preventScroll: true }))
  }

  function navigate(next: Page) {
    setPage(next)
    setMenuOpen(false)
    focusContent()
  }

  function newAssessment() {
    setAssessment(null)
    setSavedId(null)
    setDetail('overview')
    setSymptoms('')
    setBrandModel('')
    setRepairService('')
    photoRequest.current++
    setPhoto(null)
    setPhotoError('')
    setFormError('')
    setReplacementCost('')
    setAge(String(device.defaultAge))
    navigate('estimate')
  }

  async function addPhoto(file?: File) {
    if (!file) return
    const request = ++photoRequest.current
    setPhotoError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('This photo is too large. Choose an image smaller than 8 MB.')
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      if (request !== photoRequest.current) {
        URL.revokeObjectURL(url)
        return
      }
      setPhoto({ url, name: file.name })
    } catch {
      URL.revokeObjectURL(url)
      if (request === photoRequest.current)
        setPhotoError('We couldn’t read that image. Try another photo.')
    }
  }

  function assess(input: AssessmentInput) {
    try {
      const result = estimate(input)
      setAssessment({ input, result })
      setRepairService(getSuggestedService(input, result))
      setDetail('overview')
      setFormError('')
      setSavedId(null)
      navigate('estimate')
      requestAnimationFrame(() =>
        document
          .getElementById('assessment-area')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Please check your device details and try again.',
      )
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    assess({
      appliance,
      currency,
      age: Number(age),
      symptoms: symptoms.trim(),
      ...(replacementCost.trim() ? { replacementCost: Number(replacementCost) } : {}),
    })
  }

  function tryExample() {
    const example = 'The washing machine won’t drain. Water stays in the drum after the cycle ends.'
    setAppliance('washing-machine')
    setAge('4')
    setSymptoms(example)
    setBrandModel('')
    setReplacementCost('')
    photoRequest.current++
    setPhoto(null)
    setPhotoError('')
    assess({ appliance: 'washing-machine', age: 4, symptoms: example, currency })
  }

  function saveAssessment() {
    if (!assessment || savedId) return
    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      input: assessment.input,
      brandModel: brandModel.trim(),
    }
    const next = [entry, ...saved].slice(0, 30)
    try {
      writeSavedEstimates(next)
      setSaved(next)
      setSavedId(entry.id)
      setNotice('Estimate saved on this device.')
    } catch {
      setNotice('Browser storage is unavailable. Download your estimate to keep a copy.')
    }
  }

  function removeSaved(id: string) {
    const next = saved.filter((item) => item.id !== id)
    try {
      writeSavedEstimates(next)
      setSaved(next)
      if (savedId === id) setSavedId(null)
      setNotice('Saved estimate removed.')
    } catch {
      setNotice('Couldn’t update browser storage. Please try again.')
    }
  }

  function openSaved(entry: SavedEstimate) {
    setBrandModel(entry.brandModel ?? '')
    setAppliance(entry.input.appliance)
    setCurrency(entry.input.currency)
    setAge(String(entry.input.age))
    setSymptoms(entry.input.symptoms)
    setReplacementCost(entry.input.replacementCost ? String(entry.input.replacementCost) : '')
    photoRequest.current++
    setPhoto(null)
    assess(entry.input)
    setSavedId(entry.id)
  }

  function downloadAssessment() {
    if (!assessment) return
    const { input, result } = assessment
    const money = (value: number) => formatMoney(value, input.currency)
    const report = [
      'SECOND LIFE — Repair vs. recycle estimate',
      `Created: ${new Date().toLocaleDateString()}`,
      `Device: ${appliances.find((item) => item.id === input.appliance)!.name}`,
      ...(brandModel.trim() ? [`Brand and model: ${brandModel.trim()}`] : []),
      `Age: ${input.age} years`,
      `Symptoms: ${input.symptoms}`,
      '',
      `Recommendation: ${result.headline}`,
      `Possible cause: ${result.fault}`,
      result.explanation,
      `Repair estimate: ${money(result.repairCost.low)}–${money(result.repairCost.high)}`,
      `Replacement budget: ${money(result.replacementCost)}`,
      `Potential material value: ${money(result.recyclingValue.low)}–${money(result.recyclingValue.high)}`,
      ...(result.safetyWarning ? ['', `Safety: ${result.safetyWarning}`] : []),
      '',
      'NEXT STEPS',
      ...result.guide.map((step, index) => `${index + 1}. ${step.title}\n${step.description}`),
      '',
      'MATERIAL ASSUMPTIONS',
      ...result.materials.map(
        (material) =>
          `${material.name}: ${material.weightKg} kg, indicative value ${money(material.value)}`,
      ),
      '',
      'Symptom-based planning estimate, not a confirmed diagnosis or a shop quote. Photos are for reference and are not analyzed. Costs and material recovery assumptions are illustrative, not live market prices. An inspection and local quotes are needed before deciding. Recycler fees and recovery rates affect actual payouts.',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `second-life-${input.appliance}-estimate.txt`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function findShops(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!location.trim()) {
      setShopError('Enter your city or postcode to find nearby options.')
      return
    }
    setShopError('')
    try {
      const url = buildMapsSearchUrl(repairService, location)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setShopError(error instanceof Error ? error.message : 'Check the service and location.')
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <button
          className="brand"
          onClick={() => navigate('estimate')}
          aria-label="Second Life home"
        >
          <span className="brand-mark">
            <RotateCcw size={24} strokeWidth={2.2} />
          </span>
          <span>
            second<span className="brand-light">life</span>
            <span className="brand-dot">.</span>
          </span>
        </button>
        <button
          className="mobile-close icon-button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        >
          <X size={22} />
        </button>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          <NavButton icon={Plus} active={page === 'estimate'} onClick={newAssessment}>
            New assessment
          </NavButton>
          <NavButton icon={Bookmark} active={page === 'saved'} onClick={() => navigate('saved')}>
            Saved estimates{saved.length > 0 && <span className="nav-count">{saved.length}</span>}
          </NavButton>
          <div className="nav-divider" />
          <NavButton
            icon={CircleHelp}
            onClick={() => {
              howDialog.current?.showModal()
              setMenuOpen(false)
            }}
          >
            How it works
          </NavButton>
          <NavButton
            icon={BookOpen}
            active={page === 'resources'}
            onClick={() => navigate('resources')}
          >
            Repair resources
          </NavButton>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={27} strokeWidth={1.5} />
            <p>
              Good things deserve
              <br />a second chance.
            </p>
            <span>A small choice. A lighter footprint.</span>
          </div>
          <div className="sidebar-foot">
            <span className="status-dot" /> A little more circular.
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {page === 'saved'
                ? 'Saved estimates'
                : page === 'resources'
                  ? 'Repair resources'
                  : 'New assessment'}
            </strong>
          </div>
          <div className="topbar-message">
            <Earth size={16} />
            <span>A better tomorrow starts here</span>
          </div>
        </header>
        <main id="main-content">
          {page === 'estimate' && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span /> SMALL FIXES. BIG POSSIBILITIES.
                  </div>
                  <h1>
                    Broken doesn’t
                    <br />
                    mean <em>finished.</em>
                  </h1>
                  <p>
                    Repair it, reuse it, or recycle it right.
                    <br />
                    Find the best next chapter for your device.
                  </p>
                  <div className="hero-tag">
                    <Leaf size={14} /> Better for your wallet. Lighter on the planet.
                  </div>
                </div>
                <DeviceIllustration />
                <span className="hero-art-note">
                  <Heart size={12} /> A little care goes a long way
                </span>
              </section>

              <section
                id="assessment-area"
                className="assessment-section"
                aria-labelledby="assessment-title"
              >
                <div className="section-heading">
                  <div>
                    <div className="eyebrow text-muted">LET’S MAKE A BETTER CHOICE</div>
                    <h2 id="assessment-title" ref={contentHeading} tabIndex={-1}>
                      {assessment
                        ? 'A clearer picture of what’s next.'
                        : 'What’s going on with your device?'}
                    </h2>
                  </div>
                  {!assessment && (
                    <span className="time-note">
                      <Clock3 size={14} /> About 2 minutes
                    </span>
                  )}
                </div>
                <div className="assessment-grid">
                  <div className="assessment-main">
                    <div className="progress-strip" aria-label="Assessment progress">
                      <span className={assessment ? 'complete' : 'current'}>
                        <b>{assessment ? <Check size={12} /> : '1'}</b> Your device
                      </span>
                      <i />
                      <span className={assessment ? 'current' : ''}>
                        <b>2</b> Your options
                      </span>
                      <i />
                      <span>
                        <b>3</b> Your next step
                      </span>
                    </div>
                    {!assessment ? (
                      <form className="device-form" onSubmit={submit}>
                        <fieldset>
                          <legend>
                            Choose your device <span className="required-dot">*</span>
                          </legend>
                          <div className="device-grid">
                            {appliances.map((item) => {
                              const Icon = deviceIcons[item.id]
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  aria-pressed={appliance === item.id}
                                  className={`device-option ${appliance === item.id ? 'selected' : ''}`}
                                  onClick={() => {
                                    setAppliance(item.id)
                                    setAge(String(item.defaultAge))
                                    setReplacementCost('')
                                    setSymptoms('')
                                    setBrandModel('')
                                    setFormError('')
                                  }}
                                >
                                  <Icon size={25} strokeWidth={1.5} />
                                  <span>{item.shortName}</span>
                                  {appliance === item.id && (
                                    <span className="selection-check">
                                      <Check size={10} strokeWidth={3} />
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </fieldset>
                        <div className="field">
                          <label htmlFor="brand-model">
                            Brand and model <span className="optional">Optional</span>
                          </label>
                          <input
                            id="brand-model"
                            placeholder="e.g. Bosch Serie 4 WAN24209IN"
                            value={brandModel}
                            onChange={(event) => setBrandModel(event.target.value)}
                            maxLength={120}
                            aria-describedby="model-hint"
                          />
                          <p className="field-hint" id="model-hint">
                            An exact model helps find relevant parts and published repair prices.
                          </p>
                        </div>
                        <div className="field">
                          <label htmlFor="photo">
                            Add a photo <span className="optional">Optional</span>
                          </label>
                          <input
                            ref={fileInput}
                            id="photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            onChange={(event) => {
                              void addPhoto(event.target.files?.[0])
                              event.target.value = ''
                            }}
                            aria-describedby="photo-note photo-error"
                          />
                          <div
                            className={`drop-zone ${dragging ? 'dragging' : ''} ${photo ? 'has-photo' : ''}`}
                            onDragOver={(event) => {
                              event.preventDefault()
                              setDragging(true)
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event) => {
                              event.preventDefault()
                              setDragging(false)
                              void addPhoto(event.dataTransfer.files[0])
                            }}
                          >
                            {photo ? (
                              <>
                                <img src={photo.url} alt="Your appliance reference photo" />
                                <div className="photo-details">
                                  <strong>{photo.name}</strong>
                                  <span>
                                    <CheckCircle2 size={13} /> Photo added for reference
                                  </span>
                                  <button
                                    type="button"
                                    className="text-button"
                                    onClick={() => fileInput.current?.click()}
                                  >
                                    Choose another photo
                                  </button>
                                </div>
                                <button
                                  className="icon-button"
                                  type="button"
                                  aria-label="Remove photo"
                                  onClick={() => {
                                    photoRequest.current++
                                    setPhoto(null)
                                    setPhotoError('')
                                  }}
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="upload-button"
                                onClick={() => fileInput.current?.click()}
                              >
                                <span className="upload-icon">
                                  <Upload size={22} strokeWidth={1.5} />
                                </span>
                                <strong>
                                  <span>Click to add</span> or drag and drop a photo
                                </strong>
                                <small>JPEG, PNG or WebP · up to 8 MB</small>
                              </button>
                            )}
                          </div>
                          <p className="field-hint" id="photo-note">
                            <ShieldCheck size={13} /> Your photo stays on your device. It isn’t
                            analyzed.
                          </p>
                          {photoError && (
                            <p className="field-error" id="photo-error" role="alert">
                              {photoError}
                            </p>
                          )}
                        </div>
                        <div className="field">
                          <label htmlFor="symptoms">
                            What seems to be the problem? <span className="required-dot">*</span>
                          </label>
                          <textarea
                            id="symptoms"
                            placeholder="e.g. It turns on, but water stays in the drum after a wash…"
                            value={symptoms}
                            onChange={(event) => setSymptoms(event.target.value)}
                            required
                            minLength={8}
                            maxLength={2000}
                            rows={3}
                            aria-describedby="symptoms-hint"
                          />
                          <div className="symptom-suggestions" id="symptoms-hint">
                            <span>Try a symptom:</span>
                            {device.symptomSuggestions.slice(0, 3).map((text) => (
                              <button key={text} type="button" onClick={() => setSymptoms(text)}>
                                {text}
                                <Plus size={11} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="field">
                            <label htmlFor="age">How old is it?</label>
                            <div className="input-unit">
                              <input
                                id="age"
                                type="number"
                                min="0"
                                max="50"
                                step="0.5"
                                required
                                value={age}
                                onChange={(event) => setAge(event.target.value)}
                              />
                              <span>years</span>
                            </div>
                          </div>
                          <div className="field">
                            <label htmlFor="replacement">
                              Replacement budget <span className="optional">Optional</span>
                            </label>
                            <div className="input-unit currency-input">
                              <span>{currency === 'INR' ? '₹' : '$'}</span>
                              <input
                                id="replacement"
                                type="number"
                                min="1"
                                max="10000000"
                                placeholder={String(getDefaultReplacementCost(appliance, currency))}
                                value={replacementCost}
                                onChange={(event) => setReplacementCost(event.target.value)}
                                aria-describedby="budget-hint"
                              />
                            </div>
                          </div>
                        </div>
                        <p id="budget-hint" className="budget-note">
                          Leave the budget blank to use a typical replacement price.
                        </p>
                        <div className="form-footer">
                          <div className="currency-select">
                            <label htmlFor="currency">Estimate in</label>
                            <div>
                              <select
                                id="currency"
                                value={currency}
                                onChange={(event) => {
                                  setCurrency(event.target.value as Currency)
                                  setReplacementCost('')
                                }}
                              >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                              </select>
                              <ChevronDown size={13} />
                            </div>
                          </div>
                          <button className="button button-primary" type="submit">
                            Explore my options <ArrowRight size={17} />
                          </button>
                        </div>
                        {formError && (
                          <p className="field-error" role="alert">
                            {formError}
                          </p>
                        )}
                        <p className="estimate-disclaimer">
                          <Info size={13} /> Symptom-based estimates. A professional can confirm the
                          diagnosis.
                        </p>
                      </form>
                    ) : (
                      <div className="results">
                        <div className="result-topline">
                          <span
                            className={`recommendation-tag ${assessment.result.recommendation}`}
                          >
                            <ResultIcon result={assessment.result} />
                            {assessment.result.recommendation === 'repair'
                              ? 'REPAIR LOOKS PROMISING'
                              : assessment.result.recommendation === 'recycle'
                                ? 'CONSIDER RESPONSIBLE RECYCLING'
                                : 'GET A PROFESSIONAL OPINION'}
                          </span>
                          <button
                            className="text-button"
                            onClick={() => {
                              setAssessment(null)
                              focusContent()
                            }}
                          >
                            <ArrowLeft size={13} /> Edit details
                          </button>
                        </div>
                        <div className="result-device">
                          <span className="result-device-icon">
                            {(() => {
                              const Icon = deviceIcons[assessment.input.appliance]
                              return <Icon size={29} strokeWidth={1.5} />
                            })()}
                          </span>
                          <div>
                            <h3>{device.name}</h3>
                            <span>
                              {assessment.input.age} years old · {assessment.input.currency}{' '}
                              estimates
                            </span>
                          </div>
                          {photo && (
                            <img className="result-photo" src={photo.url} alt="Your device" />
                          )}
                        </div>
                        <h3 className="result-headline">{assessment.result.headline}</h3>
                        <p className="result-intro">{assessment.result.summary}</p>
                        {assessment.result.safetyWarning && (
                          <div className="safety-message" role="alert">
                            <TriangleAlert size={19} />
                            <div>
                              <strong>Put safety first</strong>
                              <p>{assessment.result.safetyWarning}</p>
                            </div>
                          </div>
                        )}
                        <div className="result-tabs" aria-label="Estimate details">
                          {(
                            [
                              { key: 'overview', label: 'Your estimate' },
                              { key: 'guide', label: 'Repair guidance' },
                              { key: 'materials', label: 'Recycling value' },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setDetail(tab.key)}
                              aria-pressed={detail === tab.key}
                              className={detail === tab.key ? 'active' : ''}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        {detail === 'overview' && (
                          <div className="result-panel">
                            <div className="fault-box">
                              <Wrench size={18} />
                              <div>
                                <span>
                                  {assessment.result.matched
                                    ? 'POSSIBLE CAUSE'
                                    : 'NEXT DIAGNOSTIC STEP'}
                                </span>
                                <strong>{assessment.result.fault}</strong>
                              </div>
                            </div>
                            <div className="cost-comparison">
                              <div className="cost-card repair-cost">
                                <Wrench size={18} />
                                <span>Estimated repair</span>
                                <strong>
                                  {formatMoney(
                                    assessment.result.repairCost.low,
                                    assessment.input.currency,
                                  )}
                                  <span>
                                    –
                                    {formatMoney(
                                      assessment.result.repairCost.high,
                                      assessment.input.currency,
                                    )}
                                  </span>
                                </strong>
                                <small>Indicative parts + labor</small>
                              </div>
                              <div className="cost-card">
                                <Recycle size={19} />
                                <span>Potential recycling value</span>
                                <strong>
                                  {formatMoney(
                                    assessment.result.recyclingValue.low,
                                    assessment.input.currency,
                                  )}
                                  <span>
                                    –
                                    {formatMoney(
                                      assessment.result.recyclingValue.high,
                                      assessment.input.currency,
                                    )}
                                  </span>
                                </strong>
                                <small>Material recovery, before fees</small>
                              </div>
                            </div>
                            <div className="replacement-line">
                              <span>Replacement budget</span>
                              <strong>
                                {formatMoney(
                                  assessment.result.replacementCost,
                                  assessment.input.currency,
                                )}
                              </strong>
                            </div>
                            {assessment.result.recommendation === 'repair' &&
                              assessment.result.remainingYears > 0 && (
                                <div className="life-note">
                                  <Sprout size={19} />
                                  <span>
                                    A successful repair could keep it useful for around{' '}
                                    <strong>
                                      {assessment.result.remainingYears} more{' '}
                                      {assessment.result.remainingYears === 1 ? 'year' : 'years'}
                                    </strong>
                                    , based on typical lifespan.
                                  </span>
                                </div>
                              )}
                            <p className="result-footnote">
                              Planning ranges, not a confirmed diagnosis or shop quote. Prices
                              depend on your model, location, and inspection. Material values use
                              illustrative recovery assumptions.
                            </p>
                          </div>
                        )}
                        {detail === 'guide' && (
                          <div className="result-panel guide-panel">
                            <div className="panel-intro">
                              <h4>A safe place to start</h4>
                              <p>
                                Follow your manufacturer’s manual. Internal electrical repairs
                                belong with a qualified technician.
                              </p>
                            </div>
                            <ol className="guide-list">
                              {assessment.result.guide.map((step, index) => (
                                <li key={step.title}>
                                  <span>{String(index + 1).padStart(2, '0')}</span>
                                  <div>
                                    <h4>{step.title}</h4>
                                    <p>{step.description}</p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                            <a
                              className="resource-link"
                              href={`https://www.ifixit.com/Search?query=${encodeURIComponent(device.name)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Look up model-specific repair guides <ArrowUpRight size={16} />
                            </a>
                          </div>
                        )}
                        {detail === 'materials' && (
                          <div className="result-panel">
                            <div className="panel-intro">
                              <h4>There’s value in what’s inside.</h4>
                              <p>
                                Estimated recoverable materials for a typical{' '}
                                {device.name.toLowerCase()}. Your exact model and local recovery
                                rates will vary.
                              </p>
                            </div>
                            <div className="material-table">
                              <div className="material-row table-heading">
                                <span>Material</span>
                                <span>Est. weight</span>
                                <span>Est. value</span>
                              </div>
                              {assessment.result.materials.map((material) => (
                                <div className="material-row" key={material.name}>
                                  <span>
                                    <i />
                                    {material.name}
                                  </span>
                                  <span>
                                    {material.weightKg.toLocaleString(undefined, {
                                      maximumFractionDigits: 3,
                                    })}{' '}
                                    kg
                                  </span>
                                  <strong>
                                    {formatMoney(material.value, assessment.input.currency)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                            <div className="recycling-note">
                              <Recycle size={18} />
                              <p>
                                Let an authorized recycler recover these materials. Collection and
                                processing fees can reduce the payout. Don’t dismantle hazardous
                                components yourself.
                              </p>
                            </div>
                          </div>
                        )}
                        <div hidden={detail !== 'overview'}>
                          <WebResearchPanel
                            request={{
                              appliance: assessment.input.appliance,
                              age: assessment.input.age,
                              symptoms: assessment.input.symptoms,
                              currency: assessment.input.currency,
                              brandModel: brandModel.trim(),
                              location,
                              service: repairService,
                            }}
                          />
                        </div>
                        <div className="result-actions">
                          <button
                            className="button button-primary"
                            onClick={saveAssessment}
                            disabled={Boolean(savedId)}
                          >
                            {savedId ? <Check size={16} /> : <Bookmark size={16} />}
                            {savedId ? 'Estimate saved' : 'Save estimate'}
                          </button>
                          <button className="button button-secondary" onClick={downloadAssessment}>
                            <ArrowDownToLine size={16} /> Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <aside className="assessment-aside" aria-label="Assessment help">
                    {assessment ? (
                      <>
                        <div className="next-step-card">
                          <div className="aside-kicker">
                            <MapPin size={17} /> YOUR NEXT STEP
                          </div>
                          <h3>
                            {assessment.result.recommendation === 'recycle'
                              ? 'Find a responsible recycler.'
                              : 'A local expert can help.'}
                          </h3>
                          <p>
                            {assessment.result.recommendation === 'recycle'
                              ? 'Find a nearby collection point and ask about accepted devices and processing fees.'
                              : 'Search for nearby services related to the suspected component. Edit the service if you have a more specific diagnosis.'}
                          </p>
                          <form onSubmit={findShops}>
                            <label htmlFor="repair-service">Service to look for</label>
                            <div className="location-input service-input">
                              <Wrench size={16} />
                              <input
                                id="repair-service"
                                value={repairService}
                                maxLength={120}
                                onChange={(event) => {
                                  setRepairService(event.target.value)
                                  setShopError('')
                                }}
                                aria-describedby="service-hint"
                              />
                            </div>
                            <p id="service-hint" className="service-hint">
                              Suggested from symptoms; this component hasn’t been confirmed.
                            </p>
                            <label htmlFor="location">City or postcode</label>
                            <div className="location-input">
                              <MapPin size={16} />
                              <input
                                id="location"
                                placeholder={
                                  currency === 'INR'
                                    ? 'e.g. Bengaluru, 560001'
                                    : 'e.g. Austin, 78701'
                                }
                                value={location}
                                onChange={(event) => {
                                  setLocation(event.target.value)
                                  setShopError('')
                                }}
                                maxLength={120}
                              />
                            </div>
                            {shopError && (
                              <p className="field-error" role="alert">
                                {shopError}
                              </p>
                            )}
                            <button className="button button-primary" type="submit">
                              Find{' '}
                              {assessment.result.recommendation === 'recycle'
                                ? 'recyclers'
                                : 'repair shops'}
                              <ArrowUpRight size={16} />
                            </button>
                          </form>
                          <small>
                            Opens a targeted Google Maps search. Call to confirm that a shop handles
                            this component and ask for its final price.
                          </small>
                        </div>
                        <div className="quote-checklist">
                          <h4>A few things to ask</h4>
                          {[
                            'Do you repair this component and model?',
                            'Does the quote include parts and labor?',
                            'Is there a warranty on the repair?',
                          ].map((text) => (
                            <p key={text}>
                              <Check size={15} />
                              {text}
                            </p>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="promise-card">
                          <span className="promise-icon">
                            <Sprout size={30} strokeWidth={1.4} />
                          </span>
                          <div className="eyebrow">A SECOND CHANCE STARTS HERE</div>
                          <h3>
                            Sometimes, all it needs
                            <br />
                            is a little fixing.
                          </h3>
                          <p>You don’t need to be an expert to make a more informed choice.</p>
                          <div className="promise-divider" />
                          <Feature
                            icon={Wrench}
                            title="Understand the problem"
                            text="Find a possible cause from the symptoms you describe."
                          />
                          <Feature
                            icon={Recycle}
                            title="Compare your options"
                            text="See indicative repair costs and material recycling value."
                          />
                          <Feature
                            icon={Heart}
                            title="Choose with confidence"
                            text="Get practical guidance for your next step."
                          />
                          <span className="promise-leaf">
                            <Leaf size={90} strokeWidth={0.7} />
                          </span>
                        </div>
                        <button className="example-card" onClick={tryExample}>
                          <span className="example-icon">
                            <Lightbulb size={21} />
                          </span>
                          <span>
                            <strong>Just looking around?</strong>
                            <small>Explore a washing machine example</small>
                          </span>
                          <ArrowUpRight size={18} />
                        </button>
                      </>
                    )}
                    <div className="privacy-note">
                      <ShieldCheck size={20} strokeWidth={1.5} />
                      <p>
                        <strong>Your device. Your data.</strong>Photos and saved estimates stay in
                        this browser. No account needed.
                      </p>
                    </div>
                  </aside>
                </div>
              </section>
              <section className="how-strip" aria-labelledby="how-title">
                <div className="how-strip-title">
                  <span className="eyebrow">LESS GUESSWORK, MORE GOOD</span>
                  <h2 id="how-title">
                    A small step toward
                    <br />a longer life.
                  </h2>
                </div>
                {steps.map((step, index) => (
                  <div className="how-step" key={step.title}>
                    <div>
                      <step.icon size={19} strokeWidth={1.5} />
                      <span>0{index + 1}</span>
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                ))}
              </section>
            </>
          )}

          {page === 'saved' && (
            <section className="secondary-page">
              <div className="eyebrow text-muted">PICK UP WHERE YOU LEFT OFF</div>
              <div className="page-heading">
                <div>
                  <h1 ref={contentHeading} tabIndex={-1}>
                    Your saved estimates<span>.</span>
                  </h1>
                  <p>Keep your options close. These estimates are stored only in this browser.</p>
                </div>
                <button className="button button-primary" onClick={newAssessment}>
                  <Plus size={16} /> New assessment
                </button>
              </div>
              {saved.length === 0 ? (
                <div className="empty-state">
                  <span>
                    <Bookmark size={31} strokeWidth={1.5} />
                  </span>
                  <h2>A little space for your next steps.</h2>
                  <p>
                    Save an estimate after exploring your device’s options.
                    <br />
                    You’ll find it right here when you need it.
                  </p>
                  <button className="button button-primary" onClick={newAssessment}>
                    Assess a device <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="saved-list">
                  {saved.map((entry) => {
                    const item = appliances.find((item) => item.id === entry.input.appliance)!
                    const Icon = deviceIcons[item.id]
                    const result = estimate(entry.input)
                    return (
                      <article className="saved-card" key={entry.id}>
                        <span className="saved-device-icon">
                          <Icon size={26} strokeWidth={1.5} />
                        </span>
                        <div>
                          <span className="saved-date">
                            {new Date(entry.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <h2>{item.name}</h2>
                          <p>{entry.input.symptoms}</p>
                          <span className="saved-price">
                            Repair: {formatMoney(result.repairCost.low, entry.input.currency)}–
                            {formatMoney(result.repairCost.high, entry.input.currency)}
                          </span>
                        </div>
                        <div className="saved-card-actions">
                          <button
                            className="button button-secondary"
                            onClick={() => openSaved(entry)}
                          >
                            View estimate <ArrowRight size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${item.name} estimate`}
                            onClick={() => removeSaved(entry.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
              <p className="storage-note">
                <Info size={14} /> Clearing browser data removes saved estimates. Download a copy to
                keep it elsewhere. Up to 30 estimates are stored.
              </p>
            </section>
          )}

          {page === 'resources' && (
            <section className="secondary-page">
              <div className="eyebrow text-muted">A LITTLE KNOW-HOW GOES A LONG WAY</div>
              <div className="page-heading">
                <div>
                  <h1 ref={contentHeading} tabIndex={-1}>
                    Keep good things going<span>.</span>
                  </h1>
                  <p>Useful starting points for repair, maintenance, and responsible recycling.</p>
                </div>
                <span className="resource-heading-icon">
                  <BookOpen size={37} strokeWidth={1.3} />
                </span>
              </div>
              <div className="resources-grid">
                <ResourceCard
                  icon={Wrench}
                  title="Find a repair guide"
                  text="Search iFixit’s community guides for your exact make and model. Check the difficulty, tools, and safety notes before you begin."
                  href="https://www.ifixit.com/Guide"
                  link="Explore iFixit guides"
                />
                <ResourceCard
                  icon={BookOpen}
                  title="Start with the manual"
                  text="Your manufacturer’s support site has model-specific troubleshooting and warranty information. Keep your model number handy."
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${device.name} manufacturer official support manual`)}`}
                  link="Search for official support"
                />
                <ResourceCard
                  icon={Recycle}
                  title="Recycle responsibly"
                  text="Find the e-waste guidance and authorized recycler information from India’s Central Pollution Control Board."
                  href="https://cpcb.nic.in/e-waste/"
                  link="Read CPCB e-waste guidance"
                />
                <ResourceCard
                  icon={Earth}
                  title="Explore U.S. recycling options"
                  text="The U.S. Environmental Protection Agency explains donation, electronics recycling, and how to choose a responsible destination."
                  href="https://www.epa.gov/recycle/electronics-donation-and-recycling"
                  link="Read EPA recycling guidance"
                />
              </div>
              <div className="resource-safety">
                <ShieldCheck size={25} />
                <div>
                  <h2>Know when to call a professional.</h2>
                  <p>
                    Smoke, sparks, a swollen battery, exposed wiring, or a burning smell need expert
                    attention. Stop using the device. Don’t open batteries, microwave cabinets, or
                    refrigeration systems. For active fire or immediate danger, move away and
                    contact emergency services.
                  </p>
                </div>
              </div>
              <div className="data-note">
                <h2>How our estimates work</h2>
                <p>
                  Second Life matches the symptoms you enter to common faults, then combines
                  illustrative repair costs, typical lifespans, and material recovery assumptions.
                  Age and your replacement budget help suggest a next step. INR and USD use separate
                  illustrative price profiles. They are not converted using live exchange rates.
                </p>
                <p>
                  These are planning estimates, not AI photo diagnoses, verified shop quotes, or
                  current scrap prices. An exact model, an inspection, and local quotes are needed
                  to confirm the best option. Photos are kept in memory for reference and are not
                  included in saved estimates.
                </p>
                <p>
                  Web research looks for published guidance and prices for your model, symptoms,
                  repair service, and area. Source links and a checked date accompany each answer.
                  Published prices may have conditions; confirm the final charge with a repairer.
                  Google Maps searches use the suggested component or service, which you can edit.
                </p>
              </div>
            </section>
          )}

          <footer className="page-footer">
            <span>
              <RotateCcw size={15} /> Thoughtfully repaired. Responsibly recycled.
            </span>
            <button
              className="text-button"
              onClick={() => {
                howDialog.current?.showModal()
              }}
            >
              A little about Second Life <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={howDialog}
        className="how-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) howDialog.current?.close()
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          <button
            className="icon-button dialog-close"
            aria-label="Close how it works"
            onClick={() => howDialog.current?.close()}
          >
            <X size={20} />
          </button>
          <span className="dialog-icon">
            <RotateCcw size={26} />
          </span>
          <div className="eyebrow">A BETTER NEXT CHAPTER</div>
          <h2 id="dialog-title">
            Repair or recycle,
            <br />
            with a little more clarity.
          </h2>
          <p>Second Life helps you weigh your options before giving up on a device.</p>
          <div className="dialog-steps">
            {steps.map((step) => (
              <Feature key={step.title} icon={step.icon} title={step.title} text={step.text} />
            ))}
          </div>
          <div className="dialog-note">
            <Info size={18} />
            <p>
              Estimates use symptom matching and illustrative prices. Photos aren’t analyzed. Web
              research can add published guidance with source links. Shop search opens Google Maps
              for the suspected repair service; confirm the component and final price with the
              repairer.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => {
              howDialog.current?.close()
              navigate('estimate')
            }}
          >
            Let’s get started <ArrowRight size={16} />
          </button>
        </div>
      </dialog>
      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
        {notice && (
          <>
            <Info size={17} />
            {notice}
            <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function NavButton({
  icon: Icon,
  active,
  children,
  onClick,
}: {
  icon: LucideIcon
  active?: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      className={`nav-button ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={18} strokeWidth={1.7} />
      <span>{children}</span>
    </button>
  )
}

function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="feature">
      <span>
        <Icon size={19} strokeWidth={1.6} />
      </span>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  )
}

function ResourceCard({
  icon: Icon,
  title,
  text,
  href,
  link,
}: {
  icon: LucideIcon
  title: string
  text: string
  href: string
  link: string
}) {
  return (
    <article className="resource-card">
      <span>
        <Icon size={25} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <a href={href} target="_blank" rel="noreferrer">
        {link}
        <ExternalLink size={15} />
      </a>
    </article>
  )
}

function ResultIcon({ result }: { result: Result }) {
  const Icon =
    result.recommendation === 'repair'
      ? BadgeCheck
      : result.recommendation === 'recycle'
        ? Recycle
        : Search
  return <Icon size={14} />
}

export default App
