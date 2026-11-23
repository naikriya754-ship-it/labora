import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Footer, Navbar, ToastHost } from './components/ui.tsx'
import { useApp } from './context/AppContext.tsx'
import { Allocation } from './pages/Allocation.tsx'
import { Analytics } from './pages/Analytics.tsx'
import { Assistant } from './pages/Assistant.tsx'
import { Booking } from './pages/Booking.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Discover } from './pages/Discover.tsx'
import { Enter } from './pages/Enter.tsx'
import { EquipmentDetail } from './pages/EquipmentDetail.tsx'
import { Faculty } from './pages/Faculty.tsx'
import { Landing } from './pages/Landing.tsx'
import { Projects } from './pages/Projects.tsx'
import { Requests } from './pages/Requests.tsx'

function Guard({ role, children }: { role?: 'student' | 'faculty'; children: ReactNode }) {
  const { user, loading } = useApp()
  const location = useLocation()
  if (loading) return <div className="loading">Loading Labora…</div>
  if (!user) return <Navigate to="/enter" state={{ from: location }} replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'faculty' ? '/faculty' : '/dashboard'} replace />
  return children
}

export default function App() {
  const { user, loading, error, boot, resetDemo } = useApp()
  return (
    <div className="app-shell">
      <Navbar />
      <div className="demo-banner">
        <span>
          <strong>Sample data · demo authentication.</strong> Personas have no passwords and are not campus SSO.
        </span>
        <span>
          {user ? `Signed in as ${user.name} (${user.role})` : 'Choose Get started to pick a student or faculty persona'}
          {' · '}
          <button className="linkish" type="button" onClick={() => void resetDemo()} style={{ background: 'none', border: 0, color: '#cbb9ff', cursor: 'pointer' }}>
            Reset sample data
          </button>
        </span>
      </div>
      <main className="main">
        {error && (
          <div className="error-state card" style={{ margin: 24 }}>
            {error} <button className="btn btn-light" type="button" onClick={() => void boot()}>Retry</button>
          </div>
        )}
        {!error && (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/enter" element={<Enter />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route
              path="/dashboard"
              element={<Guard role="student"><Dashboard /></Guard>}
            />
            <Route
              path="/book"
              element={<Guard role="student"><Booking /></Guard>}
            />
            <Route
              path="/requests"
              element={<Guard role="student"><Requests /></Guard>}
            />
            <Route
              path="/faculty"
              element={<Guard role="faculty"><Faculty /></Guard>}
            />
            <Route
              path="/allocation"
              element={<Guard><Allocation /></Guard>}
            />
            <Route path="*" element={loading ? <div className="loading">Loading…</div> : <Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Footer />
      <ToastHost />
    </div>
  )
}
