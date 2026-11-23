import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  analyseConflict,
  detectConflictSlots,
  findAlternativeSlots,
} from '../shared/allocation.ts'
import { BookingConflictError, hasConfirmedOverlap, overlappingActive } from '../shared/booking.ts'
import { cleanText, hoursBetween, isIsoDate, isTime, LAB_SLOTS } from '../shared/sanitize.ts'
import type { AccessRequest, Booking, TimeSlot } from '../shared/types.ts'
import { answerAssistant } from './assistant.ts'
import { newId, store } from './store.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT || 8080)
const COOKIE = 'labora_demo_session'

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())

function currentUser(req: express.Request) {
  const token = req.cookies?.[COOKIE] as string | undefined
  return store.sessionUser(token)
}

function requireUser(
  req: express.Request,
  res: express.Response,
): ReturnType<typeof currentUser> | undefined {
  const user = currentUser(req)
  if (!user) {
    res.status(401).json({
      error: 'Demo session required. Choose a sample student or faculty persona.',
    })
    return undefined
  }
  return user
}

function requireFaculty(req: express.Request, res: express.Response) {
  const user = requireUser(req, res)
  if (!user) return undefined
  if (user.role !== 'faculty') {
    res.status(403).json({
      error: 'Faculty actions are authorised on the server. Switch to a demo faculty persona.',
    })
    return undefined
  }
  return user
}

function parseSlot(body: { date?: unknown; start?: unknown; end?: unknown }): TimeSlot | null {
  const date = cleanText(body.date, 12)
  const start = cleanText(body.start, 5)
  const end = cleanText(body.end, 5)
  if (!isIsoDate(date) || !isTime(start) || !isTime(end) || start >= end) return null
  return { date, start, end }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'labora', demo: true })
})

app.get('/api/personas', (_req, res) => {
  res.json({
    demo: true,
    notice:
      'Demo authentication only. Personas are sample campus accounts with no passwords. This is not production identity.',
    personas: store.users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      department: u.department,
      year: u.year,
      demoNote: u.demoNote,
    })),
  })
})

app.post('/api/demo/login', (req, res) => {
  const id = cleanText(req.body?.personaId, 40)
  const user = store.user(id)
  if (!user) {
    res.status(400).json({ error: 'Unknown demo persona.' })
    return
  }
  const token = store.createSession(user.id)
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12,
  })
  res.json({ user: store.toSession(user), demo: true })
})

app.post('/api/demo/logout', (req, res) => {
  const token = req.cookies?.[COOKIE]
  store.sessions = store.sessions.filter((s) => s.token !== token)
  res.clearCookie(COOKIE)
  res.json({ ok: true })
})

app.post('/api/demo/reset', (_req, res) => {
  store.reset()
  res.json({ ok: true })
})

app.get('/api/session', (req, res) => {
  res.json({ user: currentUser(req) ?? null, demo: true })
})

app.get('/api/equipment', (req, res) => {
  const q = cleanText(req.query.q, 80).toLowerCase()
  const department = cleanText(req.query.department, 80)
  const category = cleanText(req.query.category, 80)
  const availability = cleanText(req.query.availability, 20)
  let items = store.equipment
  if (q) {
    items = items.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q)) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q),
    )
  }
  if (department) items = items.filter((e) => e.department === department)
  if (category) items = items.filter((e) => e.category === category)
  if (availability === 'available') items = items.filter((e) => e.status === 'available')
  if (availability === 'maintenance') items = items.filter((e) => e.status === 'maintenance')
  if (availability === 'in_use') items = items.filter((e) => e.status === 'in_use')
  res.json({ items, filters: { departments: [...new Set(store.equipment.map((e) => e.department))], categories: [...new Set(store.equipment.map((e) => e.category))] } })
})

app.get('/api/equipment/:id', (req, res) => {
  const item = store.equipment.find((e) => e.id === req.params.id)
  if (!item) {
    res.status(404).json({ error: 'Equipment not found.' })
    return
  }
  const related = store.bookings.filter((b) => b.equipmentId === item.id)
  res.json({ item, bookings: related, slots: LAB_SLOTS })
})

