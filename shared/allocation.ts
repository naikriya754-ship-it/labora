import { daysUntil, hoursBetween, LAB_SLOTS, nextWeekdays } from './sanitize.ts'
import { hasConfirmedOverlap, slotsOverlap } from './booking.ts'
import type {
  AccessRequest,
  AllocationResult,
  Booking,
  SuggestedSlot,
  TimeSlot,
  User,
} from './types.ts'

const WEIGHTS = {
  deadline: 35,
  fairness: 25,
  wait: 15,
  durationFit: 10,
  availability: 15,
} as const

export function scoreCandidate(input: {
  deadline: string
  createdAt: string
  recentHours: number
  requestedHours: number
  slot: TimeSlot
  slotIsFreeOfConfirmed: boolean
  now?: Date
}): { score: number; reasons: string[] } {
  const now = input.now ?? new Date()
  const days = Math.max(0, daysUntil(input.deadline, now))
  const deadlineScore =
    days <= 1 ? WEIGHTS.deadline : Math.max(4, WEIGHTS.deadline * (1 - days / 21))

  const fairnessScore = Math.max(
    3,
    WEIGHTS.fairness * (1 - Math.min(input.recentHours, 16) / 16),
  )

  const ageHours = Math.max(
    0,
    (now.getTime() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60),
  )
  const waitScore = Math.min(WEIGHTS.wait, WEIGHTS.wait * (ageHours / 48))

  const slotHours = hoursBetween(input.slot.start, input.slot.end)
  const fit =
    slotHours <= 0
      ? 0
      : 1 - Math.min(1, Math.abs(slotHours - input.requestedHours) / slotHours)
  const durationScore = WEIGHTS.durationFit * fit

  const availabilityScore = input.slotIsFreeOfConfirmed ? WEIGHTS.availability : 0

  const reasons: string[] = []
  if (days <= 3) reasons.push(`Urgent deadline in ${days} day${days === 1 ? '' : 's'}`)
  else reasons.push(`Deadline in ${days} days`)
  if (input.recentHours <= 4) reasons.push('Low recent lab usage (fairness)')
  else reasons.push(`${input.recentHours}h booked recently — lower fairness score`)
  if (ageHours >= 12) reasons.push('Request has been waiting')
  if (fit > 0.7) reasons.push('Requested duration fits this slot')
  if (!input.slotIsFreeOfConfirmed) {
    reasons.push('Slot already has a confirmed reservation (protected)')
  } else {
    reasons.push('Slot is free of confirmed reservations')
  }

  return {
    score: Math.round(
      deadlineScore + fairnessScore + waitScore + durationScore + availabilityScore,
    ),
    reasons,
  }
}

export function recentHoursForStudent(
  bookings: Booking[],
  studentId: string,
  from: Date,
): number {
  const cutoff = from.getTime() - 14 * 24 * 60 * 60 * 1000
  return bookings
    .filter(
      (b) =>
        b.studentId === studentId &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected' &&
        new Date(b.createdAt).getTime() >= cutoff,
    )
    .reduce((sum, b) => sum + hoursBetween(b.slot.start, b.slot.end), 0)
}

