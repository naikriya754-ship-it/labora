import { describe, expect, it } from 'vitest'
import { analyseConflict, findAlternativeSlots, scoreCandidate } from '../shared/allocation.ts'
import { hasConfirmedOverlap, slotsOverlap } from '../shared/booking.ts'
import type { Booking, User } from '../shared/types.ts'

const users: User[] = [
  { id: 'a', name: 'Aarav', email: 'a', role: 'student', department: 'CS', demoNote: '' },
  { id: 'p', name: 'Priya', email: 'p', role: 'student', department: 'ECE', demoNote: '' },
]

const slot = { date: '2026-11-24', start: '09:00', end: '11:00' }

function booking(partial: Partial<Booking> & Pick<Booking, 'id' | 'studentId' | 'status'>): Booking {
  return {
    equipmentId: 'eq-gpu-a6000',
    slot,
    projectTitle: 'x',
    projectDetails: 'y',
    deadline: '2026-12-01',
    createdAt: '2026-11-20T00:00:00.000Z',
    ...partial,
  }
}

describe('slot overlap', () => {
  it('detects overlapping intervals on the same day', () => {
    expect(slotsOverlap(slot, { date: '2026-11-24', start: '10:00', end: '12:00' })).toBe(true)
    expect(slotsOverlap(slot, { date: '2026-11-24', start: '11:00', end: '13:00' })).toBe(false)
    expect(slotsOverlap(slot, { date: '2026-11-25', start: '09:00', end: '11:00' })).toBe(false)
  })
})

describe('double-booking prevention', () => {
  it('blocks a new claim against a confirmed reservation', () => {
    const bookings = [booking({ id: '1', studentId: 'a', status: 'confirmed' })]
    expect(hasConfirmedOverlap(bookings, 'eq-gpu-a6000', slot)?.id).toBe('1')
  })

  it('does not treat cancelled bookings as blocking', () => {
    const bookings = [booking({ id: '1', studentId: 'a', status: 'cancelled' })]
    expect(hasConfirmedOverlap(bookings, 'eq-gpu-a6000', slot)).toBeUndefined()
  })
})

describe('weighted scoring', () => {
  it('scores nearer deadlines higher when the slot is free', () => {
    const urgent = scoreCandidate({
      deadline: '2026-11-24',
      createdAt: '2026-11-22T00:00:00.000Z',
      recentHours: 2,
      requestedHours: 2,
      slot,
      slotIsFreeOfConfirmed: true,
      now: new Date('2026-11-23T00:00:00.000Z'),
    })
    const later = scoreCandidate({
      deadline: '2026-12-18',
      createdAt: '2026-11-22T00:00:00.000Z',
      recentHours: 2,
      requestedHours: 2,
      slot,
      slotIsFreeOfConfirmed: true,
      now: new Date('2026-11-23T00:00:00.000Z'),
    })
    expect(urgent.score).toBeGreaterThan(later.score)
  })
})

describe('conflict analysis', () => {
  it('protects an existing confirmed reservation and recommends alternatives', () => {
    const bookings = [
      booking({ id: '1', studentId: 'a', status: 'confirmed', deadline: '2026-11-25' }),
      booking({ id: '2', studentId: 'p', status: 'pending', deadline: '2026-11-24' }),
    ]
    const result = analyseConflict({
      equipmentId: 'eq-gpu-a6000',
      slot,
      bookings,
      requests: [],
      users,
      now: new Date('2026-11-23T00:00:00.000Z'),
    })
    expect(result.existingReservationProtected).toBe(true)
    expect(result.recommendedWinnerId).toBe('1')
    expect(result.alternatives[0]?.slots.length).toBeGreaterThan(0)
    expect(
      findAlternativeSlots({ equipmentId: 'eq-gpu-a6000', bookings, durationHours: 2, from: new Date('2026-11-23') }).every(
        (s) => !(s.date === '2026-11-24' && s.start === '09:00'),
      ),
    ).toBe(true)
  })
})
