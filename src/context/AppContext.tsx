import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AccessRequest, Booking, Equipment, NotificationItem, SessionUser } from '../../shared/types.ts'
import { api } from '../api.ts'

interface Toast {
  id: number
  message: string
  tone: 'ok' | 'warn' | 'err'
}

interface AppState {
  user: SessionUser | null
  loading: boolean
  error: string | null
  equipment: Equipment[]
  bookings: Booking[]
  requests: AccessRequest[]
  notifications: NotificationItem[]
  toast: Toast | null
  boot: () => Promise<void>
  refresh: () => Promise<void>
  login: (personaId: string) => Promise<void>
  logout: () => Promise<void>
  resetDemo: () => Promise<void>
  notify: (message: string, tone?: Toast['tone']) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [toast, setToast] = useState<Toast | null>(null)

  const notify = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now()
    setToast({ id, message, tone })
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4200)
  }, [])

  const refresh = useCallback(async () => {
    const eq = await api.equipment()
    setEquipment(eq.items)
    const session = await api.session()
    setUser(session.user)
    if (session.user) {
      const [b, r, n] = await Promise.all([api.bookings(), api.requests(), api.notifications()])
      setBookings(b.items)
      setRequests(r.items)
      setNotifications(n.items)
    } else {
      setBookings([])
      setRequests([])
      setNotifications([])
    }
  }, [])

  const boot = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await refresh()
    } catch {
      setError('Could not reach the Labora API. Start the server and refresh.')
    } finally {
      setLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    void boot()
  }, [boot])

  const login = useCallback(
    async (personaId: string) => {
      await api.login(personaId)
      await refresh()
      notify('Demo session started. This is sample authentication, not campus SSO.')
    },
    [notify, refresh],
  )

  const logout = useCallback(async () => {
    await api.logout()
    await refresh()
    notify('Demo session ended.', 'warn')
  }, [notify, refresh])

  const resetDemo = useCallback(async () => {
    await api.reset()
    await refresh()
    notify('Sample data restored.')
  }, [notify, refresh])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      equipment,
      bookings,
      requests,
      notifications,
      toast,
      boot,
      refresh,
      login,
      logout,
      resetDemo,
      notify,
    }),
    [user, loading, error, equipment, bookings, requests, notifications, toast, boot, refresh, login, logout, resetDemo, notify],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
