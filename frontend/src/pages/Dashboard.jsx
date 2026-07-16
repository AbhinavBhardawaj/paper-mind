import { useEffect, useRef, useState, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/SearchBar'
import StatsCards from '../components/StatsCards'
import VelocityChart from '../components/VelocityChart'
import MomentumChart from '../components/MomentumChart'
import ForecastChart from '../components/ForecastChart'
import TopicTable from '../components/TopicTable'
import { runPipeline } from '../services/api'
import ResearchGaps from '../components/ResearchGaps'

export default function Dashboard() {
  const [query, setQuery] = useState('federated learning')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [papersPage, setPapersPage] = useState(1)
  const inputRef = useRef(null)

  console.log('[DASHBOARD] RENDER:', {
    loading,
    hasResult: !!result,
    resultKeys: result ? Object.keys(result) : [],
    activePage,
  })

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

  const handleSearch = async () => {
    console.log('[SEARCH] START:', { query })
    if (!query.trim()) {
      setError('Please enter a research query before analyzing.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      console.time('total_pipeline')
      const data = await runPipeline(query.trim())
      console.timeEnd('total_pipeline')
      console.log('[SEARCH] RESPONSE_RECEIVED:', {
        keys: Object.keys(data),
        paperCount: data.papers?.length ?? 0,
      })
      setResult(data)
      console.log('[SEARCH] STATE_UPDATED')
    } catch (fetchError) {
      console.error('[SEARCH] ERROR:', fetchError)
      setError(fetchError?.message || 'Unable to connect to the analysis API.')
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (page) => {
    console.log('[NAVIGATE]:', page)
    setActivePage(page)
  }

  useEffect(() => {
    console.log('[EFFECT] PAPERS_LENGTH_CHANGED:', result?.papers?.length)
    setPapersPage(1)
  }, [result?.papers?.length])

  const handleNewAnalysis = async () => {
    setActivePage('Dashboard')
    inputRef.current?.focus()
    if (!loading) {
      await handleSearch()
    }
  }

  const papers = result?.papers ?? []
  const pageSize = 6
  const pageCount = Math.max(1, Math.ceil(papers.length / pageSize))
  const currentPapers = papers.slice((papersPage - 1) * pageSize, papersPage * pageSize)

  const backendMomentum = Array.isArray(result?.momentum) ? result.momentum.filter(Boolean) : []
  const velocityItems = Array.isArray(result?.velocity) ? result.velocity.filter(Boolean) : []
  const citationItems = Array.isArray(result?.citation_velocity) ? result.citation_velocity.filter(Boolean) : []

  // Use useMemo to prevent recalculation on every render
  const fallbackMomentum = useMemo(() => {
    console.log('[MEMO] CALCULATING_FALLBACK_MOMENTUM:', {
      velocityCount: velocityItems.length,
      citationCount: citationItems.length,
    })
    const map = new Map()

    velocityItems.forEach((item) => {
      if (item?.topic_id == null) return
      map.set(item.topic_id, {
        topic_id: item.topic_id,
        publication_velocity: Number(item.velocity ?? 0),
        citation_velocity: 0,
        momentum: Number(item.velocity ?? 0),
        momentum_trend: item.trend ?? '→',
      })
    })

    citationItems.forEach((item) => {
      if (item?.topic_id == null) return
      const existing = map.get(item.topic_id) || {
        topic_id: item.topic_id,
        publication_velocity: 0,
        citation_velocity: 0,
        momentum: 0,
        momentum_trend: item.citation_trend ?? '→',
      }
      const publication_velocity = Number(existing.publication_velocity)
      const citation_velocity = Number(item.citation_velocity ?? 0)
      const combinedMomentum = (publication_velocity + citation_velocity) / (existing.publication_velocity ? 2 : 1)
      map.set(item.topic_id, {
        ...existing,
        citation_velocity,
        momentum: combinedMomentum,
        momentum_trend: publication_velocity >= citation_velocity ? existing.momentum_trend : item.citation_trend ?? '→',
      })
    })

    const result = Array.from(map.values())
    console.log('[MEMO] FALLBACK_MOMENTUM_RESULT:', result.length)
    return result
  }, [velocityItems, citationItems])

  const dashboardMomentum = backendMomentum.length ? backendMomentum : fallbackMomentum
  const derivedResult = useMemo(
    () => ({
      ...result,
      momentum: dashboardMomentum,
    }),
    [result, dashboardMomentum]
  )

  const highestMomentumItem = useMemo(() => {
    if (dashboardMomentum.length === 0) return null
    return dashboardMomentum.reduce((best, item) => (Number(item?.momentum ?? -Infinity) > Number(best?.momentum ?? -Infinity) ? item : best), dashboardMomentum[0])
  }, [dashboardMomentum])

  const globalIndex = useMemo(() => {
    if (dashboardMomentum.length === 0) return '—'
    return Math.max(...dashboardMomentum.map((item) => Number(item?.momentum ?? 0))).toFixed(2)
  }, [dashboardMomentum])

  const downloadPapers = () => {
    if (!papers.length) {
      return
    }

    const headers = ['Title', 'Authors', 'Published Date', 'Topic', 'Citations']
    const rows = papers.map((paper) => {
      const citationValue = paper.citation_count ?? paper.citations
      const topicName = result?.topic_map?.[paper.topic_id]?.[0] ?? `Topic ${paper.topic_id ?? '-'}`
      return [
        paper.title || paper.id || 'Untitled Paper',
        Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || 'Unknown',
        paper.published_date ?? 'Unknown',
        topicName,
        citationValue != null ? citationValue : 'N/A',
      ]
    })

    const csv = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `paper-mind-papers-${query.replace(/\s+/g, '-').toLowerCase() || 'query'}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} onNewAnalysis={handleNewAnalysis} />
      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="topbar-title">PaperMind</h1>
            <p className="search-hint">Research trend discovery for academic innovation.</p>
          </div>
          <div className="topbar-actions">
            <button className="search-button" onClick={handleSearch} type="button" disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
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

        {error && <div className="error-card">{error}</div>}

        {!result && !loading && activePage === 'Dashboard' && (
          <div className="glass-card empty-state">
            Start an analysis to populate the dashboard with velocity, momentum, forecast and topic signals.
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
              <div className="glass-card rim-light combined-momentum-card">
            <div className="chart-header">
              <h2 className="chart-title">Combined Momentum</h2>
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div className="chart-body momentum-card">
              <div className="metric-row">
                <div>
                  <div className="metric-label">Global Index</div>
                  <div className="metric-value">{globalIndex}</div>
                </div>
                <span className="material-symbols-outlined text-primary">trending_up</span>
              </div>
              <div className="progress-group">
                <div className="progress-item">
                  <div className="progress-title">
                    <span>Algorithmic Density</span>
                    <span className="font-data-mono">82%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '82%' }} />
                  </div>
                </div>
                <div className="progress-item">
                  <div className="progress-title">
                    <span>Network Diffusion</span>
                    <span className="font-data-mono">46%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '46%', background: 'linear-gradient(90deg, #ddb7ff, #2e5bff)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
            </section>

            <TopicTable
              topicMap={result?.topic_map ?? {}}
              velocity={result?.velocity ?? []}
              momentum={dashboardMomentum}
              forecast={result?.forecast ?? []}
              onViewAll={() => handleNavigate('Trends')}
            />

            <div className="glass-card table-card" style={{ marginTop: '24px' }}>
          <div className="table-header">
            <h2 className="table-title">Recent Research Papers</h2>
            <div className="table-actions">
              <button type="button" className="table-action-button">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button type="button" className="table-action-button" onClick={downloadPapers}>
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
          <div className="table-content">
            <table className="table">
              <thead>
                <tr>
                  <th>PAPER TITLE</th>
                  <th>AUTHORS</th>
                  <th>DATE</th>
                  <th>TOPIC</th>
                  <th>CITATIONS</th>
                </tr>
              </thead>
              <tbody>
                {papers.length ? (
                  currentPapers.map((paper, index) => (
                    <tr key={`${paper.id ?? paper.title}-${index}`} className="table-row">
                      <td>{paper.title || paper.id || 'Untitled Paper'}</td>
                      <td>{paper.authors ?? paper.authors_list ?? 'Unknown'}</td>
                      <td>{paper.published_date ?? 'Unknown'}</td>
                      <td>
                        <span className="topic-pill">
                          {result?.topic_map?.[paper.topic_id]?.[0] ?? `Topic ${paper.topic_id ?? '-'}`}
                        </span>
                      </td>
                      <td>{paper.citation_count ?? paper.citations ?? 'N/A'}</td>
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
            <span>Showing {currentPapers.length} of {papers.length.toLocaleString()} entries</span>
            <div className="table-actions">
              <button type="button" className="table-action-button" onClick={() => setPapersPage((prev) => Math.max(1, prev - 1))} disabled={papersPage === 1}>
                PREV
              </button>
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index + 1}
                  type="button"
                  className="table-action-button"
                  style={papersPage === index + 1 ? { background: 'linear-gradient(135deg, #2e5bff, #ddb7ff)', color: '#091228' } : undefined}
                  onClick={() => setPapersPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
              <button type="button" className="table-action-button" onClick={() => setPapersPage((prev) => Math.min(pageCount, prev + 1))} disabled={papersPage === pageCount}>
                NEXT
              </button>
            </div>
          </div>
        </div>
          </>
        )}

        {activePage === 'Trends' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Trends</h2>
              <p>Explore publication velocity and forecast patterns for the current query.</p>
            </div>
            <section className="charts-grid section-grid">
              <VelocityChart velocity={result?.velocity ?? []} />
              <ForecastChart forecast={result?.forecast ?? []} />
            </section>
            <TopicTable
              topicMap={result?.topic_map ?? {}}
              velocity={result?.velocity ?? []}
              momentum={dashboardMomentum}
              forecast={result?.forecast ?? []}
              onViewAll={() => handleNavigate('Trends')}
            />
          </div>
        )}

        {activePage === 'Momentum' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Momentum</h2>
              <p>Review topic momentum and citation velocity across the research landscape.</p>
            </div>
            <section className="charts-grid section-grid">
              <MomentumChart momentum={dashboardMomentum} />
              <div className="glass-card rim-light combined-momentum-card">
                <div className="chart-header">
                  <h2 className="chart-title">Combined Momentum</h2>
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div className="chart-body momentum-card">
                  <div className="metric-row">
                    <div>
                      <div className="metric-label">Global Index</div>
                      <div className="metric-value">{globalIndex}</div>
                    </div>
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                  </div>
                  <div className="progress-group">
                    <div className="progress-item">
                      <div className="progress-title">
                        <span>Algorithmic Density</span>
                        <span className="font-data-mono">82%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '82%' }} />
                      </div>
                    </div>
                    <div className="progress-item">
                      <div className="progress-title">
                        <span>Network Diffusion</span>
                        <span className="font-data-mono">46%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '46%', background: 'linear-gradient(90deg, #ddb7ff, #2e5bff)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activePage === 'Forecast' && (
          <div className="page-section">
            <div className="section-heading">
              <h2>Forecast</h2>
              <p>See the future trajectory of topic strength for upcoming weeks.</p>
            </div>
            <section className="charts-grid section-grid">
              <ForecastChart forecast={result?.forecast ?? []} />
              <div className="glass-card rim-light combined-momentum-card">
                <div className="chart-header">
                  <h2 className="chart-title">Prediction Overview</h2>
                  <span className="material-symbols-outlined">insights</span>
                </div>
                <div className="chart-body">
                  <p className="metric-label">Future scores are estimated from current topic momentum and velocity.</p>
                  {result?.forecast?.length ? (
                    result.forecast.map((item) => (
                      <div key={item.topic_id} className="progress-item">
                        <div className="progress-title">
                          <span>Topic {item.topic_id}</span>
                          <span className="font-data-mono">{Number(item.predicted_score ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${Math.min(100, Number(item.predicted_score ?? 0) * 10)}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="metric-label">Run analysis to generate forecast details.</p>
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
              <p>Browse the most recent research papers matching your query.</p>
            </div>
            <div className="glass-card table-card">
              <div className="table-header">
                <h2 className="table-title">Recent Research Papers</h2>
                <div className="table-actions">
                  <button type="button" className="table-action-button">
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                  <button type="button" className="table-action-button" onClick={downloadPapers}>
                    <span className="material-symbols-outlined">download</span>
                  </button>
                </div>
              </div>
              <div className="table-content">
                <table className="table">
                  <thead>
                    <tr>
                      <th>PAPER TITLE</th>
                      <th>AUTHORS</th>
                      <th>DATE</th>
                      <th>TOPIC</th>
                      <th>CITATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.length ? (
                      currentPapers.map((paper, index) => (
                        <tr key={`${paper.id ?? paper.title}-${index}`} className="table-row">
                          <td>{paper.title || paper.id || 'Untitled Paper'}</td>
                          <td>{Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || 'Unknown'}</td>
                          <td>{paper.published_date ?? 'Unknown'}</td>
                          <td>
                            <span className="topic-pill">
                              {result?.topic_map?.[paper.topic_id]?.[0] ?? `Topic ${paper.topic_id ?? '-'}`}
                            </span>
                          </td>
                          <td>{paper.citation_count ?? paper.citations ?? 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-row">
                          No papers loaded yet. Run an analysis to populate the table.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="paper-footer">
                <span>Showing {currentPapers.length} of {papers.length.toLocaleString()} entries</span>
                <div className="table-actions">
                  <button type="button" className="table-action-button" onClick={() => setPapersPage((prev) => Math.max(1, prev - 1))} disabled={papersPage === 1}>
                    PREV
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      key={index + 1}
                      type="button"
                      className="table-action-button"
                      style={papersPage === index + 1 ? { background: 'linear-gradient(135deg, #2e5bff, #ddb7ff)', color: '#091228' } : undefined}
                      onClick={() => setPapersPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button type="button" className="table-action-button" onClick={() => setPapersPage((prev) => Math.min(pageCount, prev + 1))} disabled={papersPage === pageCount}>
                    NEXT
                  </button>
                </div>
              </div>
            </div>
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
            Settings are coming soon. Use the dashboard to analyze research topics.
          </div>
        )}

        {activePage === 'Support' && (
          <div className="page-section empty-state">
            Support content is on the way. For now, try running an analysis or use the Dashboard page.
          </div>
        )}
      </main>
    </div>
  )
}
