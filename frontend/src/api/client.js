const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
export const UNAUTHORIZED_EVENT = 'netassign:unauthorized'

export class ApiError extends Error {
  constructor(message, { status, fieldErrors } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors ?? {}
  }
}

function buildUrl(path, params) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  })
  return url.toString()
}

export async function request(path, { method = 'GET', params, body, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Unable to reach the NetAssign API. Is the Rails server running?', { status: 0 })
  }

  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(payload?.error ?? `Request failed (${response.status})`, {
      status: response.status,
      fieldErrors: payload?.errors,
    })
  }
  return payload
}

export const api = {
  getSession: (opts) => request('/session', opts),
  login: (email_address, password) => request('/session', { method: 'POST', body: { email_address, password } }),
  logout: () => request('/session', { method: 'DELETE' }),
  listSubnets: (params, opts) => request('/subnets', { params, ...opts }),
  getSubnet: (id, opts) => request(`/subnets/${id}`, opts),
  createSubnet: (subnet) => request('/subnets', { method: 'POST', body: { subnet } }),
  updateSubnet: (id, subnet) => request(`/subnets/${id}`, { method: 'PATCH', body: { subnet } }),
  deleteSubnet: (id) => request(`/subnets/${id}`, { method: 'DELETE' }),
  listIpAddresses: (subnetId, params, opts) => request(`/subnets/${subnetId}/ip_addresses`, { params, ...opts }),
  nextAvailableIp: (subnetId) => request(`/subnets/${subnetId}/ip_addresses/next_available`),
  allocateIp: (subnetId, ip_address) =>
    request(`/subnets/${subnetId}/ip_addresses`, { method: 'POST', body: { ip_address } }),
  updateIp: (id, ip_address) => request(`/ip_addresses/${id}`, { method: 'PATCH', body: { ip_address } }),
  releaseIp: (id) => request(`/ip_addresses/${id}`, { method: 'DELETE' }),
  listAuditLogs: (params, opts) => request('/audit_logs', { params, ...opts }),
}
