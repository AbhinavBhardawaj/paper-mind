function getBarHeight(velocity, maxVelocity) {
  const absVelocity = velocity != null ? Math.abs(Number(velocity)) : 0
  const normalized = maxVelocity > 0 ? absVelocity / maxVelocity : 0
  return Math.max(0.12, normalized)
}

export default function VelocityChart({ velocity, compact = false }) {
  const values = Array.isArray(velocity) && velocity.length ? velocity.slice(0, 7) : []
  const safeValues = values.filter((item) => item?.topic_id != null && item?.velocity != null)
  const maxVelocity = safeValues.length ? Math.max(...safeValues.map((item) => Math.abs(Number(item.velocity))), 0.01) : 0.01

  return (
    <div className={`glass-card chart-card${compact ? ' velocity-chart-compact' : ''}`}>
      <div className="chart-header">
        <h2 className="chart-title">Publication Velocity</h2>
        {!compact && <div className="chart-toolbar">
          <button type="button">D</button>
          <button type="button">W</button>
          <button type="button">M</button>
        </div>}
      </div>
      <div className="chart-body">
        {safeValues.length ? (
          <div className="velocity-bars" style={compact ? { gridTemplateColumns: `repeat(${safeValues.length}, minmax(0, 1fr))` } : undefined}>
            {safeValues.map((item) => (
              <div
                key={item.topic_id}
                className="velocity-bar"
                style={{ height: `${getBarHeight(item.velocity, maxVelocity) * 100}%` }}
                title={`Topic ${item.topic_id}: ${Number(item.velocity).toFixed(2)}`}
              >
                <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', color: 'var(--muted)' }}>
                  {item.trend === '↑' ? 'trending_up' : item.trend === '↓' ? 'trending_down' : 'trending_flat'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Waiting to analyze publication velocity.</div>
        )}
        <div className="bar-label-row">
          {safeValues.map((item) => (
            <span key={item.topic_id}>T{item.topic_id}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
