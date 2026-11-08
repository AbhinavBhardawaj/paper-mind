const cardColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--navy)']

export default function TopicTable({ topicMap, velocity, momentum, forecast, onViewAll }) {
  let topicIds = Object.keys(topicMap || {}).slice(0, 4)

  if (!topicIds.length && Array.isArray(momentum) && momentum.length) {
    topicIds = momentum.slice(0, 4).map((item) => String(item.topic_id))
  }

  if (!topicIds.length && Array.isArray(velocity) && velocity.length) {
    topicIds = velocity.slice(0, 4).map((item) => String(item.topic_id))
  }

  const rows = topicIds.map((id, index) => {
    const topicId = Number(id)
    const keywords = topicMap?.[id]?.slice(0, 3) ?? ['Unknown']
    const velocityItem = Array.isArray(velocity) ? velocity.find((item) => item?.topic_id === topicId) : null
    const momentumItem = Array.isArray(momentum) ? momentum.find((item) => item?.topic_id === topicId) : null
    const forecastItem = Array.isArray(forecast) ? forecast.find((item) => item?.topic_id === topicId) : null
    const trend = momentumItem?.momentum_trend ?? velocityItem?.trend ?? '→'

    return {
      topicId,
      keywords,
      velocity: Number(velocityItem?.velocity ?? 0),
      momentum: Number(momentumItem?.momentum ?? 0),
      forecast: Number(forecastItem?.predicted_score ?? 0),
      trend,
      accent: cardColors[index % cardColors.length],
    }
  })

  if (!rows.length) {
    return <div className="glass-card empty-state">No topic data available yet.</div>
  }

  return (
    <div className="topic-explorer-section">
      <div className="glass-card table-card">
        <div className="table-header">
          <h2 className="table-title">Topic Explorer</h2>
          <button className="table-action-button" type="button" onClick={onViewAll}>
            View All Trends
          </button>
        </div>
      </div>
      <div className="topic-explorer-grid">
        {rows.map((row) => (
          <div key={row.topicId} className="topic-card">
            <div className="topic-card-top">
              <span className="topic-card-id">ID: {row.topicId}</span>
              <span className="topic-card-trend" style={{ color: row.accent }}>
                {row.trend} {Math.round(row.momentum * 10)}%
              </span>
            </div>
            <h3 className="topic-card-title">{row.keywords[0]}</h3>
            <div className="topic-card-tags">
              {row.keywords.map((keyword) => (
                <span key={keyword} className="topic-pill">
                  {keyword}
                </span>
              ))}
            </div>
            <div className="topic-card-meta">
              <span>Momentum Score</span>
              <span className="font-data-mono">{row.momentum.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
