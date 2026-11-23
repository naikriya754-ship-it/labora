import { randomUUID } from 'node:crypto'
import type {
  AccessRequest,
  AnalyticsSnapshot,
  Booking,
  Equipment,
  NotificationItem,
  SessionUser,
  TimeSlot,
  User,
} from '../shared/types.ts'
import { hoursBetween } from '../shared/sanitize.ts'
import * as seed from './seed.ts'

interface Session {
  token: string
  userId: string
  createdAt: string
}

class Store {
  users: User[] = structuredClone(seed.users)
  equipment: Equipment[] = structuredClone(seed.equipment)
  bookings: Booking[] = structuredClone(seed.bookings)
  requests: AccessRequest[] = structuredClone(seed.requests)
  notifications: NotificationItem[] = structuredClone(seed.notifications)
  sessions: Session[] = []

  reset() {
    this.users = structuredClone(seed.users)
    this.equipment = structuredClone(seed.equipment)
    this.bookings = structuredClone(seed.bookings)
    this.requests = structuredClone(seed.requests)
    this.notifications = structuredClone(seed.notifications)
    this.sessions = []
  }

  user(id: string) {
    return this.users.find((u) => u.id === id)
  }

  toSession(user: User): SessionUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
      demo: true,
    }
  }

  createSession(userId: string) {
    const token = randomUUID()
    this.sessions.push({ token, userId, createdAt: new Date().toISOString() })
    return token
  }

  sessionUser(token?: string): SessionUser | undefined {
    if (!token) return undefined
    const session = this.sessions.find((s) => s.token === token)
    if (!session) return undefined
    const user = this.user(session.userId)
    return user ? this.toSession(user) : undefined
  }

  notify(userId: string, title: string, body: string) {
    this.notifications.unshift({
      id: randomUUID(),
      userId,
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    })
  }

  analytics(): AnalyticsSnapshot {
    const totalEquipment = this.equipment.length
    const availableEquipment = this.equipment.filter((e) => e.status === 'available').length
    const bookedIds = new Set(
      this.bookings
        .filter((b) => b.status === 'confirmed' || b.status === 'pending')
        .map((b) => b.equipmentId),
    )
    const pendingRequests = this.requests.filter((r) => r.status === 'pending').length
    const active = this.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending')
    const hours = active.reduce((s, b) => s + hoursBetween(b.slot.start, b.slot.end), 0)
    const utilisationPercent = Math.min(100, Math.round((bookedIds.size / totalEquipment) * 100))

    const deptMap = new Map<string, { hours: number; bookings: number }>()
    for (const b of active) {
      const eq = this.equipment.find((e) => e.id === b.equipmentId)
      const dept = eq?.department ?? 'Unknown'
      const cur = deptMap.get(dept) ?? { hours: 0, bookings: 0 }
      cur.hours += hoursBetween(b.slot.start, b.slot.end)
      cur.bookings += 1
      deptMap.set(dept, cur)
    }
    const catMap = new Map<string, number>()
    for (const b of active) {
      const eq = this.equipment.find((e) => e.id === b.equipmentId)
      const cat = eq?.category ?? 'Other'
      catMap.set(cat, (catMap.get(cat) ?? 0) + hoursBetween(b.slot.start, b.slot.end))
    }

    const weeklyLoad = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => ({
      day,
      bookings: 2 + ((hours + i * 3) % 5),
    }))

    return {
      totalEquipment,
      availableEquipment,
      bookedEquipment: bookedIds.size,
      pendingRequests,
      utilisationPercent,
      departmentUsage: [...deptMap.entries()].map(([department, v]) => ({
        department,
        ...v,
      })),
      categoryUsage: [...catMap.entries()].map(([category, h]) => ({
        category,
        hours: h,
      })),
      weeklyLoad,
    }
  }

  slotsFor(equipmentId: string, date: string) {
    const taken = this.bookings.filter(
      (b) =>
        b.equipmentId === equipmentId &&
        b.slot.date === date &&
        (b.status === 'confirmed' || b.status === 'pending'),
    )
    return taken
  }

  addBooking(booking: Booking) {
    this.bookings.unshift(booking)
  }

  addRequest(request: AccessRequest) {
    this.requests.unshift(request)
  }

  updateBooking(id: string, patch: Partial<Booking>) {
    const i = this.bookings.findIndex((b) => b.id === id)
    if (i === -1) return undefined
    this.bookings[i] = { ...this.bookings[i], ...patch }
    return this.bookings[i]
  }

  updateRequest(id: string, patch: Partial<AccessRequest>) {
    const i = this.requests.findIndex((r) => r.id === id)
    if (i === -1) return undefined
    this.requests[i] = { ...this.requests[i], ...patch }
    return this.requests[i]
  }

  markRead(userId: string) {
    this.notifications = this.notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n,
    )
  }
}

export const store = new Store()

export function newId() {
  return randomUUID()
}

export function slotKey(slot: TimeSlot) {
  return `${slot.date} ${slot.start}-${slot.end}`
}
