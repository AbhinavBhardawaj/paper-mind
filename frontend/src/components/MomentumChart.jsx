function topicLabel(topicMap, topicId) {
  const keywords = topicMap?.[topicId]
  return Array.isArray(keywords) && keywords.length
    ? keywords.slice(0, 2).join(' · ')
    : `Topic ${topicId}`
}

function trendLabel(trend) {
  if (trend === '↑') return 'Growing'
  if (trend === '↓') return 'Declining'
  return 'Stable'
}

export default function MomentumChart({ momentum, topicMap = {} }) {
  const rows = (Array.isArray(momentum) ? momentum : [])
    .filter((item) => item?.topic_id != null)
    .sort((a, b) => Number(b.momentum ?? 0) - Number(a.momentum ?? 0))
  const maxAbsMomentum = Math.max(0.01, ...rows.map((item) => Math.abs(Number(item.momentum ?? 0))))

  return (
    <div className="glass-card chart-card momentum-ranking-card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">Topic momentum</h2>
          <p className="metric-label">A 50/50 blend of publication velocity and citation velocity.</p>
        </div>
        <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
      </div>
      <div className="chart-body momentum-card">
        {rows.length ? rows.map((item) => {
          const value = Number(item.momentum ?? 0)
          const width = Math.max(4, (Math.abs(value) / maxAbsMomentum) * 100)
          return (
            <div key={item.topic_id} className="progress-item">
              <div className="progress-title momentum-topic-label">
                <span>{topicLabel(topicMap, item.topic_id)}</span>
                <span className="momentum-trend">{trendLabel(item.momentum_trend)} · {value.toFixed(2)}</span>
              </div>
              <div className="progress-bar" aria-label={`Momentum ${value.toFixed(2)}`}>
                <div
                  className={`progress-fill ${value < 0 ? 'momentum-negative' : 'momentum-positive'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="momentum-components">
                <span>Publication {Number(item.publication_velocity ?? 0).toFixed(2)}</span>
                <span>Citations {Number(item.citation_velocity ?? 0).toFixed(2)}</span>
              </div>
            </div>
          )
        }) : (
          <div className="empty-state">Run an analysis to compare topic publication and citation momentum.</div>
        )}
      </div>
    </div>
  )
}

export function MomentumCombinations({ momentum, topicMap = {} }) {
  const topics = (Array.isArray(momentum) ? momentum : [])
    .filter((item) => item?.topic_id != null)
  const pairs = []

  for (let i = 0; i < topics.length; i += 1) {
    for (let j = i + 1; j < topics.length; j += 1) {
      const firstScore = Number(topics[i].momentum ?? 0)
      const secondScore = Number(topics[j].momentum ?? 0)
      pairs.push({
        firstId: topics[i].topic_id,
        secondId: topics[j].topic_id,
        score: (firstScore + secondScore) / 2,
      })
    }
  }

  pairs.sort((a, b) => b.score - a.score)
  const bestPairs = pairs.filter((pair) => pair.score > 0).slice(0, 5)

  return (
    <div className="glass-card chart-card momentum-combinations-card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">Promising topic combinations</h2>
          <p className="metric-label">Pair score is the average momentum of the two topics.</p>
        </div>
        <span className="material-symbols-outlined" aria-hidden="true">hub</span>
      </div>
      {bestPairs.length ? (
        <ol className="momentum-pair-list">
          {bestPairs.map((pair) => (
            <li className="momentum-pair" key={`${pair.firstId}-${pair.secondId}`}>
              <div className="momentum-pair-labels">
                <span className="topic-pill">{topicLabel(topicMap, pair.firstId)}</span>
                <span className="momentum-pair-join" aria-label="combined with">×</span>
                <span className="topic-pill">{topicLabel(topicMap, pair.secondId)}</span>
              </div>
              <span className="momentum-pair-score">{pair.score.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-state">
          {pairs.length
            ? 'No topic pair has positive combined momentum yet. Try a broader research query.'
            : 'Run an analysis with at least two topics to compare combinations.'}
        </div>
      )}
      <p className="momentum-pair-note">
        This is a ranking estimate from the two topic scores; it does not measure direct collaboration or cross-topic synergy.
      </p>
    </div>
  )
}
