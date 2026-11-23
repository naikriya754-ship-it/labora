import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.ts'
import { useApp } from '../context/AppContext.tsx'
import type { SuggestedSlot } from '../../shared/types.ts'

export function Booking() {
  const { equipment, refresh, notify, user } = useApp()
  const [params] = useSearchParams()
  const [equipmentId, setEquipmentId] = useState(() => params.get('equipment') ?? '')
  const [date, setDate] = useState(() => params.get('date') ?? '2026-11-27')
  const [start, setStart] = useState(() => params.get('start') ?? '')
  const [end, setEnd] = useState(() => params.get('end') ?? '')
  const [projectTitle, setProjectTitle] = useState(() => params.get('projectTitle') ?? '')
  const [projectDetails, setProjectDetails] = useState(() => params.get('projectDetails') ?? '')
  const [deadline, setDeadline] = useState(() => params.get('deadline') ?? '2026-12-04')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)
  const [alts, setAlts] = useState<SuggestedSlot[]>([])
  const [slots, setSlots] = useState<Array<{ start: string; end: string; label: string; available: boolean; pendingCount: number; confirmed: boolean }>>([])

  useEffect(() => {
    if (!equipmentId || !date) return
    api.slots(equipmentId, date).then((d) => setSlots(d.slots)).catch(() => setSlots([]))
  }, [equipmentId, date])

  const selected = useMemo(() => equipment.find((e) => e.id === equipmentId), [equipment, equipmentId])

  function validate() {
    const next: Record<string, string> = {}
    if (!equipmentId) next.equipmentId = 'Select equipment.'
    if (!date) next.date = 'Choose a date.'
    if (!start || !end) next.slot = 'Choose an open time slot.'
    if (projectTitle.trim().length < 4) next.projectTitle = 'Enter a project title.'
    if (!deadline) next.deadline = 'Enter the project deadline.'
    if (deadline && date && deadline < date) next.deadline = 'Deadline must be on or after the booking date.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    try {
      const res = await api.createBooking({
        equipmentId,
        date,
        start,
        end,
        projectTitle,
        projectDetails,
        deadline,
      })
      setAlts([])
      setResult(
        `Booking ${res.booking.id.slice(0, 8)} submitted as ${res.booking.status}.` +
          (res.pendingConflicts ? ' Other pending claims exist — faculty will see the conflict.' : ''),
      )
      notify('Booking request sent.')
      await refresh()
    } catch (err) {
      const body = (err as Error & { body?: { alternatives?: SuggestedSlot[]; error?: string } }).body
      setAlts(body?.alternatives ?? [])
      setResult(null)
      notify(body?.error || (err as Error).message, 'err')
    }
  }

  if (user?.role === 'faculty') {
    return <div className="page"><p>Switch to a student persona to create bookings.</p></div>
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Reservations</p>
          <h1>Smart booking</h1>
          <p className="muted">Confirmed slots stay locked. Double-booking a confirmed reservation is rejected with alternatives.</p>
        </div>
      </div>
      <form className="grid-2" onSubmit={(e) => void submit(e)}>
        <section className="card">
          <label htmlFor="eq">Equipment</label>
          <select id="eq" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="">Select an instrument</option>
            {equipment.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {errors.equipmentId && <p className="field-error">{errors.equipmentId}</p>}
          {selected && <p className="muted">{selected.location} · {selected.status}</p>}
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <p id="slot-label">Available time slots</p>
          <div className="slot-grid" role="group" aria-labelledby="slot-label">
            {slots.map((s) => (
              <button
                type="button"
                key={s.start}
                className={`slot ${start < s.end && s.start < end ? 'selected' : ''} ${s.available ? '' : 'taken'}`}
                disabled={!s.available}
                onClick={() => { setStart(s.start); setEnd(s.end) }}
              >
                {s.label} {s.confirmed ? '(blocked)' : s.pendingCount ? `(${s.pendingCount} pending)` : ''}
              </button>
            ))}
          </div>
          {errors.slot && <p className="field-error">{errors.slot}</p>}
        </section>
        <section className="card">
          <label htmlFor="title">Project title</label>
          <input id="title" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
          {errors.projectTitle && <p className="field-error">{errors.projectTitle}</p>}
          <label htmlFor="details">Project details</label>
          <textarea id="details" value={projectDetails} onChange={(e) => setProjectDetails(e.target.value)} />
          <label htmlFor="deadline">Project deadline</label>
          <input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          {errors.deadline && <p className="field-error">{errors.deadline}</p>}
          <button className="btn btn-primary" type="submit">Submit booking request</button>
          {result && <p className="notice" style={{ marginTop: 12 }}>{result}</p>}
          {alts.length > 0 && (
            <div>
              <h3>Recommended alternatives</h3>
              {alts.map((a) => (
                <p key={a.date + a.start}>{a.date} {a.start}–{a.end} · score {a.score}</p>
              ))}
            </div>
          )}
        </section>
      </form>
    </div>
  )
}
