function topicLabel(topicMap, topicId) {
  const keywords = topicMap?.[topicId]
  return Array.isArray(keywords) && keywords.length
    ? keywords.slice(0, 2).join(' · ')
    : `Topic ${topicId}`
}

export default function ForecastChart({ forecast, topicMap = {} }) {
  const rows = (Array.isArray(forecast) ? forecast : [])
    .filter((item) => item?.topic_id != null && item?.predicted_score != null)
    .slice(0, 7)
  const maxValue = Math.max(
    0.01,
    ...rows.flatMap((item) => [
      Math.abs(Number(item.current_score ?? 0)),
      Math.abs(Number(item.predicted_score ?? 0)),
    ])
  )

  return (
    <div className="glass-card chart-card forecast-card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">6-Month Forecast</h2>
          <p className="metric-label">Compare current topic strength with its projection.</p>
        </div>
        <span className="material-symbols-outlined" aria-hidden="true">insights</span>
      </div>

      {rows.length ? (
        <>
          <div className="forecast-bars" role="list" aria-label="Current and projected topic scores">
            {rows.map((item) => {
              const current = Number(item.current_score ?? 0)
              const projected = Number(item.predicted_score ?? 0)
              const currentHeight = Math.max(4, (Math.abs(current) / maxValue) * 100)
              const projectedHeight = Math.max(4, (Math.abs(projected) / maxValue) * 100)

              return (
                <div className="forecast-topic" role="listitem" key={item.topic_id}>
                  <div className="forecast-bar-pair" title={`${topicLabel(topicMap, item.topic_id)}: ${current.toFixed(2)} now, ${projected.toFixed(2)} projected`}>
                    <div className="forecast-bar current" style={{ height: `${currentHeight}%` }} />
                    <div className={`forecast-bar projected${item.predicted_trend === '↑' ? ' growth' : ''}`} style={{ height: `${projectedHeight}%` }} />
                  </div>
                  <span className="forecast-topic-label" title={topicLabel(topicMap, item.topic_id)}>
                    {topicLabel(topicMap, item.topic_id)}
                  </span>
                  <span className="forecast-topic-score">{projected.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
          <div className="forecast-legend" aria-label="Chart legend">
            <span><i className="forecast-legend-swatch current" />Current</span>
            <span><i className="forecast-legend-swatch projected" />Projected</span>
            <span>+6 months</span>
          </div>
        </>
      ) : (
        <div className="empty-state forecast-empty-state">
          Run an analysis to compare current topic strength with its six-month projection.
        </div>
      )}
    </div>
  )
}
