/**
 * API client for making HTTP requests to the backend
 */

export async function api<T>(url: string, opts: RequestInit = {}): Promise<T> {
  // Create AbortController for 30-second timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds

  try {
    const resp = await fetch(`/api/${url}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      signal: controller.signal,
      ...opts,
    })

    clearTimeout(timeoutId)

    if (!resp.ok) {
      const errorText = await resp.text()
      throw new Error(errorText)
    }

    // Handle empty responses (like DELETE requests that return 204)
    if (resp.status === 204 || resp.headers.get('content-length') === '0') {
      return null as T
    }

    return resp.json()
  } catch (error) {
    clearTimeout(timeoutId)

    // Handle network errors gracefully (broken pipe, connection reset, etc.)
    // These are common with polling when clients disconnect
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      // Silently ignore network errors that occur during normal operation
      // (broken pipe, connection reset, etc. - common with mobile browsers)
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed')
      ) {
        // Re-throw as a special error that can be caught and ignored by polling
        const networkError = new Error('Network error')
        ;(networkError as any).isNetworkError = true
        throw networkError
      }
    }
    throw error
  }
}
