import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Wrench } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.ts'
import { Badge } from '../components/ui.tsx'
import { useApp } from '../context/AppContext.tsx'
import type { Booking, Equipment } from '../../shared/types.ts'

interface ResourceSlot {
  start: string
  end: string
  label: string
  available: boolean
  pendingCount: number
  confirmed: boolean
}

function nextWeekday() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  if (date.getDay() === 6) date.setDate(date.getDate() + 2)
  if (date.getDay() === 0) date.setDate(date.getDate() + 1)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function bookingLink(item: Equipment, date: string, slot: ResourceSlot) {
  const params = new URLSearchParams({ equipment: item.id, date, start: slot.start, end: slot.end })
  return `/book?${params.toString()}`
}

export function EquipmentDetail() {
  const { id } = useParams()
  const { equipment: catalogue, user } = useApp()
  const [resourceResponse, setResourceResponse] = useState<{
    id: string
    item?: Equipment
    bookings: Booking[]
    error?: string
  } | null>(null)
  const [date, setDate] = useState(nextWeekday)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [slotResponse, setSlotResponse] = useState<{
    id: string
    date: string
    slots: ResourceSlot[]
    error?: string
  } | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    api.equipmentOne(id).then((response) => {
      if (active) setResourceResponse({ id, item: response.item, bookings: response.bookings })
    }).catch(() => {
      if (active) setResourceResponse({ id, bookings: [], error: 'Equipment not found.' })
    })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!id || !date) return
    let active = true
    api.slots(id, date)
      .then((response) => {
        if (active) setSlotResponse({ id, date, slots: response.slots })
      })
      .catch(() => {
        if (active) setSlotResponse({ id, date, slots: [], error: 'The live booking calendar is unavailable. Try again in a moment.' })
      })
    return () => { active = false }
  }, [id, date])

  const currentResourceResponse = resourceResponse && resourceResponse.id === id ? resourceResponse : null
  const item = currentResourceResponse?.item ?? null
  const bookings = currentResourceResponse?.bookings ?? []
  const error = currentResourceResponse?.error ?? null
  const currentSlotResponse = slotResponse && slotResponse.id === id && slotResponse.date === date ? slotResponse : null
  const loadingSlots = !currentSlotResponse
  const slots = currentSlotResponse?.slots ?? []
  const slotsError = currentSlotResponse?.error ?? null
  const related = useMemo(() => {
    if (!item) return []
    return catalogue
      .filter((candidate) =>
        candidate.id !== item.id &&
        (candidate.category === item.category || candidate.tags.some((tag) => item.tags.includes(tag))),
      )
      .slice(0, 3)
  }, [catalogue, item])

  if (error) return <div className="page"><div className="error-state card">{error}</div></div>
  if (!item) return <div className="page"><div className="loading card">Loading resource passport…</div></div>

  const activeBookings = bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
  const upcomingBookings = activeBookings
    .filter((booking) => booking.slot.date >= today)
    .sort((a, b) => a.slot.date.localeCompare(b.slot.date))
  const maintenance = item.status === 'maintenance'
  const student = user?.role === 'student'

  return (
    <div className="page passport-page">
      <Link className="passport-back" to="/discover"><ArrowLeft size={14} /> All campus resources</Link>
      <div className="passport-heading">
        <div>
          <p className="kicker">Resource passport <span className="passport-demo-label">DEMO CATALOGUE</span></p>
          <h1>{item.name}</h1>
          <p className="passport-location"><MapPin size={14} /> {item.location}</p>
        </div>
        <Badge status={item.status} />
      </div>

      {maintenance && (
        <div className="passport-maintenance" role="status">
          <Wrench size={17} />
          <div><strong>In maintenance</strong><span>{item.description}</span></div>
        </div>
      )}

      <div className="passport-overview">
        <section className="card passport-identity">
          <div className="passport-identity-top"><span className="passport-category">{item.category}</span><span className="passport-glow" aria-hidden="true" /></div>
          <p>{item.description}</p>
          <div className="passport-owner"><span className="passport-dept-mark">{item.department.slice(0, 1)}</span><div><span>OWNING DEPARTMENT</span><strong>{item.department}</strong></div></div>
          <div className="passport-specs">
            {Object.entries(item.specs).map(([label, value]) => (
              <div className="passport-spec" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        </section>

        <section className="card passport-calendar">
          <div className="passport-section-head">
            <div><span className="section-overline">LIVE AVAILABILITY</span><h2>Booking calendar</h2></div>
            <CalendarDays size={17} />
          </div>
          <label htmlFor="passport-date">Choose a date</label>
          <input id="passport-date" type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} />
          <p className="passport-date-label">{dateLabel(date)}</p>
          {loadingSlots && <p className="passport-calendar-state">Checking the live calendar…</p>}
          {slotsError && <p className="passport-calendar-error" role="alert">{slotsError}</p>}
          {!loadingSlots && !slotsError && (
            <div className="passport-slot-list">
              {slots.map((slot) => {
                const available = slot.available && !maintenance
                return (
                  <div className={`passport-slot ${available ? 'is-available' : 'is-taken'}`} key={slot.start}>
                    <span className="passport-slot-indicator">{available ? <Check size={12} /> : <Clock3 size={12} />}</span>
                    <strong>{slot.label}</strong>
                    <span className="passport-slot-state">
                      {maintenance ? 'Maintenance' : slot.confirmed ? 'Reserved' : slot.pendingCount ? `${slot.pendingCount} pending` : 'Available'}
                    </span>
                    {available && (
                      student
                        ? <Link to={bookingLink(item, date, slot)} aria-label={`Request ${slot.label} for ${item.name}`}>Request <ArrowRight size={12} /></Link>
                        : <Link to="/enter" aria-label={`Sign in to request ${slot.label}`}>Sign in <ArrowRight size={12} /></Link>
                    )}
                  </div>
                )
              })}
              {slots.length === 0 && <p className="passport-calendar-state">No time windows are published for this date.</p>}
            </div>
          )}
          <p className="passport-calendar-note">A pending request may still be submitted; confirmed reservations are protected.</p>
        </section>
      </div>

      <div className="passport-info-grid">
        <section className="card passport-info-card">
          <span className="section-overline">USAGE IN DEMO DATA</span>
          <h2>Reservation history</h2>
          <div className="passport-usage-stats">
            <div><strong>{bookings.length}</strong><span>Recorded reservations</span></div>
            <div><strong>{activeBookings.length}</strong><span>Active holds</span></div>
          </div>
          {upcomingBookings.length ? (
            <div className="passport-history">
              {upcomingBookings.slice(0, 4).map((booking) => (
                <div className="passport-history-row" key={booking.id}>
                  <span>{booking.slot.date}</span><strong>{booking.projectTitle}</strong><Badge status={booking.status} />
                </div>
              ))}
            </div>
          ) : <p className="muted">No upcoming reservation records for this resource in the sample data.</p>}
          <p className="passport-footnote">These counts reflect the included demo records, not institutional usage analytics.</p>
        </section>

        <section className="card passport-info-card">
          <span className="section-overline">ACCESS & CARE</span>
          <h2>Before you book</h2>
          <div className="passport-access-row"><ShieldCheck size={16} /><div><strong>Student demo session</strong><span>Direct booking requests are available to student personas in this demo.</span></div></div>
          <div className="passport-access-row"><Check size={16} /><div><strong>Project context required</strong><span>Include a project title and deadline with each booking request.</span></div></div>
          <div className="passport-access-row"><MapPin size={16} /><div><strong>Cross-department access</strong><span>Students can request resources outside their home department; no home-department lock is applied.</span></div></div>
          <div className="passport-status-line"><span>Maintenance status</span><Badge status={item.status} /></div>
        </section>
      </div>

      <section className="passport-related-section">
        <div className="passport-section-head">
          <div><span className="section-overline">CONNECTED RESOURCES</span><h2>Related equipment</h2></div>
          <Link className="text-link" to="/projects">Match resources to a project <ArrowRight size={14} /></Link>
        </div>
        {related.length ? (
          <div className="passport-related-grid">
            {related.map((resource) => (
              <Link className="card passport-related-card" to={`/equipment/${resource.id}`} key={resource.id}>
                <span>{resource.category} · {resource.department}</span><strong>{resource.name}</strong><p>{resource.description}</p><Badge status={resource.status} />
              </Link>
            ))}
          </div>
        ) : <p className="muted">No directly related equipment is listed in the sample catalogue.</p>}
      </section>
    </div>
  )
}
