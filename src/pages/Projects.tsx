import { useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleHelp,
  Clock3,
  Crosshair,
  FlaskConical,
  MapPin,
  Orbit,
  Radar,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api.ts'
import { Badge } from '../components/ui.tsx'
import { useApp } from '../context/AppContext.tsx'
import { projectMatcher, selectResourceMatches, type ProjectMatch } from '../lib/projectMatching.ts'

interface AvailableSlot {
  start: string
  end: string
  label: string
  available: boolean
  pendingCount: number
  confirmed: boolean
}

interface PlannedResource {
  match: ProjectMatch
  date?: string
  slot?: Pick<AvailableSlot, 'start' | 'end' | 'label' | 'pendingCount'>
  explanation: string
}

const NODE_POSITIONS = [
  { x: 50, y: 12 },
  { x: 80, y: 31 },
  { x: 80, y: 70 },
  { x: 50, y: 88 },
  { x: 20, y: 70 },
  { x: 20, y: 31 },
]

const SAMPLE_DESCRIPTION =
  'I am building an autonomous agricultural robot. I need robotics equipment, sensors and a testing workstation.'

function localDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function defaultDeadline() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return localDate(date)
}

function weekdayDatesUntil(deadline: string) {
  const [year, month, day] = deadline.split('-').map(Number)
  const lastDay = new Date(year, month - 1, day, 12)
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  cursor.setDate(cursor.getDate() + 1)
  const dates: string[] = []
  while (cursor <= lastDay && dates.length < 60) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) dates.push(localDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function fitDurationWindow(slots: AvailableSlot[], durationHours: number) {
  for (let startIndex = 0; startIndex < slots.length; startIndex += 1) {
    const first = slots[startIndex]
    if (!first?.available) continue
    let end = first.end
    let pendingCount = first.pendingCount
    let elapsed = (Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5))) -
      (Number(first.start.slice(0, 2)) * 60 + Number(first.start.slice(3, 5)))
    if (elapsed === durationHours * 60) {
      return { start: first.start, end, label: `${first.start}–${end}`, pendingCount }
    }
    for (let nextIndex = startIndex + 1; nextIndex < slots.length; nextIndex += 1) {
      const next = slots[nextIndex]
      if (!next?.available || next.start !== end) break
      pendingCount += next.pendingCount
      end = next.end
      elapsed += (Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5))) -
        (Number(next.start.slice(0, 2)) * 60 + Number(next.start.slice(3, 5)))
      if (elapsed === durationHours * 60) {
        return { start: first.start, end, label: `${first.start}–${end}`, pendingCount }
      }
      if (elapsed > durationHours * 60) break
    }
  }
  return undefined
}

function bookingHref(resource: PlannedResource, projectTitle: string, description: string, deadline: string) {
  if (!resource.date || !resource.slot) return '/book'
  const params = new URLSearchParams({
    equipment: resource.match.equipment.id,
    date: resource.date,
    start: resource.slot.start,
    end: resource.slot.end,
    projectTitle,
    projectDetails: description,
    deadline,
  })
  return `/book?${params.toString()}`
}

