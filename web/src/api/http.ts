type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text()

  if (response.status === 401 && !path.startsWith('/api/auth/login')) {
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : typeof (payload as { error?: string })?.error === 'string'
          ? (payload as { error: string }).error
          : JSON.stringify(payload)
    throw new ApiError(response.status, message || `Request failed: ${response.status}`, payload)
  }

  return payload as T
}
