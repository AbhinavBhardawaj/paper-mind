import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import sampleResult from '../assets/sample-result.json'
import VelocityChart from '../components/VelocityChart'
import ResearchGaps from '../components/ResearchGaps'
import { useAuth } from '../auth/AuthContext'

const SAMPLE_QUERY = 'quantum computing'
const EXAMPLE_QUERIES = ['quantum computing', 'robotics', 'climate modeling']
const STEPS = [
  ['Collect recent papers', 'PaperMind finds recent arXiv papers related to your topic.'],
  ['Group them into topics', 'Related papers are grouped into themes so you can scan a field.'],
  ['Measure and project growth', 'Publication and citation trends show which topics are gaining momentum.'],
  ['Suggest research ideas', 'The system proposes hypotheses that connect two fields.'],
]

function createSeries(result) {
  const groups = new Map()
  for (const row of result?.tfidf_matrix ?? []) {
    const id = Number(row.topic_id)
    if (!Number.isFinite(id) || !row.window || !Number.isFinite(Number(row.score))) continue
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push({ window: String(row.window), score: Number(row.score) })
  }

  return [...groups.entries()].map(([topicId, points]) => {
    const ordered = points.sort((a, b) => a.window.localeCompare(b.window))
    return {
      topicId,
      keywords: result.topic_map?.[topicId] ?? result.topic_map?.[String(topicId)] ?? [`Topic ${topicId}`],
      points: ordered.slice(-26).map((point, index, list) => ({
        window: point.window,
        value: index === 0 ? 0 : point.score - list[index - 1].score,
      })),
    }
  }).filter((series) => series.points.length > 1)
}

function TrendChart({ result }) {
  const series = useMemo(() => createSeries(result), [result])
  const [activeTopic, setActiveTopic] = useState(null)
  const allValues = series.flatMap((line) => line.points.map((point) => point.value))
  const minValue = Math.min(0, ...allValues)
  const maxValue = Math.max(0, ...allValues)
  const span = maxValue - minValue || 1
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']
  const view = { left: 48, top: 24, width: 700, height: 250 }
  const coords = (point, index, count) => ({
    x: view.left + (index / Math.max(count - 1, 1)) * view.width,
    y: view.top + ((maxValue - point.value) / span) * view.height,
  })

  return (
    <figure className="landing-chart-figure">
      <div className="landing-chart-frame">
        {series.length ? (
          <>
            <svg className="landing-trend-chart" viewBox="0 0 800 320" role="group" aria-label="Example weekly research-topic velocity">
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = view.top + view.height * fraction
                return <line key={fraction} x1={view.left} x2={view.left + view.width} y1={y} y2={y} className="chart-grid-line" />
              })}
              <line x1={view.left} x2={view.left} y1={view.top} y2={view.top + view.height} className="chart-axis" />
              <line x1={view.left} x2={view.left + view.width} y1={view.top + view.height} y2={view.top + view.height} className="chart-axis" />
              {series.map((line, lineIndex) => {
                const d = line.points.map((point, index) => {
                  const { x, y } = coords(point, index, line.points.length)
                  return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
                }).join(' ')
                const latest = line.points.at(-1)?.value ?? 0
                const label = line.keywords.slice(0, 3).join(', ')
                return (
                  <path
                    key={line.topicId}
                    d={d}
                    pathLength="1"
                    className={`trend-series${activeTopic === line.topicId ? ' is-active' : ''}`}
                    style={{ '--series-color': activeTopic === line.topicId ? 'var(--accent)' : colors[lineIndex % colors.length], '--line-delay': `${lineIndex * 160}ms` }}
                    tabIndex="0"
                    role="button"
                    aria-label={`${label}; latest weekly velocity ${latest.toFixed(3)}`}
                    onMouseEnter={() => setActiveTopic(line.topicId)}
                    onMouseLeave={() => setActiveTopic(null)}
                    onFocus={() => setActiveTopic(line.topicId)}
                    onBlur={() => setActiveTopic(null)}
                  />
                )
              })}
              <text x={view.left} y="304" className="chart-axis-label">Earlier weeks</text>
              <text x={view.left + view.width} y="304" textAnchor="end" className="chart-axis-label">Recent weeks</text>
            </svg>
            <div className="landing-chart-legend" aria-label="Topics">
              {series.map((line, index) => (
                <button key={line.topicId} type="button" onFocus={() => setActiveTopic(line.topicId)} onBlur={() => setActiveTopic(null)} onMouseEnter={() => setActiveTopic(line.topicId)} onMouseLeave={() => setActiveTopic(null)}>
                  <span style={{ backgroundColor: activeTopic === line.topicId ? 'var(--accent)' : colors[index % colors.length] }} />
                  {line.keywords.slice(0, 2).join(', ')}
                </button>
              ))}
            </div>
            {activeTopic != null && (() => {
              const line = series.find((entry) => entry.topicId === activeTopic)
              const velocity = line?.points.at(-1)?.value ?? 0
              return <p className="landing-chart-tooltip" role="status">{line?.keywords.join(', ')} · latest weekly velocity {velocity.toFixed(3)}</p>
            })()}
          </>
        ) : (
          <p className="metric-label chart-unavailable">Weekly topic trend data is not available in this sample.</p>
        )}
      </div>
      <figcaption>Example: {SAMPLE_QUERY}, last 6 months of arXiv papers.</figcaption>
    </figure>
  )
}