export function findAlternativeSlots(input: {
  equipmentId: string
  bookings: Booking[]
  durationHours: number
  from?: Date
}): SuggestedSlot[] {
  const from = input.from ?? new Date()
  const dates = nextWeekdays(from, 10)
  const results: SuggestedSlot[] = []
  for (const date of dates) {
    for (const lab of LAB_SLOTS) {
      const slot: TimeSlot = { date, start: lab.start, end: lab.end }
      const blocked = hasConfirmedOverlap(input.bookings, input.equipmentId, slot)
      if (blocked) continue
      const pending = input.bookings.filter(
        (b) =>
          b.equipmentId === input.equipmentId &&
          b.status === 'pending' &&
          slotsOverlap(b.slot, slot),
      )
      const slotHours = hoursBetween(lab.start, lab.end)
      const fit = 1 - Math.min(1, Math.abs(slotHours - input.durationHours) / slotHours)
      const score = Math.round(70 + fit * 20 - pending.length * 8)
      const reasons = [
        `${date} ${lab.label} is free of confirmed bookings`,
        pending.length
          ? `${pending.length} pending request(s) already compete for this slot`
          : 'No competing pending requests',
        `Duration fit score ${Math.round(fit * 100)}%`,
      ]
      results.push({ ...slot, score, reasons })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 4)
}

export function analyseConflict(input: {
  equipmentId: string
  slot: TimeSlot
  bookings: Booking[]
  requests: AccessRequest[]
  users: User[]
  now?: Date
}): AllocationResult {
  const now = input.now ?? new Date()
  const name = (id: string) => input.users.find((u) => u.id === id)?.name ?? id

  const relatedBookings = input.bookings.filter(
    (b) =>
      b.equipmentId === input.equipmentId &&
      slotsOverlap(b.slot, input.slot) &&
      (b.status === 'confirmed' || b.status === 'pending'),
  )
  const relatedRequests = input.requests.filter(
    (r) =>
      r.equipmentId === input.equipmentId &&
      slotsOverlap(r.preferredSlot, input.slot) &&
      (r.status === 'pending' || r.status === 'needs_alternative'),
  )

  const confirmed = relatedBookings.filter((b) => b.status === 'confirmed')
  const candidates: AllocationResult['candidates'] = []

  for (const b of relatedBookings) {
    const scored = scoreCandidate({
      deadline: b.deadline,
      createdAt: b.createdAt,
      recentHours: recentHoursForStudent(input.bookings, b.studentId, now),
      requestedHours: hoursBetween(b.slot.start, b.slot.end),
      slot: input.slot,
      slotIsFreeOfConfirmed: confirmed.length === 0 || b.status === 'confirmed',
      now,
    })
    candidates.push({
      bookingId: b.id,
      studentId: b.studentId,
      studentName: name(b.studentId),
      deadline: b.deadline,
      score: b.status === 'confirmed' ? 10_000 : scored.score,
      reasons:
        b.status === 'confirmed'
          ? ['Existing confirmed reservation is protected and will not be overwritten']
          : scored.reasons,
      kind: b.status === 'confirmed' ? 'confirmed_booking' : 'pending_booking',
    })
  }

  for (const r of relatedRequests) {
    const scored = scoreCandidate({
      deadline: r.deadline,
      createdAt: r.createdAt,
      recentHours: recentHoursForStudent(input.bookings, r.studentId, now),
      requestedHours: r.durationHours,
      slot: input.slot,
      slotIsFreeOfConfirmed: confirmed.length === 0,
      now,
    })
    candidates.push({
      requestId: r.id,
      studentId: r.studentId,
      studentName: name(r.studentId),
      deadline: r.deadline,
      score: scored.score,
      reasons: scored.reasons,
      kind: 'pending_request',
    })
  }

  candidates.sort((a, b) => b.score - a.score)

  const existingReservationProtected = confirmed.length > 0
  let recommendedWinnerId: string | null = null
  let recommendedKind: AllocationResult['recommendedKind'] = null
  let explanation = 'No competing claims for this slot.'

  if (existingReservationProtected) {
    recommendedWinnerId = confirmed[0].id
    recommendedKind = 'booking'
    explanation =
      'A confirmed reservation already occupies this slot. Labora never silently overwrites existing reservations. Competing students should be offered alternative slots.'
  } else if (candidates.length) {
    const winner = candidates[0]
    recommendedWinnerId = winner.bookingId ?? winner.requestId ?? null
    recommendedKind = winner.requestId ? 'request' : 'booking'
    explanation = `${winner.studentName} scores highest (${winner.score}) using a transparent weighted model: deadline urgency (35), fairness / recent usage (25), wait time (15), duration fit (10), and confirmed-slot availability (15). This is rule-based scoring, not a generative model.`
  }

  const alternatives = candidates
    .filter((c) => (c.bookingId ?? c.requestId) !== recommendedWinnerId)
    .map((c) => ({
      studentId: c.studentId,
      studentName: c.studentName,
      slots: findAlternativeSlots({
        equipmentId: input.equipmentId,
        bookings: input.bookings,
        durationHours: 2,
        from: now,
      }),
    }))

  return {
    equipmentId: input.equipmentId,
    date: input.slot.date,
    start: input.slot.start,
    end: input.slot.end,
    candidates,
    recommendedWinnerId,
    recommendedKind,
    explanation,
    alternatives,
    existingReservationProtected,
  }
}

export function detectConflictSlots(
  bookings: Booking[],
  requests: AccessRequest[],
): Array<TimeSlot & { equipmentId: string }> {
  const keys = new Map<string, TimeSlot & { equipmentId: string }>()
  const push = (slot: TimeSlot, equipmentId: string) => {
    keys.set(`${equipmentId}|${slot.date}|${slot.start}|${slot.end}`, {
      ...slot,
      equipmentId,
    })
  }
  for (const b of bookings) {
    if (b.status === 'pending' || b.status === 'confirmed') {
      const others = [
        ...bookings.filter(
          (x) =>
            x.id !== b.id &&
            x.equipmentId === b.equipmentId &&
            (x.status === 'pending' || x.status === 'confirmed') &&
            slotsOverlap(x.slot, b.slot),
        ),
        ...requests.filter(
          (r) =>
            r.equipmentId === b.equipmentId &&
            (r.status === 'pending' || r.status === 'needs_alternative') &&
            slotsOverlap(r.preferredSlot, b.slot),
        ),
      ]
      if (others.length) push(b.slot, b.equipmentId)
    }
  }
  for (const r of requests) {
    if (r.status !== 'pending' && r.status !== 'needs_alternative') continue
    const others = requests.filter(
      (x) =>
        x.id !== r.id &&
        x.equipmentId === r.equipmentId &&
        (x.status === 'pending' || x.status === 'needs_alternative') &&
        slotsOverlap(x.preferredSlot, r.preferredSlot),
    )
    if (others.length) push(r.preferredSlot, r.equipmentId)
  }
  return [...keys.values()]
}
