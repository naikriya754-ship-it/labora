import { useState } from 'react'
import { api } from '../api.ts'
import { useApp } from '../context/AppContext.tsx'
import { Badge, Empty } from '../components/ui.tsx'

export function Faculty() {
  const { requests, bookings, equipment, refresh, notify, user } = useApp()
  const [reason, setReason] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function act(id: string, kind: 'approve' | 'reject' | 'suggest') {
    setBusy(id)
    try {
      if (kind === 'approve') await api.approve(id)
      if (kind === 'suggest') await api.suggest(id)
      if (kind === 'reject') await api.reject(id, reason[id] || '')
      notify(kind === 'reject' ? 'Request rejected.' : kind === 'suggest' ? 'Alternatives sent.' : 'Request approved.')
      await refresh()
    } catch (err) {
      notify((err as Error).message, 'err')
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  async function confirmBooking(id: string) {
    try {
      await api.confirmBooking(id)
      notify('Booking confirmed.')
      await refresh()
    } catch (err) {
      notify((err as Error).message, 'err')
    }
  }

  const incoming = requests.filter((r) => r.status === 'pending' || r.status === 'needs_alternative')
  const nameEq = (id: string) => equipment.find((e) => e.id === id)?.name ?? id

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Faculty</p>
          <h1>Approval desk</h1>
          <p className="muted">Signed in as {user?.name}. Faculty actions are enforced by the API, not the browser role label.</p>
        </div>
      </div>
      <section className="card" style={{ marginBottom: 18 }}>
        <h2>Incoming project requests</h2>
        {incoming.length === 0 ? <Empty title="Inbox clear" body="New student requests will land here." /> : incoming.map((r) => {
          const conflict = bookings.find(
            (b) => b.status === 'confirmed' && b.equipmentId === r.equipmentId && b.slot.date === r.preferredSlot.date && b.slot.start === r.preferredSlot.start,
          )
          return (
            <article key={r.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
              <h3>{r.title}</h3>
              <p>{r.requirements}</p>
              <p className="muted">Equipment: {nameEq(r.equipmentId)} · Preferred {r.preferredSlot.date} {r.preferredSlot.start}–{r.preferredSlot.end} · Deadline {r.deadline} · {r.durationHours}h</p>
              {conflict && <p className="notice">Conflict: confirmed reservation already occupies this slot. Approving will suggest alternatives instead of overwriting.</p>}
              {r.conflictNotes.map((c) => <p key={c} className="muted">{c}</p>)}
              <label htmlFor={`reason-${r.id}`}>Rejection reason</label>
              <input id={`reason-${r.id}`} value={reason[r.id] ?? ''} onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))} />
              <div className="cta-row">
                <button className="btn btn-ok" type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'approve')}>Approve</button>
                <button className="btn btn-danger" type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'reject')}>Reject with reason</button>
                <button className="btn btn-light" type="button" disabled={busy === r.id} onClick={() => void act(r.id, 'suggest')}>Suggest alternative slots</button>
              </div>
            </article>
          )
        })}
      </section>
      <section className="card">
        <h2>Pending bookings</h2>
        <table className="table">
          <thead><tr><th>Student project</th><th>Slot</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {bookings.filter((b) => b.status === 'pending').map((b) => (
              <tr key={b.id}>
                <td>{b.projectTitle}<br /><span className="muted">{nameEq(b.equipmentId)}</span></td>
                <td>{b.slot.date} {b.slot.start}–{b.slot.end}</td>
                <td><Badge status={b.status} /></td>
                <td><button className="btn btn-ok" type="button" onClick={() => void confirmBooking(b.id)}>Confirm</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
