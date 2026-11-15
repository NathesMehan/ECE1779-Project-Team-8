
const API_PREFIX = '/api'


export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}


// Shared HTTP request handler for backend communication.
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Let the browser set multipart boundaries for file uploads.
  if (options.body instanceof FormData) {
    headers.delete('Content-Type')
  }

  let response: Response

  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      0,
      'Unable to connect to the backend server.'
    )
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const errorData: unknown = await response.clone().json()

      if (
        typeof errorData === 'object' &&
        errorData !== null &&
        'error' in errorData
      ) {
        const errorValue = errorData.error

        if (typeof errorValue === 'string') {
          message = errorValue
        } else if (
          typeof errorValue === 'object' &&
          errorValue !== null &&
          'message' in errorValue &&
          typeof errorValue.message === 'string'
        ) {
          message = errorValue.message
        }
      }
    } catch {
      // Keep the default HTTP error message.
    }

    throw new ApiError(response.status, message)
  }

  return response
}

// Helper for REST endpoints returning JSON.
export async function apiJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers)

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await apiFetch(
    path,
    { ...options, headers },
    token
  )

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
