import { useEffect, useState } from 'react'
import { api } from '../api.ts'
import type { AllocationResult } from '../../shared/types.ts'

export function Allocation() {
  const [data, setData] = useState<{
    conflicts: AllocationResult[]
    weights: Record<string, number>
    method: string
    disclaimer?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.allocation()
      .then((d) => setData({ conflicts: d.conflicts, weights: d.weights, method: d.method, disclaimer: d.disclaimer }))
      .catch(() => setError('Sign in with a demo persona to run the allocation engine.'))
  }, [])

  if (error) return <div className="page"><div className="error-state card">{error}</div></div>
  if (!data) return <div className="page"><div className="loading card">Scoring conflicts…</div></div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Scheduler</p>
          <h1>Intelligent allocation</h1>
          <p className="muted">
            Transparent weighted scoring ({data.method}). Weights: deadline {data.weights.deadline}, fairness {data.weights.fairness},
            wait {data.weights.wait}, duration fit {data.weights.durationFit}, confirmed availability {data.weights.availability}.
          </p>
        </div>
      </div>
      <p className="notice">{data.disclaimer || 'Existing confirmed reservations are never overwritten.'}</p>
      {data.conflicts.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>No overlapping claims in the current sample window.</div>
      ) : data.conflicts.map((c) => (
        <article className="card" key={`${c.equipmentId}-${c.date}-${c.start}`} style={{ marginTop: 16 }}>
          <h2>{c.date} {c.start}–{c.end}</h2>
          <p>{c.explanation}</p>
          <p className="muted">Protected reservation: {c.existingReservationProtected ? 'yes' : 'no'}</p>
          <table className="table">
            <thead><tr><th>Claimant</th><th>Kind</th><th>Score</th><th>Why</th></tr></thead>
            <tbody>
              {c.candidates.map((cand) => (
                <tr key={cand.bookingId ?? cand.requestId}>
                  <td>{cand.studentName}</td>
                  <td>{cand.kind.replaceAll('_', ' ')}</td>
                  <td>{cand.score}</td>
                  <td>{cand.reasons.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.alternatives.map((alt) => (
            <div key={alt.studentId}>
              <h3>Alternatives for {alt.studentName}</h3>
              <ul>
                {alt.slots.map((s) => (
                  <li key={s.date + s.start}>{s.date} {s.start}–{s.end} (score {s.score}) — {s.reasons[0]}</li>
                ))}
              </ul>
            </div>
          ))}
        </article>
      ))}
    </div>
  )
}