function Header({ user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/" className="site-wordmark">PaperMind</Link>
        <button className="mobile-menu-button" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={menuOpen ? 'M5 5l14 14M19 5 5 19' : 'M3 6h18M3 12h18M3 18h18'} /></svg>
        </button>
        <nav className={`landing-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <Link to="/demo" onClick={() => setMenuOpen(false)}>Example</Link>
          {user ? (
            <Link className="site-button secondary-button" to="/app">Open dashboard</Link>
          ) : (
            <>
              <Link className="site-button secondary-button" to="/login">Sign in</Link>
              <Link className="site-button primary-button" to="/signup">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const startAnalysis = (event) => {
    event.preventDefault()
    const clean = query.trim()
    if (!clean) return
    try { sessionStorage.setItem('papermind.pendingQuery', clean) } catch { /* storage may be unavailable */ }
    navigate(user ? '/app' : '/signup?next=%2Fapp')
  }

  const chooseExample = (example) => {
    setQuery(example)
    try { sessionStorage.setItem('papermind.pendingQuery', example) } catch { /* storage may be unavailable */ }
    navigate(user ? '/app' : '/signup?next=%2Fapp')
  }

  return (
    <div className="public-site">
      <Header user={user} />
      <main>
        <section className="landing-hero site-container">
          <div className="landing-hero-copy">
            <h1>See where a research field is heading.</h1>
            <p>Turn recent arXiv papers into a clear view of growing topics, momentum, and research ideas.</p>
            <form className="landing-search" onSubmit={startAnalysis}>
              <label className="visually-hidden" htmlFor="landing-query">Research topic</label>
              <input id="landing-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a research topic" required />
              <button className="site-button primary-button" type="submit">Explore a topic</button>
            </form>
            <div className="query-examples" aria-label="Example topics">
              <span>Try a topic</span>
              {EXAMPLE_QUERIES.map((example) => <button key={example} type="button" onClick={() => chooseExample(example)}>{example}</button>)}
            </div>
          </div>
          <div className="landing-hero-visual"><TrendChart result={sampleResult} /></div>
        </section>

        <section className="landing-section site-container" id="how-it-works">
          <div className="section-intro"><h2>How it works</h2><p>Four steps take you from a search to a useful map of the field.</p></div>
          <ol className="steps-list">
            {STEPS.map(([title, description], index) => <li key={title}><span className="step-number">{index + 1}</span><h3>{title}</h3><p>{description}</p></li>)}
          </ol>
        </section>

        <section className="landing-section sample-section site-container">
          <div className="section-intro"><h2>What you get</h2><p>Explore the same analysis components used in the dashboard.</p></div>
          <div className="sample-components">
            <VelocityChart velocity={sampleResult.velocity ?? []} compact />
            <div className="sample-gap-preview"><ResearchGaps gaps={sampleResult.research_gaps ?? []} warnings={sampleResult.warnings ?? []} /></div>
          </div>
          <Link className="site-button secondary-button sample-link" to="/demo">See the full example</Link>
        </section>

        <section className="landing-section limits-section site-container">
          <div className="section-intro"><h2>What to keep in mind</h2><p>PaperMind is a guide for exploring a field, not a substitute for reading the papers.</p></div>
          <div className="limits-copy">
            <p>PaperMind uses recent arXiv papers and citation counts from Semantic Scholar. Citation coverage can vary, and very new papers often have no citations yet.</p>
            <p>Forecasts are simple straight-line projections from recent topic scores. AI-generated research ideas are hypotheses to investigate, not verified gaps.</p>
          </div>
        </section>

        <section className="closing-cta site-container">
          <div><h2>Start with a question you care about.</h2><p>See the topics, momentum, and ideas emerging around it.</p></div>
          <div className="cta-actions">
            {user ? <Link className="site-button primary-button" to="/app">Open dashboard</Link> : <><Link className="site-button primary-button" to="/signup">Create account</Link><Link className="site-button secondary-button" to="/demo">Explore the example</Link></>}
          </div>
        </section>
      </main>
      <footer className="landing-footer site-container"><Link to="/" className="site-wordmark">PaperMind</Link><span>Research trends, made easier to explore.</span></footer>
    </div>
  )
}

export { SAMPLE_QUERY }
