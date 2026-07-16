import React from 'react'

export default function ResearchGaps({ gaps = [] }) {
  if (!gaps.length) {
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
        No research gaps available. Run an analysis to generate AI-powered gap insights.
      </div>
    )
  }

  // If the only item is an error dict
  if (gaps.every(g => g.error)) {
    return (
      <div className="glass-card" style={{ padding: '24px', color: '#ff6b6b' }}>
        <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>error</span>
        Gap analysis failed: {gaps[0].error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {gaps.map((gap, index) => (
        <div key={index} className="glass-card rim-light" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              minWidth: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #2e5bff, #ddb7ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '14px', color: '#091228'
            }}>
              {index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="chart-title" style={{ marginBottom: '8px' }}>{gap.title}</h3>
              <p className="metric-label" style={{ marginBottom: '12px', lineHeight: '1.6' }}>{gap.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Why it matters
                  </div>
                  <div className="metric-label">{gap.why_it_matters}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Research question
                  </div>
                  <div className="metric-label" style={{ fontStyle: 'italic' }}>{gap.potential_research_question}</div>
                </div>
              </div>

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