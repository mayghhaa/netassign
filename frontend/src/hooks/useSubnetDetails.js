import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'

/**
 * Loads a subnet plus one page of its address table. Re-queries whenever the
 * filters change and silently polls so concurrent allocations show up live.
 */
export default function useSubnetDetails(subnetId, { status = 'all', q = '', page = 1, perPage = 128, refreshInterval = 15000 } = {}) {
  const [subnet, setSubnet] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const controllerRef = useRef(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      if (!silent) setLoading(true)
      try {
        const [subnetRes, ipRes] = await Promise.all([
          api.getSubnet(subnetId, { signal: controller.signal }),
          api.listIpAddresses(subnetId, { status, q, page, per_page: perPage }, { signal: controller.signal }),
        ])
        setSubnet(subnetRes.data)
        setAddresses(ipRes.data)
        setMeta(ipRes.meta)
        setError(null)
        setLastSyncedAt(new Date())
      } catch (err) {
        if (err.name !== 'AbortError') setError(err)
      } finally {
        if (controllerRef.current === controller) setLoading(false)
      }
    },
    [subnetId, status, q, page, perPage],
  )

  useEffect(() => {
    load()
    return () => controllerRef.current?.abort()
  }, [load])

  useEffect(() => {
    if (!refreshInterval) return undefined
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }, refreshInterval)
    return () => clearInterval(timer)
  }, [load, refreshInterval])

  const refetch = useCallback(() => load({ silent: true }), [load])

  return { subnet, addresses, meta, loading, error, lastSyncedAt, refetch }
}
