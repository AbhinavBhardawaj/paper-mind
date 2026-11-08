export default function SearchBar({ query, setQuery, onSearch, loading, inputRef, compact = false }) {
  return (
    <div className={`search-bar${compact ? ' compact' : ''}`}>
      <div className="search-input-wrapper">
        <span className="search-icon material-symbols-outlined">search</span>
        <input
          ref={inputRef}
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSearch()
            }
          }}
          placeholder="Enter research query..."
        />
        <span className="shortcut-badge">CMD+K</span>
      </div>
      <button className="search-button" onClick={onSearch} type="button" disabled={loading} aria-busy={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
      <span className="search-hint">Press enter to run</span>
    </div>
  )
}
