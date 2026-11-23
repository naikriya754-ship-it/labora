import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useApp } from '../context/AppContext.tsx'
import { Badge, Empty } from '../components/ui.tsx'
import { api } from '../api.ts'

export function Dashboard() {
  const { user, equipment, bookings, requests, notifications, refresh } = useApp()
  if (!user) return null
  const upcoming = bookings
    .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
    .sort((a, b) => a.slot.date.localeCompare(b.slot.date))
  const pending = requests.filter((r) => r.status === 'pending' || r.status === 'needs_alternative')
  const deadlines = [...bookings, ...requests]
    .map((x) => ({ title: 'title' in x ? x.title : x.projectTitle, deadline: x.deadline }))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Student workspace</p>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="muted">{user.department} · sample account {user.email}</p>
        </div>
        <Link className="btn btn-primary" to="/book">Quick booking</Link>
      </div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <article className="card stat"><b>{equipment.filter((e) => e.status === 'available').length}</b>Available now</article>
        <article className="card stat"><b>{bookings.length}</b>Your bookings</article>
        <article className="card stat"><b>{pending.length}</b>Open requests</article>
        <article className="card stat"><b>{notifications.filter((n) => !n.read).length}</b>Alerts</article>
      </div>
      <div className="grid-2">
        <section className="card">
          <h2>Available laboratory equipment</h2>
          <ul>
            {equipment.filter((e) => e.status === 'available').slice(0, 6).map((e) => (
              <li key={e.id}><Link to={`/equipment/${e.id}`}>{e.name}</Link> · {e.location}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Notifications</h2>
          {notifications.length === 0 ? <Empty title="Quiet for now" body="Booking and approval events will appear here." /> : (
            <ul>
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id}><Bell size={14} /> {n.title} — {n.body}</li>
              ))}
            </ul>
          )}
          <button className="btn btn-light" type="button" onClick={() => void api.markRead().then(refresh)}>Mark as read</button>
        </section>
      </div>
      <div className="grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <h2>Current bookings & upcoming reservations</h2>
          {upcoming.length === 0 ? <Empty title="No reservations" body="Book a slot from Discover or Quick booking." /> : (
            <table className="table">
              <thead><tr><th>When</th><th>Project</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td>{b.slot.date} {b.slot.start}–{b.slot.end}</td>
                    <td>{b.projectTitle}</td>
                    <td><Badge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2>Pending access requests</h2>
          {pending.length === 0 ? <p className="muted">No open project requests.</p> : pending.map((r) => (
            <p key={r.id}>{r.title} <Badge status={r.status} /></p>
          ))}
          <h3>Project deadlines</h3>
          {deadlines.map((d) => (
            <p key={d.title} className="muted">{d.deadline} · {d.title}</p>
          ))}
        </section>
      </div>
    </div>
  )
}
