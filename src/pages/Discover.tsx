import { useEffect, useState } from 'react'
import { ArrowRight, Network } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api.ts'
import { Badge, Empty } from '../components/ui.tsx'
import type { Equipment } from '../../shared/types.ts'

export function Discover() {
  const [q, setQ] = useState('')
  const [department, setDepartment] = useState('')
  const [category, setCategory] = useState('')
  const [availability, setAvailability] = useState('')
  const [items, setItems] = useState<Equipment[]>([])
  const [filters, setFilters] = useState<{ departments: string[]; categories: string[] }>({ departments: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLoading(true)
      api.equipment({ q, department, category, availability })
        .then((d) => {
          setItems(d.items)
          setFilters(d.filters)
          setError(null)
        })
        .catch(() => setError('Could not load the equipment catalogue.'))
        .finally(() => setLoading(false))
    }, 180)
    return () => window.clearTimeout(t)
  }, [q, department, category, availability])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Catalogue</p>
          <h1>Equipment discovery</h1>
          <p className="muted">Search specialised instruments, kits and workstations across campus labs.</p>
        </div>
      </div>
      <div className="discovery-network-banner">
        <span className="discovery-network-icon"><Network size={18} /></span>
        <div><strong>One campus. Every department.</strong><span>Discover and request resources across engineering disciplines—your home department does not limit the catalogue.</span></div>
        <Link to="/projects">Start with a project <ArrowRight size={14} /></Link>
      </div>
      <div className="filters">
        <div>
          <label htmlFor="q">Search by name</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. FPGA, Prusa, GPU" />
        </div>
        <div>
          <label htmlFor="dept">Department</label>
          <select id="dept" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {filters.departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cat">Category</label>
          <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {filters.categories.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="av">Availability</label>
          <select id="av" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="">Any status</option>
            <option value="available">Available</option>
            <option value="in_use">In use</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>
      {loading && <div className="loading card">Loading catalogue…</div>}
      {error && <div className="error-state card">{error}</div>}
      {!loading && !error && items.length === 0 && <Empty title="No matches" body="Try another name, department or availability filter." />}
      <div className="eq-grid">
        {items.map((e) => (
          <article className="card eq-card" key={e.id}>
            <Badge status={e.status} />
            <h3>{e.name}</h3>
            <p className="eq-meta">{e.category} · {e.department}</p>
            <p>{e.description}</p>
            <p className="eq-meta">{e.location}</p>
            <Link className="btn btn-light" to={`/equipment/${e.id}`}>View details</Link>
          </article>
        ))}
      </div>
    </div>
  )
}
