const SCOPE_COLORS = {
  High: 'var(--good)',
  Medium: 'var(--warn)',
  Low: 'var(--muted)',
}

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--muted)',
  marginBottom: '4px',
}

function formatVelocity(v) {
  if (typeof v !== 'number') return 'n/a'
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`
}

export default function ResearchGaps({ gaps = [], warnings = [] }) {
  if (!gaps.length) {
    const failed = warnings.includes('research_gaps_failed')
    const disabled = warnings.includes('research_gaps_disabled')
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
        {failed
          ? 'Research ideas could not be generated right now. Please try again later.'
          : disabled
          ? 'Research ideas are turned off on this server.'
          : 'No research ideas available. Run an analysis to generate AI-powered insights.'}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p className="metric-label" style={{ fontSize: '12px', margin: 0 }}>
        AI-generated ideas based on this search's topics and paper titles. Scope ratings are the
        model's estimate, not a measurement. Treat these as starting points, not verified gaps.
      </p>

      {gaps.map((gap, index) => (
        <div key={index} className="glass-card rim-light" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                minWidth: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--blue-950)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
                color: '#f8fafc',
              }}
            >
              {index + 1}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h3 className="chart-title" style={{ marginBottom: '8px' }}>{gap.title}</h3>
                {gap.scope_rating && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 10px',
                      borderRadius: '999px',
                      border: `1px solid ${SCOPE_COLORS[gap.scope_rating] || '#94a3b8'}`,
                      color: SCOPE_COLORS[gap.scope_rating] || '#94a3b8',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Scope: {gap.scope_rating}
                  </span>
                )}
              </div>

              {(gap.field_a || gap.field_b) && (
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {gap.field_a && <span className="topic-pill">{gap.field_a}</span>}
                  {gap.field_a && gap.field_b && (
                    <span style={{ color: 'var(--muted)', fontWeight: 700 }}>×</span>
                  )}
                  {gap.field_b && <span className="topic-pill">{gap.field_b}</span>}
                </div>
              )}

              <p className="metric-label" style={{ marginBottom: '12px', lineHeight: '1.6' }}>
                {gap.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={labelStyle}>Why it matters</div>
                  <div className="metric-label">{gap.why_it_matters}</div>
                </div>
                <div>
                  <div style={labelStyle}>Research question</div>
                  <div className="metric-label" style={{ fontStyle: 'italic' }}>
                    {gap.potential_research_question}
                  </div>
                </div>
              </div>

              {gap.scope_rationale && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={labelStyle}>Scope</div>
                  <div className="metric-label">{gap.scope_rationale}</div>
                </div>
              )}

              {Array.isArray(gap.evidence) && gap.evidence.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={labelStyle}>Built on topics from your search</div>
                  <div className="metric-label" style={{ fontSize: '12px' }}>
                    {gap.evidence
                      .map(
                        (e) =>
                          `Topic ${e.topic_id} (${(e.keywords || []).slice(0, 3).join(', ')}): ` +
                          `${e.paper_count} papers, velocity ${formatVelocity(e.velocity)}`
                      )
                      .join('  |  ')}
                  </div>
                </div>
              )}

              {Array.isArray(gap.related_keywords) && gap.related_keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {gap.related_keywords.map((kw, i) => (
                    <span key={i} className="topic-pill">{kw}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
