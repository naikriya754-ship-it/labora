import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext.tsx'

export function Logo() {
  return (
    <div className="brand" aria-label="Labora">
      <span className="logo-mark" aria-hidden>L</span>
      <span>
        LABORA
        <small>Every Resource. One Intelligent Campus.</small>
      </span>
    </div>
  )
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: 'badge-ok',
    confirmed: 'badge-ok',
    approved: 'badge-ok',
    pending: 'badge-warn',
    in_use: 'badge-warn',
    needs_alternative: 'badge-info',
    maintenance: 'badge-err',
    rejected: 'badge-err',
    cancelled: 'badge-muted',
  }
  return <span className={`badge ${map[status] ?? 'badge-muted'}`}>{status.replaceAll('_', ' ')}</span>
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty card">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

export function Navbar() {
  const { user, logout } = useApp()
  const [open, setOpen] = useState(false)
  const student = [
    ['/dashboard', 'Dashboard'],
    ['/projects', 'Project matchmaker'],
    ['/discover', 'Discover'],
    ['/book', 'Smart booking'],
    ['/requests', 'Access requests'],
    ['/allocation', 'Allocation'],
    ['/assistant', 'Assistant'],
    ['/analytics', 'Analytics'],
  ]
  const faculty = [
    ['/faculty', 'Faculty desk'],
    ['/projects', 'Project matchmaker'],
    ['/discover', 'Catalogue'],
    ['/allocation', 'Allocation'],
    ['/analytics', 'Analytics'],
    ['/assistant', 'Assistant'],
  ]
  const links = user?.role === 'faculty' ? faculty : user ? student : [['/projects', 'Project matchmaker'], ['/discover', 'Laboratories']]
  return (
    <header className="nav">
      <NavLink to="/" onClick={() => setOpen(false)}>
        <Logo />
      </NavLink>
      <button
        className="menu-toggle"
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav id="primary-navigation" className={`nav-links ${open ? 'open' : ''}`}>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}>
            {label}
          </NavLink>
        ))}
        {user ? (
          <button className="btn btn-ghost" type="button" onClick={() => void logout()}>
            End demo ({user.name.split(' ')[0]})
          </button>
        ) : (
          <NavLink to="/enter" className="btn btn-primary">
            Get started
          </NavLink>
        )}
      </nav>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p>Campus laboratory operations for specialised equipment, kits and workstations.</p>
        </div>
        <div>
          <strong>Platform</strong>
          <p><Link to="/projects">Project resource matchmaker</Link></p>
          <p><Link to="/discover">Equipment catalogue</Link></p>
          <p><Link to="/allocation">Fair allocation</Link></p>
          <p><Link to="/analytics">Utilisation</Link></p>
        </div>
        <div>
          <strong>Demo</strong>
          <p>Sample data only. Not institutional SSO.</p>
          <p>© 2026 Labora</p>
        </div>
      </div>
    </footer>
  )
}

export function ToastHost() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className={`toast ${toast.tone}`} role="status">
      {toast.message}
    </div>
  )
}
