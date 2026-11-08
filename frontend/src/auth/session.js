export const AUTH_SESSION_KEY = 'papermind.googleSession'

export function decodeGoogleToken(token) {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))
    if (!claims.sub || !claims.exp || claims.exp * 1000 <= Date.now()) return null
    return {
      access_token: token,
      expires_at: claims.exp,
      user: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
      },
    }
  } catch {
    return null
  }
}

export function readAuthSession() {
  try {
    const stored = sessionStorage.getItem(AUTH_SESSION_KEY)
    if (!stored) return null
    const session = decodeGoogleToken(stored)
    if (!session) sessionStorage.removeItem(AUTH_SESSION_KEY)
    return session
  } catch {
    return null
  }
}

export function saveAuthSession(token) {
  const session = decodeGoogleToken(token)
  if (!session) throw new Error('Google returned an invalid or expired sign-in credential. Please try again.')
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, token)
  } catch {
    throw new Error('Your browser could not save the sign-in session. Check browser storage settings and try again.')
  }
  return session
}

export function clearAuthSession() {
  try { sessionStorage.removeItem(AUTH_SESSION_KEY) } catch { /* storage may be unavailable */ }
}
