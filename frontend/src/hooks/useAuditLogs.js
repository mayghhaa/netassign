import { useEffect, useState } from 'react'
import { api } from '../api/client.js'

export default function useAuditLogs(filters) {
  const [state, setState] = useState({ logs: [], meta: null, loading: true, error: null })
  const key = JSON.stringify(filters)

  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true }))
    api
      .listAuditLogs(JSON.parse(key), { signal: controller.signal })
      .then(({ data, meta }) => setState({ logs: data, meta, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error }))
      })
    return () => controller.abort()
  }, [key])

  return state
}