function ResourceNetwork({ matches, selectedId, onSelect }: {
  matches: ProjectMatch[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const positions = matches.map((match, index) => ({
    match,
    point: NODE_POSITIONS[index],
  })).filter((node) => node.point)
  const selected = matches.find((match) => match.equipment.id === selectedId)

  return (
    <section className="card project-network-card" aria-label="Interactive project resource network">
      <div className="project-panel-heading">
        <div><span className="section-overline">PROJECT RESOURCE MAP</span><h2>Connected capabilities</h2></div>
        <span className="network-live"><i /> {matches.length} linked resources</span>
      </div>
      <div className="project-network">
        <svg className="project-network-lines" viewBox="0 0 600 300" aria-hidden="true">
          <defs>
            <linearGradient id="networkLine" x1="0" x2="1">
              <stop offset="0%" stopColor="#9165ff" stopOpacity=".14" />
              <stop offset="50%" stopColor="#9165ff" stopOpacity=".64" />
              <stop offset="100%" stopColor="#48ddf5" stopOpacity=".22" />
            </linearGradient>
          </defs>
          {positions.map(({ match, point }) => (
            <line
              key={match.equipment.id}
              x1="300"
              y1="150"
              x2={point.x * 6}
              y2={point.y * 3}
              className={match.equipment.id === selectedId ? 'network-edge is-selected' : 'network-edge'}
            />
          ))}
          <circle cx="300" cy="150" r="88" fill="none" stroke="url(#networkLine)" strokeDasharray="2 7" />
          <circle cx="300" cy="150" r="122" fill="none" stroke="#a1adc5" strokeOpacity=".09" strokeDasharray="1 9" />
        </svg>
        <div className="network-center">
          <span><Crosshair size={19} /></span><strong>YOUR<br />PROJECT</strong>
          <small>{matches.length} resource links</small>
        </div>
        {positions.map(({ match, point }, index) => (
          <button
            type="button"
            className={`network-node ${match.equipment.id === selectedId ? 'is-selected' : ''} ${match.classification}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            key={match.equipment.id}
            onClick={() => onSelect(match.equipment.id)}
            aria-pressed={match.equipment.id === selectedId}
            aria-label={`${match.equipment.name}, ${match.equipment.department}, ${match.score}% compatibility`}
          >
            <span className="network-node-index">0{index + 1}</span>
            <span className="network-node-orbit"><i /></span>
            <strong>{match.equipment.name}</strong>
            <small>{match.equipment.department}</small>
          </button>
        ))}
      </div>
      {selected && (
        <div className="network-selection">
          <span className="network-selection-icon"><FlaskConical size={16} /></span>
          <div><strong>{selected.equipment.name}</strong><span>{selected.reasons[0]}</span></div>
          <Link to={`/equipment/${selected.equipment.id}`}>Open passport <ArrowRight size={13} /></Link>
        </div>
      )}
      <div className="network-legend"><span><i className="legend-essential" /> Essential match</span><span><i className="legend-optional" /> Supporting resource</span><span>Lines connect project needs to catalogue resources</span></div>
    </section>
  )
}

export function Projects() {
  const { equipment, loading, user } = useApp()
  const [today] = useState(() => localDate(new Date()))
  const [projectTitle, setProjectTitle] = useState('Autonomous agricultural robot')
  const [description, setDescription] = useState(SAMPLE_DESCRIPTION)
  const [deadline, setDeadline] = useState(defaultDeadline)
  const [durationHours, setDurationHours] = useState(2)
  const [matches, setMatches] = useState<ProjectMatch[]>([])
  const [schedule, setSchedule] = useState<PlannedResource[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null)

  function clearResults() {
    setMatches([])
    setSchedule([])
    setSelectedId(null)
    setPlanError(null)
    setValidationError(null)
    setNoMatchMessage(null)
  }

  async function buildPlan() {
    setValidationError(null)
    setPlanError(null)
    if (projectTitle.trim().length < 4) {
      setValidationError('Add a project title of at least four characters.')
      return
    }
    if (description.trim().length < 12) {
      setValidationError('Add a few project requirements so the catalogue can identify relevant resources.')
      return
    }
    if (!deadline || deadline <= today) {
      setValidationError('Choose a project deadline after today.')
      return
    }

    const recommendations = selectResourceMatches(projectMatcher.match(description, equipment), 6)
    setMatches(recommendations)
    setSchedule([])
    setSelectedId(recommendations[0]?.equipment.id ?? null)
    if (!recommendations.length) {
      setNoMatchMessage('No strong catalogue match found. Try naming a technology, equipment type, material, or test method from your project.')
      return
    }

    const dates = weekdayDatesUntil(deadline)
    let nextDateIndex = 0
    setAnalyzing(true)
    try {
      const planned: PlannedResource[] = []
      for (const match of recommendations) {
        const resource = match.equipment
        if (resource.status === 'maintenance') {
          planned.push({ match, explanation: 'Unavailable: this resource is marked in maintenance.' })
          continue
        }

        let selectedDate: string | undefined
        let selectedSlot: ReturnType<typeof fitDurationWindow>
        for (let dateIndex = nextDateIndex; dateIndex < dates.length; dateIndex += 1) {
          const date = dates[dateIndex]
          if (!date) continue
          const { slots } = await api.slots(resource.id, date)
          const window = fitDurationWindow(slots, durationHours)
          if (window) {
            selectedDate = date
            selectedSlot = window
            nextDateIndex = dateIndex + 1
            break
          }
        }

        if (!selectedDate || !selectedSlot) {
          planned.push({
            match,
            explanation: `No contiguous ${durationHours}-hour window is free before the project deadline.`,
          })
          continue
        }

        planned.push({
          match,
          date: selectedDate,
          slot: selectedSlot,
          explanation: selectedSlot.pendingCount
            ? `Earliest open window before the deadline; ${selectedSlot.pendingCount} pending request(s) may compete.`
            : 'Earliest open window before the deadline; no pending request is listed for this slot.',
        })
      }
      setSchedule(planned)
    } catch (error) {
      setPlanError(error instanceof Error ? `Could not check live availability: ${error.message}` : 'Could not check live availability.')
    } finally {
      setAnalyzing(false)
    }
  }

  const essentialCount = matches.filter((match) => match.classification === 'essential').length
  const optionalCount = matches.length - essentialCount
  const scheduledCount = schedule.filter((item) => item.slot).length
  const student = user?.role === 'student'

  return (
    <div className="page project-studio">
      <header className="project-hero">
        <div className="project-hero-orb" aria-hidden="true" />
        <div className="project-hero-copy">
          <span className="project-product-label"><Orbit size={14} /> PROJECT-TO-RESOURCE INTELLIGENCE</span>
          <h1>Start with the idea.<br /><span>Find what makes it real.</span></h1>
          <p>Describe the project you're building. Labora maps it to campus capabilities, explains every match and sequences a plan against real booking availability.</p>
        </div>
        <div className="project-hero-visual" aria-hidden="true">
          <div className="project-orbit orbit-outer" /><div className="project-orbit orbit-inner" />
          <span className="orbit-resource orbit-one"><FlaskConical size={15} /></span>
          <span className="orbit-resource orbit-two"><Radar size={15} /></span>
          <span className="orbit-resource orbit-three"><CalendarClock size={15} /></span>
          <span className="orbit-core"><Sparkles size={19} /></span>
        </div>
      </header>

      <div className="project-demo-notice">
        <span className="demo-indicator"><i /> DEMO CATALOGUE</span>
        <span>Matches and availability use Labora's sample campus resources. Matching is transparent and rule-based; no LLM is used here.</span>
        <Link to="/allocation">See fair allocation <ArrowRight size={13} /></Link>
      </div>

      <div className="project-studio-grid">
        <section className="card project-brief-card">
          <div className="project-panel-heading">
            <div><span className="section-overline">01 / PROJECT BRIEF</span><h2>What are you building?</h2></div>
            <span className="brief-step">01</span>
          </div>
          <label htmlFor="project-title">Project name</label>
          <input
            id="project-title"
            value={projectTitle}
            maxLength={120}
            onChange={(event) => { setProjectTitle(event.target.value); clearResults() }}
            placeholder="e.g. Autonomous greenhouse rover"
          />
          <label htmlFor="project-description">Describe the engineering work and what you need</label>
          <textarea
            id="project-description"
            className="project-brief-input"
            value={description}
            maxLength={1000}
            onChange={(event) => { setDescription(event.target.value); clearResults() }}
            placeholder="Describe the system, components, testing and workspace you need…"
          />
          <div className="project-brief-hint"><CircleHelp size={13} /><span>Include components, techniques, or the kind of testing you plan to do.</span></div>
          <div className="project-input-row">
            <div><label htmlFor="project-deadline">Project deadline</label><input id="project-deadline" type="date" min={today} value={deadline} onChange={(event) => { setDeadline(event.target.value); clearResults() }} /></div>
            <div><label htmlFor="session-duration">Session length</label><select id="session-duration" value={durationHours} onChange={(event) => { setDurationHours(Number(event.target.value)); clearResults() }}><option value={2}>2 hours</option><option value={4}>4 hours</option></select></div>
          </div>
          {validationError && <p className="field-error" role="alert">{validationError}</p>}
          <button className="btn btn-primary project-build-button" type="button" disabled={loading || analyzing} onClick={() => void buildPlan()}>
            {analyzing ? <><span className="button-spinner" /> Checking campus resources…</> : <><Sparkles size={15} /> Match resources & build plan <ArrowRight size={15} /></>}
          </button>
          <p className="project-form-footnote">The matching formula is visible below each result. Availability is checked against confirmed sample reservations.</p>
        </section>

        <section className="project-results-column">
          {!matches.length ? (
            <div className="card project-empty-state">
              <div className="empty-radar"><Radar size={24} /></div>
              <span className="section-overline">02 / RESOURCE INTELLIGENCE</span>
              <h2>Your project is the starting point.</h2>
              <p>{noMatchMessage ?? 'Run a match to see relevant campus resources connect to your requirements—with departments, fit scores and explanations.'}</p>
              <div className="empty-capabilities"><span><Check size={12} /> Essential resources</span><span><Check size={12} /> Optional support</span><span><Check size={12} /> Live slot checks</span></div>
            </div>
          ) : (
            <ResourceNetwork matches={matches} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {planError && <p className="project-plan-error" role="alert">{planError}</p>}
        </section>
      </div>

      {matches.length > 0 && (
        <section className="project-matches-section">
          <div className="project-section-heading">
            <div><span className="section-overline">03 / CATALOGUE MATCHES</span><h2>Resources for this build</h2><p>Ranked from the project brief using catalogue evidence—not generated text.</p></div>
            <div className="match-counts"><span className="essential-count">{essentialCount} essential</span><span className="optional-count">{optionalCount} supporting</span></div>
          </div>
          <div className="project-match-grid">
            {matches.map((match, index) => {
              const planned = schedule.find((item) => item.match.equipment.id === match.equipment.id)
              return (
                <article className={`card project-match-card ${selectedId === match.equipment.id ? 'is-selected' : ''}`} key={match.equipment.id}>
                  <div className="match-card-top">
                    <span className="match-rank">0{index + 1}</span>
                    <Badge status={match.equipment.status} />
                    <span className={`match-classification ${match.classification}`}>{match.classification}</span>
                  </div>
                  <div className="match-card-title-row">
                    <div className="match-resource-symbol"><FlaskConical size={17} /></div>
                    <div><h3>{match.equipment.name}</h3><span>{match.equipment.category}</span></div>
                  </div>
                  <div className="match-owner"><MapPin size={12} /><strong>{match.equipment.department}</strong><span>{match.equipment.location}</span></div>
                  <div className="match-score-row">
                    <div><span>COMPATIBILITY</span><strong>{match.score}<small>/100</small></strong></div>
                    <div className="match-score-track"><span style={{ width: `${match.score}%` }} /></div>
                  </div>
                  <details className="match-explanation">
                    <summary>Why this resource <span>Score breakdown</span></summary>
                    <ul>{match.reasons.map((reason) => <li key={reason}><Check size={12} />{reason}</li>)}</ul>
                    <div className="score-formula">
                      <span>Baseline <b>{match.scoreBreakdown.baseline}</b></span>
                      <span>Requested capabilities <b>+{match.scoreBreakdown.requestedCapabilities}</b></span>
                      <span>Related capabilities <b>+{match.scoreBreakdown.inferredCapabilities}</b></span>
                      <span>Catalogue evidence <b>+{match.scoreBreakdown.catalogueEvidence}</b></span>
                      <span>Availability <b>{match.scoreBreakdown.availabilityAdjustment > 0 ? '+' : ''}{match.scoreBreakdown.availabilityAdjustment}</b></span>
                    </div>
                  </details>
                  <div className="match-card-actions">
                    <Link to={`/equipment/${match.equipment.id}`}>Resource passport <ArrowRight size={13} /></Link>
                    {planned?.slot && student && <Link className="match-book-link" to={bookingHref(planned, projectTitle, description, deadline)}>Request this slot</Link>}
                    {planned?.slot && !student && <Link className="match-book-link" to="/enter">Sign in to request</Link>}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {matches.length > 0 && (
        <section className="project-plan-section">
          <div className="project-section-heading">
            <div><span className="section-overline">04 / DEADLINE-AWARE PLAN</span><h2>A sequence that fits your deadline.</h2><p>Each resource is scheduled in a separate weekday window. Confirmed reservations are excluded.</p></div>
            <span className="plan-duration-chip"><Clock3 size={13} /> {durationHours}h resource sessions</span>
          </div>
          {analyzing ? (
            <div className="card project-planning-state"><span className="button-spinner" /> Checking booking calendars and arranging resource sessions…</div>
          ) : schedule.length ? (
            <div className="project-timeline">
              {schedule.map((planned, index) => (
                <article className={`timeline-row ${planned.slot ? 'has-slot' : 'no-slot'}`} key={planned.match.equipment.id}>
                  <div className="timeline-marker"><span>{String(index + 1).padStart(2, '0')}</span><i /></div>
                  <div className="timeline-date">
                    {planned.date ? <><strong>{new Date(`${planned.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</strong><span>{new Date(`${planned.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></> : <><strong>—</strong><span>No slot</span></>}
                  </div>
                  <div className="timeline-resource"><Link to={`/equipment/${planned.match.equipment.id}`}>{planned.match.equipment.name}</Link><span>{planned.match.equipment.department} · {planned.match.classification}</span></div>
                  <div className="timeline-window">{planned.slot ? <><CalendarClock size={14} /><strong>{planned.slot.label}</strong><span>{durationHours} hours</span></> : <span className="timeline-unavailable">{planned.explanation}</span>}</div>
                  <div className={`timeline-availability ${planned.slot ? 'available' : 'unavailable'}`}>
                    {planned.slot ? <><i />{planned.slot.pendingCount ? `${planned.slot.pendingCount} competing request(s)` : 'Available'}</> : <><i />{planned.match.equipment.status === 'maintenance' ? 'Maintenance' : 'No slot by deadline'}</>}
                  </div>
                  <p className="timeline-explanation">{planned.explanation}</p>
                  {planned.slot && student && <Link className="timeline-action" to={bookingHref(planned, projectTitle, description, deadline)} aria-label={`Request ${planned.match.equipment.name} on ${planned.date}`}>Request slot <ArrowRight size={13} /></Link>}
                  {planned.slot && !student && <Link className="timeline-action" to="/enter">Sign in to book <ArrowRight size={13} /></Link>}
                </article>
              ))}
            </div>
          ) : (
            <div className="card project-planning-state"><span className="button-spinner" /> Preparing resource dates…</div>
          )}
          {!!scheduledCount && <p className="project-plan-footnote"><Check size={13} /> {scheduledCount} of {schedule.length} recommended resources have an open {durationHours}-hour calendar window before {new Date(`${deadline}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}. Pending requests are shown as competition, not as confirmed reservations.</p>}
        </section>
      )}

      <div className="project-method-note"><span><CircleHelp size={15} /></span><p><strong>How matching works</strong> Project language is mapped to a curated set of engineering capabilities, then compared with equipment names, categories, specifications, tags and descriptions. Scores and evidence are shown above. This demo uses transparent rules; future model integrations can implement the same matcher contract without changing the booking flow.</p></div>
    </div>
  )
}
