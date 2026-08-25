export class ApiRequestError extends Error {
  readonly service: string
  readonly status?: number

  constructor(service: string, message: string, status?: number) {
    super(message)
    this.service = service
    this.status = status
    this.name = 'ApiRequestError'
  }
}

export async function fetchApi<T>(path: string, options: RequestInit, service: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, options)
  } catch (error) {
    if (import.meta.env.DEV) console.error(`[${service}] network request failed`, { path, error })
    throw new ApiRequestError(service, `Unable to connect to ${service}. Please try again.`)
  }

  const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null
  if (!response.ok) {
    const message = payload?.message || payload?.error || `${service} request failed.`
    if (import.meta.env.DEV) console.error(`[${service}] request failed`, { path, status: response.status, message })
    throw new ApiRequestError(service, message, response.status)
  }
  return payload as T
}