app.get('/api/slots', (req, res) => {
  const equipmentId = cleanText(req.query.equipmentId, 40)
  const date = cleanText(req.query.date, 12)
  if (!equipmentId || !isIsoDate(date)) {
    res.status(400).json({ error: 'equipmentId and date (YYYY-MM-DD) are required.' })
    return
  }
  const equipment = store.equipment.find((item) => item.id === equipmentId)
  if (!equipment) {
    res.status(404).json({ error: 'Equipment not found.' })
    return
  }
  const holds = store.slotsFor(equipmentId, date)
  res.json({
    date,
    equipmentId,
    slots: LAB_SLOTS.map((slot) => {
      const overlapping = holds.filter((b) => b.slot.start < slot.end && slot.start < b.slot.end)
      const confirmed = overlapping.find((b) => b.status === 'confirmed')
      return {
        ...slot,
        available: equipment.status !== 'maintenance' && !confirmed,
        pendingCount: overlapping.filter((b) => b.status === 'pending').length,
        confirmed: Boolean(confirmed),
      }
    }),
  })
})

app.get('/api/bookings', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const items =
    user.role === 'faculty'
      ? store.bookings
      : store.bookings.filter((b) => b.studentId === user.id)
  res.json({ items })
})

app.post('/api/bookings', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only student personas can create bookings in this demo.' })
    return
  }
  const equipmentId = cleanText(req.body?.equipmentId, 40)
  const equipment = store.equipment.find((e) => e.id === equipmentId)
  const slot = parseSlot(req.body ?? {})
  const projectTitle = cleanText(req.body?.projectTitle, 120)
  const projectDetails = cleanText(req.body?.projectDetails, 1000)
  const deadline = cleanText(req.body?.deadline, 12)
  if (!equipment) {
    res.status(400).json({ error: 'Select valid equipment.' })
    return
  }
  if (equipment.status === 'maintenance') {
    res.status(409).json({ error: 'This instrument is in maintenance and cannot be booked.' })
    return
  }
  if (!slot || !projectTitle || !isIsoDate(deadline)) {
    res.status(400).json({ error: 'Equipment, date, time slot, project title and deadline are required.' })
    return
  }
  if (deadline < slot.date) {
    res.status(400).json({ error: 'Deadline must be on or after the booking date.' })
    return
  }
  const confirmed = hasConfirmedOverlap(store.bookings, equipmentId, slot)
  if (confirmed) {
    const alternatives = findAlternativeSlots({
      equipmentId,
      bookings: store.bookings,
      durationHours: hoursBetween(slot.start, slot.end),
    })
    res.status(409).json({
      error: 'This slot already has a confirmed reservation. Existing bookings are never overwritten.',
      code: 'BOOKING_CONFLICT',
      conflicting: [confirmed],
      alternatives,
    })
    return
  }
  const pending = overlappingActive(store.bookings, equipmentId, slot).filter((b) => b.status === 'pending')
  const booking: Booking = {
    id: newId(),
    equipmentId,
    studentId: user.id,
    slot,
    projectTitle,
    projectDetails,
    deadline,
    status: 'pending',
    createdAt: new Date().toISOString(),
    conflictWith: pending.map((p) => p.id),
  }
  store.addBooking(booking)
  store.notify(
    user.id,
    'Booking submitted',
    `${equipment.name} on ${slot.date} ${slot.start}–${slot.end} is pending faculty confirmation.`,
  )
  store.users
    .filter((u) => u.role === 'faculty')
    .forEach((f) =>
      store.notify(f.id, 'New booking request', `${user.name} requested ${equipment.name}.`),
    )
  res.status(201).json({ booking, pendingConflicts: pending.length })
})

app.post('/api/bookings/:id/cancel', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const booking = store.bookings.find((b) => b.id === req.params.id)
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' })
    return
  }
  if (user.role !== 'faculty' && booking.studentId !== user.id) {
    res.status(403).json({ error: 'You can only cancel your own bookings.' })
    return
  }
  const updated = store.updateBooking(booking.id, { status: 'cancelled' })
  store.notify(booking.studentId, 'Booking cancelled', `Reservation ${booking.projectTitle} was cancelled.`)
  res.json({ booking: updated })
})

app.get('/api/requests', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const items =
    user.role === 'faculty' ? store.requests : store.requests.filter((r) => r.studentId === user.id)
  res.json({ items })
})

