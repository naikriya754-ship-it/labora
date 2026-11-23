import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api.ts'
import type { AnalyticsSnapshot } from '../../shared/types.ts'

export function Analytics() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.analytics().then(setData).catch(() => setError('Analytics unavailable.'))
  }, [])

  if (error) return <div className="page"><div className="error-state card">{error}</div></div>
  if (!data) return <div className="page"><div className="loading card">Computing utilisation…</div></div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Operations</p>
          <h1>Resource analytics</h1>
          <p className="muted">Figures update from live demo bookings and access requests.</p>
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <article className="card stat"><b>{data.totalEquipment}</b>Total equipment</article>
        <article className="card stat"><b>{data.availableEquipment}</b>Available</article>
        <article className="card stat"><b>{data.bookedEquipment}</b>Currently booked</article>
        <article className="card stat"><b>{data.pendingRequests}</b>Pending requests</article>
      </div>
      <div className="grid-2">
        <section className="card">
          <h2>Department-wise resource usage (hours)</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={data.departmentUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#7c5cff" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul>
            {data.departmentUsage.map((d) => (
              <li key={d.department}>{d.department}: {d.hours}h · {d.bookings} bookings</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>Equipment utilisation</h2>
          <p style={{ fontSize: 42, margin: 0 }}>{data.utilisationPercent}%</p>
          <p className="muted">Share of catalogue with at least one active hold.</p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={data.weeklyLoad}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#101b31" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  )
}
