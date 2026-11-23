export type UserRole = 'student' | 'faculty'

export type EquipmentCategory =
  | '3D Printing'
  | 'Embedded Systems'
  | 'Electronics'
  | 'Computing'
  | 'Robotics'
  | 'Optics'
  | 'Digital Design'

export type EquipmentStatus = 'available' | 'maintenance' | 'in_use'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected'
export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_alternative'

export interface TimeSlot {
  date: string
  start: string
  end: string
}

export interface SuggestedSlot extends TimeSlot {
  score: number
  reasons: string[]
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  year?: string
  demoNote: string
}

export interface Equipment {
  id: string
  name: string
  category: EquipmentCategory
  department: string
  location: string
  status: EquipmentStatus
  description: string
  specs: Record<string, string>
  tags: string[]
  imageHint: string
}

export interface Booking {
  id: string
  equipmentId: string
  studentId: string
  slot: TimeSlot
  projectTitle: string
  projectDetails: string
  deadline: string
  status: BookingStatus
  createdAt: string
  conflictWith?: string[]
}

export interface AccessRequest {
  id: string
  studentId: string
  title: string
  department: string
  requirements: string
  deadline: string
  durationHours: number
  equipmentId: string
  preferredSlot: TimeSlot
  status: RequestStatus
  createdAt: string
  reviewedAt?: string
  facultyId?: string
  rejectReason?: string
  suggestedSlots: SuggestedSlot[]
  conflictNotes: string[]
}

export interface NotificationItem {
  id: string
  userId: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  year?: string
  demo: true
}

export interface AllocationResult {
  equipmentId: string
  date: string
  start: string
  end: string
  candidates: Array<{
    requestId?: string
    bookingId?: string
    studentId: string
    studentName: string
    deadline: string
    score: number
    reasons: string[]
    kind: 'confirmed_booking' | 'pending_booking' | 'pending_request'
  }>
  recommendedWinnerId: string | null
  recommendedKind: 'booking' | 'request' | null
  explanation: string
  alternatives: Array<{
    studentId: string
    studentName: string
    slots: SuggestedSlot[]
  }>
  existingReservationProtected: boolean
}

export interface AnalyticsSnapshot {
  totalEquipment: number
  availableEquipment: number
  bookedEquipment: number
  pendingRequests: number
  utilisationPercent: number
  departmentUsage: Array<{ department: string; hours: number; bookings: number }>
  categoryUsage: Array<{ category: string; hours: number }>
  weeklyLoad: Array<{ day: string; bookings: number }>
}