app.post('/api/requests', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only student personas can submit project access requests.' })
    return
  }
  const title = cleanText(req.body?.title, 140)
  const department = cleanText(req.body?.department, 80)
  const requirements = cleanText(req.body?.requirements, 1200)
  const deadline = cleanText(req.body?.deadline, 12)
  const durationHours = Number(req.body?.durationHours)
  const equipmentId = cleanText(req.body?.equipmentId, 40)
  const slot = parseSlot(req.body?.preferredSlot ?? req.body ?? {})
  if (!title || !department || !requirements || !isIsoDate(deadline) || !equipmentId || !slot) {
    res.status(400).json({ error: 'Complete all required project fields, including a preferred slot.' })
    return
  }
  if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 40) {
    res.status(400).json({ error: 'Expected duration must be between 1 and 40 hours.' })
    return
  }
  const equipment = store.equipment.find((e) => e.id === equipmentId)
  if (!equipment) {
    res.status(400).json({ error: 'Select valid equipment.' })
    return
  }
  const conflict = hasConfirmedOverlap(store.bookings, equipmentId, slot)
  const request: AccessRequest = {
    id: newId(),
    studentId: user.id,
    title,
    department,
    requirements,
    deadline,
    durationHours,
    equipmentId,
    preferredSlot: slot,
    status: 'pending',
    createdAt: new Date().toISOString(),
    suggestedSlots: conflict
      ? findAlternativeSlots({ equipmentId, bookings: store.bookings, durationHours })
      : [],
    conflictNotes: conflict
      ? [`Preferred slot overlaps confirmed booking ${conflict.id}. Existing reservation is protected.`]
      : [],
  }
  store.addRequest(request)
  store.notify(user.id, 'Access request submitted', `${title} is waiting for faculty review.`)
  store.users
    .filter((u) => u.role === 'faculty')
    .forEach((f) => store.notify(f.id, 'New project access request', `${user.name}: ${title}`))
  res.status(201).json({ request })
})

app.post('/api/requests/:id/approve', (req, res) => {
  const faculty = requireFaculty(req, res)
  if (!faculty) return
  const request = store.requests.find((r) => r.id === req.params.id)
  if (!request) {
    res.status(404).json({ error: 'Request not found.' })
    return
  }
  const confirmed = hasConfirmedOverlap(store.bookings, request.equipmentId, request.preferredSlot)
  if (confirmed) {
    const alternatives = findAlternativeSlots({
      equipmentId: request.equipmentId,
      bookings: store.bookings,
      durationHours: request.durationHours,
    })
    const updated = store.updateRequest(request.id, {
      status: 'needs_alternative',
      facultyId: faculty.id,
      reviewedAt: new Date().toISOString(),
      suggestedSlots: alternatives,
      conflictNotes: [
        ...request.conflictNotes,
        'Approval blocked: a confirmed reservation occupies this slot. Alternatives suggested instead of overwriting.',
      ],
    })
    store.notify(
      request.studentId,
      'Alternative slots suggested',
      'Your preferred slot is protected by an existing reservation. Review suggested times.',
    )
    res.status(409).json({
      error: 'Cannot approve over a confirmed reservation.',
      request: updated,
      alternatives,
    })
    return
  }
  const booking: Booking = {
    id: newId(),
    equipmentId: request.equipmentId,
    studentId: request.studentId,
    slot: request.preferredSlot,
    projectTitle: request.title,
    projectDetails: request.requirements,
    deadline: request.deadline,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  }
  store.addBooking(booking)
  const updated = store.updateRequest(request.id, {
    status: 'approved',
    facultyId: faculty.id,
    reviewedAt: new Date().toISOString(),
  })
  store.notify(request.studentId, 'Request approved', `${request.title} is confirmed.`)
  res.json({ request: updated, booking })
})

app.post('/api/requests/:id/reject', (req, res) => {
  const faculty = requireFaculty(req, res)
  if (!faculty) return
  const reason = cleanText(req.body?.reason, 400)
  if (reason.length < 8) {
    res.status(400).json({ error: 'Provide a rejection reason (at least 8 characters).' })
    return
  }
  const updated = store.updateRequest(req.params.id, {
    status: 'rejected',
    rejectReason: reason,
    facultyId: faculty.id,
    reviewedAt: new Date().toISOString(),
  })
  if (!updated) {
    res.status(404).json({ error: 'Request not found.' })
    return
  }
  store.notify(updated.studentId, 'Request rejected', reason)
  res.json({ request: updated })
})

