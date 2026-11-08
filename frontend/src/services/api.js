import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 120000, // 2 minutes: a first analysis can take 30s or more
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function runPipeline(query) {
  console.log('[API] PIPELINE_START:', { query })
  console.time('fetch')

  try {
    const response = await apiClient.post('/api/pipeline', { query })
    console.timeEnd('fetch')

    const payload = response.data
    if (!payload) {
      throw new Error('Empty response from backend')
    }

    // The backend wraps results as { cached, data, elapsed_seconds }
    const data = payload.data || payload
    console.log('[API] EXTRACTED_DATA:', {
      keys: Object.keys(data),
      paperCount: data.papers?.length ?? 0,
      velocityCount: data.velocity?.length ?? 0,
      momentumCount: data.momentum?.length ?? 0,
      forecastCount: data.forecast?.length ?? 0,
      gapCount: data.research_gaps?.length ?? 0,
      warnings: data.warnings ?? [],
      topicMapSize: Object.keys(data.topic_map || {}).length,
    })

    const asArray = (v) => (Array.isArray(v) ? v : [])

    return {
      papers: asArray(data.papers),
      topic_map: data.topic_map && typeof data.topic_map === 'object' ? data.topic_map : {},
      tfidf_matrix: asArray(data.tfidf_matrix),
      velocity: asArray(data.velocity),
      citation_velocity: asArray(data.citation_velocity),
      momentum: asArray(data.momentum),
      forecast: asArray(data.forecast),
      top_accelerating: asArray(data.top_accelerating),
      research_gaps: asArray(data.research_gaps),
      warnings: asArray(data.warnings),
    }
  } catch (error) {
    // FastAPI errors look like { detail: "message" }
    const detail = error.response?.data?.detail
    const message = typeof detail === 'string' ? detail : error.message
    console.error('[API] FETCH_ERROR:', message, error)
    throw new Error(message)
  }
}