import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.ts'
import { useApp } from '../context/AppContext.tsx'

export function Enter() {
  const { login, user } = useApp()
  const nav = useNavigate()
  const location = useLocation()
  const [personas, setPersonas] = useState<Array<{ id: string; name: string; role: string; department: string; year?: string; demoNote: string }>>([])
  const [notice, setNotice] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.personas().then((d) => {
      setPersonas(d.personas)
      setNotice(d.notice)
    }).catch(() => setErr('Could not load demo personas.'))
  }, [])

  useEffect(() => {
    if (!user) return
    const state = location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null
    const destination = state?.from
    nav(
      destination?.pathname
        ? `${destination.pathname}${destination.search ?? ''}${destination.hash ?? ''}`
        : user.role === 'faculty' ? '/faculty' : '/dashboard',
      { replace: true },
    )
  }, [user, nav, location.state])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Demo access</p>
          <h1>Choose a sample campus persona</h1>
          <p className="muted">{notice || 'No passwords. This is labelled demo authentication, not production SSO.'}</p>
        </div>
      </div>
      {err && <div className="error-state card">{err}</div>}
      <div className="persona-grid">
        {personas.map((p) => (
          <button
            key={p.id}
            className="card persona"
            type="button"
            onClick={() => void login(p.id)}
          >
            <span className={`badge ${p.role === 'faculty' ? 'badge-info' : 'badge-ok'}`}>{p.role}</span>
            <h3>{p.name}</h3>
            <p className="muted">{p.department}{p.year ? ` · ${p.year}` : ''}</p>
            <p>{p.demoNote}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