app.post('/api/requests/:id/suggest', (req, res) => {
  const faculty = requireFaculty(req, res)
  if (!faculty) return
  const request = store.requests.find((r) => r.id === req.params.id)
  if (!request) {
    res.status(404).json({ error: 'Request not found.' })
    return
  }
  const alternatives = findAlternativeSlots({
    equipmentId: request.equipmentId,
    bookings: store.bookings,
    durationHours: request.durationHours,
  })
  const updated = store.updateRequest(request.id, {
    status: 'needs_alternative',
    facultyId: faculty.id,
    reviewedAt: new Date().toISOString(),
    suggestedSlots: alternatives,
  })
  store.notify(
    request.studentId,
    'Faculty suggested new slots',
    `Open your requests to pick an alternative time for ${request.title}.`,
  )
  res.json({ request: updated })
})

app.post('/api/bookings/:id/confirm', (req, res) => {
  const faculty = requireFaculty(req, res)
  if (!faculty) return
  const booking = store.bookings.find((b) => b.id === req.params.id)
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' })
    return
  }
  const confirmed = hasConfirmedOverlap(store.bookings, booking.equipmentId, booking.slot, booking.id)
  if (confirmed) {
    res.status(409).json({
      error: 'Cannot confirm over an existing reservation.',
      alternatives: findAlternativeSlots({
        equipmentId: booking.equipmentId,
        bookings: store.bookings,
        durationHours: hoursBetween(booking.slot.start, booking.slot.end),
      }),
    })
    return
  }
  const updated = store.updateBooking(booking.id, { status: 'confirmed' })
  store.notify(booking.studentId, 'Booking confirmed', `${booking.projectTitle} is confirmed.`)
  res.json({ booking: updated })
})

app.get('/api/allocation', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  const equipmentId = cleanText(req.query.equipmentId, 40)
  const date = cleanText(req.query.date, 12)
  const start = cleanText(req.query.start, 5)
  const end = cleanText(req.query.end, 5)
  const conflicts = detectConflictSlots(store.bookings, store.requests).map((slot) =>
    analyseConflict({
      equipmentId: slot.equipmentId,
      slot,
      bookings: store.bookings,
      requests: store.requests,
      users: store.users,
    }),
  )
  if (equipmentId && isIsoDate(date) && isTime(start) && isTime(end)) {
    const focused = analyseConflict({
      equipmentId,
      slot: { date, start, end },
      bookings: store.bookings,
      requests: store.requests,
      users: store.users,
    })
    res.json({ focused, conflicts, weights: { deadline: 35, fairness: 25, wait: 15, durationFit: 10, availability: 15 }, method: 'weighted-scoring' })
    return
  }
  res.json({
    conflicts,
    weights: { deadline: 35, fairness: 25, wait: 15, durationFit: 10, availability: 15 },
    method: 'weighted-scoring',
    disclaimer:
      'Recommendations use a transparent weighted scoring algorithm. No generative model is used for allocation.',
  })
})

app.get('/api/notifications', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  res.json({ items: store.notifications.filter((n) => n.userId === user.id) })
})

app.post('/api/notifications/read', (req, res) => {
  const user = requireUser(req, res)
  if (!user) return
  store.markRead(user.id)
  res.json({ ok: true })
})

app.get('/api/analytics', (_req, res) => {
  res.json(store.analytics())
})

app.post('/api/assistant', async (req, res) => {
  const message = cleanText(req.body?.message, 1000)
  if (!message) {
    res.status(400).json({ error: 'Enter a question.' })
    return
  }
  try {
    const result = await answerAssistant({
      message,
      equipment: store.equipment,
      bookings: store.bookings,
    })
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Assistant is unavailable. Try the demo catalogue questions.' })
  }
})

const dist = join(__dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(dist, 'index.html'))
  })
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof BookingConflictError) {
    res.status(409).json({ error: err.message, conflicting: err.conflicting })
    return
  }
  res.status(500).json({ error: 'Unexpected server error.' })
})

app.listen(PORT, () => {
  console.log(`Labora listening on ${PORT}`)
})
