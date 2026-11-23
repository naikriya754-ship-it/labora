import type {
  AccessRequest,
  AllocationResult,
  AnalyticsSnapshot,
  Booking,
  Equipment,
  NotificationItem,
  SessionUser,
  SuggestedSlot,
  TimeSlot,
} from '../shared/types.ts'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed') as Error & { status: number; body: unknown }
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),
  personas: () =>
    request<{
      demo: boolean
      notice: string
      personas: Array<{
        id: string
        name: string
        role: string
        department: string
        year?: string
        demoNote: string
      }>
    }>('/api/personas'),
  login: (personaId: string) =>
    request<{ user: SessionUser }>('/api/demo/login', {
      method: 'POST',
      body: JSON.stringify({ personaId }),
    }),
  logout: () => request('/api/demo/logout', { method: 'POST' }),
  reset: () => request('/api/demo/reset', { method: 'POST' }),
  session: () => request<{ user: SessionUser | null }>('/api/session'),
  equipment: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params)
    return request<{
      items: Equipment[]
      filters: { departments: string[]; categories: string[] }
    }>(`/api/equipment?${q.toString()}`)
  },
  equipmentOne: (id: string) =>
    request<{ item: Equipment; bookings: Booking[]; slots: Array<{ start: string; end: string; label: string }> }>(
      `/api/equipment/${id}`,
    ),
  slots: (equipmentId: string, date: string) =>
    request<{
      slots: Array<{ start: string; end: string; label: string; available: boolean; pendingCount: number; confirmed: boolean }>
    }>(`/api/slots?equipmentId=${encodeURIComponent(equipmentId)}&date=${date}`),
  bookings: () => request<{ items: Booking[] }>('/api/bookings'),
  createBooking: (body: {
    equipmentId: string
    date: string
    start: string
    end: string
    projectTitle: string
    projectDetails: string
    deadline: string
  }) =>
    request<{ booking: Booking; pendingConflicts: number }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  cancelBooking: (id: string) =>
    request<{ booking: Booking }>(`/api/bookings/${id}/cancel`, { method: 'POST' }),
  confirmBooking: (id: string) =>
    request<{ booking: Booking }>(`/api/bookings/${id}/confirm`, { method: 'POST' }),
  requests: () => request<{ items: AccessRequest[] }>('/api/requests'),
  createRequest: (body: {
    title: string
    department: string
    requirements: string
    deadline: string
    durationHours: number
    equipmentId: string
    date: string
    start: string
    end: string
  }) =>
    request<{ request: AccessRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        preferredSlot: { date: body.date, start: body.start, end: body.end },
      }),
    }),
  approve: (id: string) =>
    request<{ request: AccessRequest; booking?: Booking }>(`/api/requests/${id}/approve`, {
      method: 'POST',
    }),
  reject: (id: string, reason: string) =>
    request<{ request: AccessRequest }>(`/api/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  suggest: (id: string) =>
    request<{ request: AccessRequest }>(`/api/requests/${id}/suggest`, { method: 'POST' }),
  allocation: (q?: { equipmentId: string; date: string; start: string; end: string }) => {
    const params = q ? new URLSearchParams(q).toString() : ''
    return request<{
      focused?: AllocationResult
      conflicts: AllocationResult[]
      weights: Record<string, number>
      method: string
      disclaimer?: string
    }>(`/api/allocation${params ? `?${params}` : ''}`)
  },
  notifications: () => request<{ items: NotificationItem[] }>('/api/notifications'),
  markRead: () => request('/api/notifications/read', { method: 'POST' }),
  analytics: () => request<AnalyticsSnapshot>('/api/analytics'),
  assistant: (message: string) =>
    request<{ reply: string; mode: 'demo' | 'genai'; citations: string[] }>('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}

export type { SuggestedSlot, TimeSlot }
