export default function StatsCards({ result }) {
  const papersCount = result?.papers?.length ?? 0
  const activeTopics = result?.topic_map ? Object.keys(result.topic_map).length : 0
  const momentumItems = Array.isArray(result?.momentum) ? result.momentum.filter((item) => item && typeof item.momentum === 'number') : []
  const highestMomentum = momentumItems.length
    ? momentumItems.reduce((winner, item) => (Number(item?.momentum ?? 0) > Number(winner?.momentum ?? 0) ? item : winner), momentumItems[0])
    : null
  const fastestGrowing = Array.isArray(result?.top_accelerating) ? result.top_accelerating[0] : null

  const cards = [
    {
      title: 'Total Papers',
      value: papersCount.toLocaleString(),
      subtitle: `${result?.papers?.length ? '+12.4%' : 'Loading...'}`,
      progress: 72,
      accent: 'var(--primary)',
    },
    {
      title: 'Active Topics',
      value: activeTopics,
      subtitle: 'Current',
      progress: 45,
      accent: 'var(--secondary)',
    },
    {
      title: 'Highest Momentum',
      value: highestMomentum ? Number(highestMomentum.momentum).toFixed(2) : '—',
      subtitle: highestMomentum ? `Topic ${highestMomentum.topic_id}` : 'Loading...',
      progress: 98,
      accent: 'var(--tertiary)',
    },
    {
      title: 'Fastest Growing',
      value: fastestGrowing?.keywords ? fastestGrowing.keywords.join(', ') : '—',
      subtitle: fastestGrowing ? 'Top Trend' : 'Loading...',
      progress: 61,
      accent: 'var(--error)',
    },
  ]

  return (
    <section className="stats-grid section-grid">
      {cards.map((card) => (
        <div key={card.title} className="glass-card">
          <div className="kpi-title">
            <span>{card.title}</span>
            <span className="material-symbols-outlined">{card.title === 'Fastest Growing' ? 'trending_up' : card.title === 'Highest Momentum' ? 'bolt' : card.title === 'Total Papers' ? 'library_books' : 'hub'}</span>
          </div>
          <div className="kpi-value">{card.value}</div>
          <div className="kpi-subtitle">{card.subtitle}</div>
          <div className="kpi-progress">
            <div className="kpi-progress-inner" style={{ width: `${card.progress}%`, background: card.accent }} />
          </div>
        </div>
      ))}
    </section>
  )
}
