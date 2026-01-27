import { getToken } from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/admin/api'

type ApiOptions = RequestInit & { body?: any }

export async function apiRequest(path: string, options: ApiOptions = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed (${response.status})`
    throw new Error(message)
  }

  return data
}

export const apiGet = (path: string) => apiRequest(path)
export const apiPost = (path: string, body?: any) => apiRequest(path, { method: 'POST', body })
export const apiPut = (path: string, body?: any) => apiRequest(path, { method: 'PUT', body })
export const apiDelete = (path: string) => apiRequest(path, { method: 'DELETE' })
