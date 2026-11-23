import type { Booking, TimeSlot } from './types.ts'

export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.date !== b.date) return false
  return a.start < b.end && b.start < a.end
}

export function blockingBookings(
  bookings: Booking[],
  equipmentId: string,
): Booking[] {
  return bookings.filter(
    (b) =>
      b.equipmentId === equipmentId &&
      (b.status === 'confirmed' || b.status === 'pending'),
  )
}

export function hasConfirmedOverlap(
  bookings: Booking[],
  equipmentId: string,
  slot: TimeSlot,
  ignoreBookingId?: string,
): Booking | undefined {
  return bookings.find(
    (b) =>
      b.id !== ignoreBookingId &&
      b.equipmentId === equipmentId &&
      b.status === 'confirmed' &&
      slotsOverlap(b.slot, slot),
  )
}

export function overlappingActive(
  bookings: Booking[],
  equipmentId: string,
  slot: TimeSlot,
  ignoreBookingId?: string,
): Booking[] {
  return blockingBookings(bookings, equipmentId).filter(
    (b) => b.id !== ignoreBookingId && slotsOverlap(b.slot, slot),
  )
}

export class BookingConflictError extends Error {
  readonly code = 'BOOKING_CONFLICT'
  readonly conflicting: Booking[]
  constructor(message: string, conflicting: Booking[]) {
    super(message)
    this.name = 'BookingConflictError'
    this.conflicting = conflicting
  }
}
