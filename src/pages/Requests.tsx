import { useState } from 'react'
import { api } from '../api.ts'
import { useApp } from '../context/AppContext.tsx'
import { Badge, Empty } from '../components/ui.tsx'

export function Requests() {
  const { equipment, requests, refresh, notify, user } = useApp()
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [requirements, setRequirements] = useState('')
  const [deadline, setDeadline] = useState('2026-12-08')
  const [durationHours, setDurationHours] = useState(2)
  const [equipmentId, setEquipmentId] = useState('')
  const [date, setDate] = useState('2026-11-28')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('11:00')
  const [formError, setFormError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 4 || !department || requirements.trim().length < 12 || !equipmentId) {
      setFormError('Title, department, equipment and a short requirements statement are required.')
      return
    }
    setFormError(null)
    try {
      await api.createRequest({ title, department, requirements, deadline, durationHours, equipmentId, date, start, end })
      notify('Project access request submitted.')
      await refresh()
      setTitle('')
      setRequirements('')
    } catch (err) {
      notify((err as Error).message, 'err')
    }
  }

  const groups = {
    pending: requests.filter((r) => r.status === 'pending' || r.status === 'needs_alternative'),
    approved: requests.filter((r) => r.status === 'approved'),
    rejected: requests.filter((r) => r.status === 'rejected'),
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Projects</p>
          <h1>Project access requests</h1>
          <p className="muted">Ask faculty for equipment access tied to a deadline and expected duration.</p>
        </div>
      </div>
      <form className="card" onSubmit={(e) => void submit(e)} style={{ marginBottom: 20 }}>
        <div className="grid-2">
          <div>
            <label htmlFor="pt">Project title</label>
            <input id="pt" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="dep">Department</label>
            <input id="dep" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div>
            <label htmlFor="eqr">Equipment required</label>
            <select id="eqr" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
              <option value="">Select</option>
              {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dur">Expected duration (hours)</label>
            <input id="dur" type="number" min={1} max={40} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="dl">Project deadline</label>
            <input id="dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pd">Preferred date</label>
            <input id="pd" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <label htmlFor="req">Equipment requirements</label>
        <textarea id="req" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        <div className="grid-2">
          <div>
            <label htmlFor="st">Preferred start</label>
            <input id="st" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label htmlFor="en">Preferred end</label>
            <input id="en" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <button className="btn btn-primary" type="submit" style={{ marginTop: 12 }}>Submit request</button>
      </form>
      <div className="grid-3">
        {(['pending', 'approved', 'rejected'] as const).map((key) => (
          <section className="card" key={key}>
            <h2>{key}</h2>
            {groups[key].length === 0 ? <Empty title="None" body={`No ${key} requests.`} /> : groups[key].map((r) => (
              <article key={r.id} style={{ marginBottom: 12 }}>
                <strong>{r.title}</strong>
                <div><Badge status={r.status} /></div>
                <p className="muted">{r.deadline} · {r.durationHours}h</p>
                {r.rejectReason && <p>{r.rejectReason}</p>}
                {r.suggestedSlots.length > 0 && (
                  <p className="muted">Suggested: {r.suggestedSlots[0].date} {r.suggestedSlots[0].start}</p>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
