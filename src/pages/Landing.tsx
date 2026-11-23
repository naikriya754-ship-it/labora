import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Activity,
  Boxes,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleDot,
  Clock3,
  Cpu,
  FlaskConical,
  Gauge,
  Microscope,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.tsx'

export function Landing() {
  const { equipment, bookings, requests } = useApp()
  const depts = new Set(equipment.map((item) => item.department)).size
  const availableCount = equipment.filter((item) => item.status === 'available').length
  const utilisation = equipment.length
    ? Math.round((equipment.filter((item) => item.status === 'in_use').length / equipment.length) * 100)
    : 0
  const upcoming = bookings
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
    .sort((a, b) => a.slot.date.localeCompare(b.slot.date))
    .slice(0, 2)
  const activeDepartments = [...equipment.reduce((counts, item) => {
    counts.set(item.department, (counts.get(item.department) ?? 0) + 1)
    return counts
  }, new Map<string, number>()).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const departmentTotal = activeDepartments.reduce((total, [, count]) => total + count, 0)
  const equipmentName = (id: string) => equipment.find((item) => item.id === id)?.name ?? 'Lab equipment'

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-grid-pattern" aria-hidden="true" />
        <div className="hero-orb hero-orb-violet" aria-hidden="true" />
        <div className="hero-orb hero-orb-cyan" aria-hidden="true" />
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="kicker"><span className="kicker-pulse" /> Intelligent campus ecosystem</p>
            <h1><span className="hero-title-line">Your Campus Labs.</span><span>Reimagined.</span></h1>
            <p className="lede">
              One intelligent platform to discover specialised equipment, book laboratory resources and accelerate your next breakthrough.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" to="/projects">
                Match my project <ArrowRight size={16} />
              </Link>
              <Link className="btn btn-ghost" to="/discover">
                Browse resources
              </Link>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars" aria-hidden="true">
                <span><FlaskConical size={13} /></span>
                <span><Cpu size={13} /></span>
                <span><Microscope size={13} /></span>
              </div>
              <p><strong>{depts} departments</strong> connected <i /> Built for curious minds</p>
            </div>
          </div>

          <div className="product-preview" aria-label="Preview of the Labora campus resource dashboard">
            <div className="preview-window-bar">
              <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
              <span className="preview-breadcrumb">Workspace <span>/</span> Overview</span>
              <span className="preview-live"><i /> Live demo</span>
            </div>
            <div className="preview-layout">
              <aside className="preview-sidebar" aria-hidden="true">
                <div className="preview-side-logo"><span className="logo-mark">L</span><b>LABORA</b></div>
                <div className="preview-side-active"><Gauge size={14} /> Overview</div>
                <div><ScanSearch size={14} /> Discover</div>
                <div><CalendarDays size={14} /> Bookings</div>
                <div><Activity size={14} /> Analytics</div>
                <div className="preview-side-bottom"><span className="preview-avatar">R</span><span>Research team</span></div>
              </aside>

              <div className="preview-content">
                <div className="preview-heading">
                  <div><span className="preview-eyebrow">YOUR CAMPUS, THIS WEEK</span><h2>Campus overview</h2></div>
                  <button type="button" className="preview-period"><CircleDot size={11} /> This week</button>
                </div>

                <div className="preview-metrics">
                  <article className="preview-metric">
                    <div className="metric-label">Lab utilisation <span className="metric-icon violet"><Activity size={13} /></span></div>
                    <div className="metric-value">{utilisation}<small>%</small><span className="metric-trend"><CircleDot size={9} /> Live</span></div>
                    <div className="metric-track"><span style={{ width: `${utilisation}%` }} /></div>
                  </article>
                  <article className="preview-metric">
                    <div className="metric-label">Available now <span className="metric-icon cyan"><CircleDot size={13} /></span></div>
                    <div className="metric-value">{availableCount}<small> / {equipment.length}</small></div>
                    <span className="metric-footnote">Across {depts} departments</span>
                  </article>
                </div>

                <div className="preview-analytics">
                  <div className="preview-chart-card">
                    <div className="preview-card-heading"><div><strong>Resource activity</strong><span>Equipment usage this week</span></div><span className="chart-legend"><i /> Activity</span></div>
                    <div className="chart-area">
                      <div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span></div>
                      <svg className="activity-chart" viewBox="0 0 340 112" preserveAspectRatio="none" role="img" aria-label="Illustrative weekly activity trend">
                        <defs>
                          <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#9165ff" stopOpacity=".32" />
                            <stop offset="100%" stopColor="#9165ff" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="activityStroke" x1="0" x2="1">
                            <stop offset="0%" stopColor="#9165ff" />
                            <stop offset="100%" stopColor="#48ddf5" />
                          </linearGradient>
                        </defs>
                        <path d="M0 85 C24 76 25 57 53 64 S87 78 111 53 S150 63 170 40 S204 52 228 33 S262 55 281 29 S318 43 340 12 L340 112 L0 112Z" fill="url(#activityFill)" />
                        <path d="M0 85 C24 76 25 57 53 64 S87 78 111 53 S150 63 170 40 S204 52 228 33 S262 55 281 29 S318 43 340 12" fill="none" stroke="url(#activityStroke)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                        <circle cx="281" cy="29" r="4" fill="#48ddf5" stroke="#151e34" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </div>
                    <div className="chart-x-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                  </div>

                  <div className="preview-insight">
                    <div className="insight-icon"><Sparkles size={14} /></div>
                    <span className="insight-label">SMART ALLOCATION</span>
                    <strong>Fair access, built in.</strong>
                    <p>Confirmed reservations stay protected. Competing requests get ranked alternatives.</p>
                    <span className="insight-link">See how it works <ArrowRight size={12} /></span>
                  </div>
                </div>

                <div className="preview-bottom">
                  <div className="preview-list-card">
                    <div className="preview-card-heading"><div><strong>Upcoming bookings</strong><span>Your next lab sessions</span></div><CalendarCheck size={15} /></div>
                    {upcoming.length ? upcoming.map((booking) => (
                      <div className="preview-booking" key={booking.id}>
                        <span className="booking-date">{booking.slot.date.slice(5, 10).replace('-', '/')}</span>
                        <span className="booking-details"><strong>{equipmentName(booking.equipmentId)}</strong><small>{booking.slot.start} – {booking.slot.end}</small></span>
                        <span className={`booking-status ${booking.status}`}>{booking.status}</span>
                      </div>
                    )) : (
                      <div className="preview-booking">
                        <span className="booking-date"><Clock3 size={13} /></span>
                        <span className="booking-details"><strong>Ready for your next discovery</strong><small>Explore available campus equipment</small></span>
                        <span className="booking-status confirmed"><Check size={12} /></span>
                      </div>
                    )}
                  </div>
                  <div className="preview-list-card department-card">
                    <div className="preview-card-heading"><div><strong>Department activity</strong><span>Equipment by department</span></div><Users size={15} /></div>
                    {activeDepartments.length ? activeDepartments.map(([department, count], index) => (
                      <div className="department-row" key={department}>
                        <span className={`department-dot dot-${index}`} />
                        <span className="department-name">{department}</span>
                        <div className="department-track"><span style={{ width: `${departmentTotal ? (count / departmentTotal) * 100 : 0}%` }} /></div>
                        <span className="department-count">{count}</span>
                      </div>
                    )) : (
                      <div className="department-empty">Department insights will appear as labs connect.</div>
                    )}
                  </div>
                </div>
                <div className="preview-statusline"><span><i /> All systems operational</span><span>{requests.filter((request) => request.status === 'pending').length} requests in review <ArrowRight size={11} /></span></div>
              </div>
            </div>
            <div className="preview-float-chip"><span><Sparkles size={15} /></span><div><strong>Intelligent by design</strong><small>Fair allocation, made transparent</small></div></div>
          </div>
        </div>
        <div className="hero-bottom-line" />
      </section>

      <section className="section landing-stats" aria-label="Labora platform overview">
        <div className="stat-intro"><span className="section-overline">ONE CAMPUS. MORE POSSIBILITIES.</span><h2>Everything your lab needs.<br /><span>Nothing in your way.</span></h2></div>
        <div className="landing-stat-list">
          {[
            [String(equipment.length), 'Specialised instruments'],
            [String(depts), 'Connected departments'],
            [String(bookings.filter((booking) => booking.status === 'confirmed').length), 'Confirmed sessions'],
          ].map(([value, label]) => (
            <article className="landing-stat" key={label}><strong>{value}</strong><span>{label}</span></article>
          ))}
        </div>
      </section>

      <section className="section landing-categories">
        <div className="section-heading">
          <div><span className="section-overline">BUILT FOR WHAT'S NEXT</span><h2>Space to make<br /><span>the impossible, possible.</span></h2></div>
          <Link className="text-link" to="/projects">Match my project to resources <ArrowRight size={15} /></Link>
        </div>
        <p className="section-description">From first prototype to breakthrough research, find the right tools for the work that matters.</p>
        <div className="grid-4 category-grid">
          {([
            [FlaskConical, '3D Printing', 'Prototyping tools, desktop CNC and precision fabrication.', '01'],
            [Cpu, 'Computing', 'High-performance GPU workstations, ready when you are.', '02'],
            [ScanSearch, 'Electronics', 'Oscilloscopes, logic analysers and FPGA platforms.', '03'],
            [Microscope, 'Optics & robotics', 'Imaging systems, research robots and more.', '04'],
          ] as Array<[LucideIcon, string, string, string]>).map(([Icon, title, body, number]) => (
            <Link className="card category-card" key={title} to="/discover">
              <div className="category-topline"><span className="cat-icon"><Icon size={19} /></span><span>{number}</span></div>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="category-arrow"><ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section landing-workflow">
        <div className="workflow-intro">
          <span className="section-overline">A BETTER WAY TO SHARE</span>
          <h2>From curiosity<br />to <span>discovery.</span></h2>
          <p>Every step of the research journey, thoughtfully connected. No scattered spreadsheets, hidden queues or guesswork.</p>
          <Link className="btn btn-ghost" to="/enter">Step into your workspace <ArrowRight size={15} /></Link>
        </div>
        <div className="workflow-steps">
          {([
            [Boxes, '01', 'Find your next tool', 'Search specialised equipment across departments, with availability at a glance.'],
            [CalendarCheck, '02', 'Make time for ideas', 'Request the slot you need and attach your project and deadline.'],
            [ShieldCheck, '03', 'Get a fair answer', 'Transparent allocation protects confirmed bookings and offers alternatives.'],
          ] as Array<[LucideIcon, string, string, string]>).map(([Icon, number, title, body]) => (
            <article className="workflow-step" key={number}>
              <div className="workflow-icon"><Icon size={18} /></div><span className="workflow-number">{number}</span>
              <h3>{title}</h3><p>{body}</p>
            </article>
          ))}
          <div className="workflow-connector" aria-hidden="true" />
        </div>
      </section>

      <section className="section landing-values">
        <div className="values-heading"><span className="section-overline">ENGINEERED FOR TRUST</span><h2>Smart systems.<br /><span>Human principles.</span></h2></div>
        <div className="grid-2 values-grid">
          <article className="card value-card">
            <div className="value-icon"><Sparkles size={19} /></div><span className="value-tag">TRANSPARENT ALLOCATION</span>
            <h3>Fairness you can see.</h3>
            <p>Deadline urgency, recent usage, wait time, duration fit and availability are scored with published weights. The engine is rule-based — never a black box.</p>
            <div className="value-foot"><span>Clear criteria, better outcomes</span><ArrowRight size={15} /></div>
          </article>
          <article className="card value-card">
            <div className="value-icon cyan-icon"><ShieldCheck size={19} /></div><span className="value-tag">RESERVATIONS, RESPECTED</span>
            <h3>Your time stays yours.</h3>
            <p>Confirmed bookings stay put. When requests collide, teams receive thoughtful weekday alternatives instead of silent preemption.</p>
            <div className="value-foot"><span>Built on trust, by design</span><ArrowRight size={15} /></div>
          </article>
        </div>
      </section>

      <section className="section landing-cta">
        <div className="cta-glow" aria-hidden="true" />
        <div><span className="section-overline">YOUR NEXT BREAKTHROUGH STARTS HERE</span><h2>The right tools.<br /><span>One brilliant idea away.</span></h2><p>Discover what your campus makes possible.</p></div>
        <Link className="btn btn-primary" to="/discover">Explore laboratories <ArrowRight size={16} /></Link>
      </section>
    </div>
  )
}
