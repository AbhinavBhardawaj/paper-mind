import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/SearchBar'
import StatsCards from '../components/StatsCards'
import VelocityChart from '../components/VelocityChart'
import MomentumChart from '../components/MomentumChart'
import ForecastChart from '../components/ForecastChart'
import TopicTable from '../components/TopicTable'
import { runPipeline } from '../services/api'
import ResearchGaps from '../components/ResearchGaps'

const PAGE_SIZE = 6
const SIDEBAR_KEY = 'papermind.sidebarCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

// 1 … 4 5 6 … 25 instead of one button per page
function pageWindow(current, count) {
  const pages = new Set([1, count, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

const authorsText = (a) => (Array.isArray(a) ? a.join(', ') : a || 'Unknown')
const dateText = (d) => (d ? String(d).slice(0, 10) : 'Unknown')
const topicName = (topicMap, id) => topicMap?.[id]?.[0] ?? `Topic ${id ?? '-'}`

function CombinedMomentumCard({ momentum, topicMap, globalIndex }) {
  const top = [...momentum]
    .sort((a, b) => Number(b.momentum ?? 0) - Number(a.momentum ?? 0))
    .slice(0, 3)
  const maxAbs = Math.max(0.0001, ...top.map((m) => Math.abs(Number(m.momentum ?? 0))))

  return (
    <div className="glass-card rim-light combined-momentum-card">
      <div className="chart-header">
        <h2 className="chart-title">Combined momentum</h2>
        <span className="material-symbols-outlined">bolt</span>
      </div>
      <div className="chart-body momentum-card">
        <div className="metric-row">
          <div>
            <div className="metric-label">Highest topic momentum</div>
            <div className="metric-value">{globalIndex}</div>
          </div>
          <span className="material-symbols-outlined text-primary">trending_up</span>
        </div>
        <div className="progress-group">
          {top.length === 0 && (
            <p className="metric-label">Run an analysis to see topic momentum.</p>
          )}
          {top.map((m) => {
            const value = Number(m.momentum ?? 0)
            const label = topicMap?.[m.topic_id]?.slice(0, 2).join(', ') || `Topic ${m.topic_id}`
            return (
              <div key={m.topic_id} className="progress-item">
                <div className="progress-title">
                  <span>{label}</span>
                  <span className="font-data-mono">{value.toFixed(2)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.round((Math.abs(value) / maxAbs) * 100)}%`,
                      background: value < 0 ? 'var(--warn)' : undefined,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PapersTable({ papers, topicMap, page, setPage, onDownload }) {
  const pageCount = Math.max(1, Math.ceil(papers.length / PAGE_SIZE))
  const current = papers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="glass-card table-card">
      <div className="table-header">
        <h2 className="table-title">Recent research papers</h2>
        <div className="table-actions">
          <button type="button" className="table-action-button" aria-label="Download CSV" onClick={onDownload}>
            <span className="material-symbols-outlined">download</span>
          </button>
        </div>
      </div>
      <div className="table-content">
        <table className="table">
          <thead>
            <tr>
              <th>Paper title</th>
              <th>Authors</th>
              <th>Date</th>
              <th>Topic</th>
              <th>Citations</th>
            </tr>
          </thead>
          <tbody>
            {papers.length ? (
              current.map((paper, index) => (
                <tr key={`${paper.id ?? paper.title}-${index}`} className="table-row">
                  <td>{paper.title || paper.id || 'Untitled paper'}</td>
                  <td>{authorsText(paper.authors ?? paper.authors_list)}</td>
                  <td>{dateText(paper.published_date)}</td>
                  <td>
                    <span className="topic-pill">{topicName(topicMap, paper.topic_id)}</span>
                  </td>
                  <td>{paper.citation_count ?? paper.citations ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                  No papers loaded yet. Run an analysis to populate the table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="paper-footer">
        <span>
          Showing {current.length} of {papers.length.toLocaleString()} papers
        </span>
        <div className="table-actions">
          <button type="button" className="table-action-button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            Prev
          </button>
          {pageWindow(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} style={{ padding: '0 4px', color: 'var(--muted)' }}>…</span>
            ) : (
              <button
                key={p}
                type="button"
                className="table-action-button"
                aria-current={page === p ? 'page' : undefined}
                style={page === p ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : undefined}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className="table-action-button" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}>
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [query, setQuery] = useState('federated learning')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [papersPage, setPapersPage] = useState(1)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const inputRef = useRef(null)

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable: ignore */
      }
      return next
    })
  }

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Enter a research query before analyzing.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const data = await runPipeline(query.trim())
      setResult(data)
      setPapersPage(1)
    } catch (fetchError) {
      setError(fetchError?.message || 'Unable to reach the analysis API.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewAnalysis = () => {
    setActivePage('Dashboard')
    setResult(null)
    setError('')
    setQuery('')
    inputRef.current?.focus()
  }

  const papers = result?.papers ?? []
  const topicMap = result?.topic_map ?? {}

  const velocityItems = useMemo(
    () => (Array.isArray(result?.velocity) ? result.velocity.filter(Boolean) : []),
    [result]
  )
  const citationItems = useMemo(
    () => (Array.isArray(result?.citation_velocity) ? result.citation_velocity.filter(Boolean) : []),
    [result]
  )
  const backendMomentum = useMemo(
    () => (Array.isArray(result?.momentum) ? result.momentum.filter(Boolean) : []),
    [result]
  )

  // Same 50/50 blend as the backend, used only if the backend sent no momentum
  const fallbackMomentum = useMemo(() => {
    const ids = new Set(
      [...velocityItems, ...citationItems].map((i) => i.topic_id).filter((id) => id != null)
    )
    return [...ids].map((id) => {
      const pub = Number(velocityItems.find((v) => v.topic_id === id)?.velocity ?? 0)
      const cit = Number(citationItems.find((c) => c.topic_id === id)?.citation_velocity ?? 0)
      const m = 0.5 * pub + 0.5 * cit
      return {
        topic_id: id,
        publication_velocity: pub,
        citation_velocity: cit,
        momentum: m,
        momentum_trend: m > 0.1 ? '↑' : m < -0.1 ? '↓' : '→',
      }
    })
  }, [velocityItems, citationItems])

  const dashboardMomentum = backendMomentum.length ? backendMomentum : fallbackMomentum

  const derivedResult = useMemo(
    () => ({ ...result, momentum: dashboardMomentum }),
    [result, dashboardMomentum]
  )

  const globalIndex = useMemo(() => {
    if (dashboardMomentum.length === 0) return '—'
    return Math.max(...dashboardMomentum.map((i) => Number(i?.momentum ?? 0))).toFixed(2)
  }, [dashboardMomentum])

  const maxPredicted = useMemo(
    () => Math.max(0.0001, ...(result?.forecast ?? []).map((f) => Number(f.predicted_score ?? 0))),
    [result]
  )

  const downloadPapers = () => {
    if (!papers.length) return
    const safe = (v) => (/^[=+\-@]/.test(String(v)) ? `'${v}` : v) // avoid spreadsheet formula injection
    const headers = ['Title', 'Authors', 'Published date', 'Topic', 'Citations']
    const rows = papers.map((paper) => [
      paper.title || paper.id || 'Untitled paper',
      authorsText(paper.authors),
      dateText(paper.published_date),
      topicName(topicMap, paper.topic_id),
      paper.citation_count ?? paper.citations ?? 'N/A',
    ])
    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((v) => `"${String(safe(v)).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `paper-mind-${query.trim().replace(/\s+/g, '-').toLowerCase() || 'query'}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  const papersTable = (
    <PapersTable
      papers={papers}
      topicMap={topicMap}
      page={papersPage}
      setPage={setPapersPage}
      onDownload={downloadPapers}
    />
  )

  const momentumCard = (
    <CombinedMomentumCard momentum={dashboardMomentum} topicMap={topicMap} globalIndex={globalIndex} />
  )

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onNewAnalysis={handleNewAnalysis}
        collapsed={collapsed}
      />
      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-circle"
              aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
              aria-expanded={!collapsed}
              onClick={toggleSidebar}
            >
              <span className="material-symbols-outlined">{collapsed ? 'menu' : 'menu_open'}</span>
            </button>
            <div>
              <h1 className="topbar-title">PaperMind</h1>
              <p className="search-hint">Research trend discovery for academic innovation.</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-circle" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button type="button" className="icon-circle" aria-label="Account">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>

        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          loading={loading}
          inputRef={inputRef}
        />

        {error && <div className="error-card" role="alert">{error}</div>}

        {loading && (
          <div className="glass-card empty-state" role="status">
            Analyzing papers and topics. A new query can take up to 30 seconds.
          </div>
        )}

        {!result && !loading && activePage === 'Dashboard' && (
          <div className="glass-card empty-state">
            Enter a topic and select Analyze to see publication velocity, momentum, forecasts and research ideas.
          </div>
        )}

        {activePage === 'Dashboard' && (
          <>
            <StatsCards result={derivedResult} />

            <section className="charts-grid section-grid">
              <VelocityChart velocity={result?.velocity ?? []} />
              <MomentumChart momentum={dashboardMomentum} />
            </section>

            <section className="charts-grid section-grid">
              <ForecastChart forecast={result?.forecast ?? []} />
              {momentumCard}
            </section>

            <TopicTable
              topicMap={topicMap}
              velocity={result?.velocity ?? []}
              momentum={dashboardMomentum}
              forecast={result?.forecast ?? []}
              onViewAll={() => setActivePage('Trends')}
            />

            <div style={{ marginTop: '24px' }}>{papersTable}</div>
          </>
        )}

        {activePage === 'Trends' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Trends</h2>
              <p>Publication velocity and forecast patterns for the current query.</p>
            </div>
            <section className="charts-grid section-grid">
              <VelocityChart velocity={result?.velocity ?? []} />
              <ForecastChart forecast={result?.forecast ?? []} />
            </section>
            <TopicTable
              topicMap={topicMap}
              velocity={result?.velocity ?? []}
              momentum={dashboardMomentum}
              forecast={result?.forecast ?? []}
              onViewAll={() => setActivePage('Trends')}
            />
          </div>
        )}

        {activePage === 'Momentum' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Momentum</h2>
              <p>Topic momentum, combining publication growth and citation growth.</p>
            </div>
            <section className="charts-grid section-grid">
              <MomentumChart momentum={dashboardMomentum} />
              {momentumCard}
            </section>
          </div>
        )}

        {activePage === 'Forecast' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Forecast</h2>
              <p>Projected topic strength for the coming weeks.</p>
            </div>
            <section className="charts-grid section-grid">
              <ForecastChart forecast={result?.forecast ?? []} />
              <div className="glass-card rim-light combined-momentum-card">
                <div className="chart-header">
                  <h2 className="chart-title">Predicted topic scores</h2>
                  <span className="material-symbols-outlined">insights</span>
                </div>
                <div className="chart-body">
                  <p className="metric-label">
                    A straight-line projection from recent topic scores. Treat it as a rough guide.
                  </p>
                  {result?.forecast?.length ? (
                    result.forecast.map((item) => (
                      <div key={item.topic_id} className="progress-item">
                        <div className="progress-title">
                          <span>{topicMap?.[item.topic_id]?.slice(0, 2).join(', ') || `Topic ${item.topic_id}`}</span>
                          <span className="font-data-mono">{Number(item.predicted_score ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.round((Number(item.predicted_score ?? 0) / maxPredicted) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="metric-label">Run an analysis to see forecasts.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activePage === 'Papers' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Papers</h2>
              <p>Recent arXiv papers matching your query.</p>
            </div>
            {papersTable}
          </div>
        )}

        {activePage === 'Gaps' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Research gaps</h2>
              <p>Research ideas based on the main topics in your query.</p>
            </div>
            <ResearchGaps gaps={result?.research_gaps ?? []} warnings={result?.warnings ?? []} />
          </div>
        )}

        {activePage === 'Gaps' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Research Gaps</h2>
              <p>AI-powered research opportunities identified from the top accelerating topics in your query.</p>
            </div>
            <ResearchGaps gaps={result?.research_gaps ?? []} />
          </div>
        )}

        {activePage === 'Settings' && (
          <div className="page-section empty-state">
            Settings are not available yet. Use the dashboard to analyze a topic.
          </div>
        )}

        {activePage === 'Support' && (
          <div className="page-section empty-state">
            Support is not available yet. Try running an analysis from the dashboard.
          </div>
        )}
      </main>
    </div>
  )
}