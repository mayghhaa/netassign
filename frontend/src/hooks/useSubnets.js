import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'

/**
 * Loads the subnet inventory (with utilization) and exposes CRUD mutations
 * that keep the local list in sync with the API.
 */
export default function useSubnets({ environment, q } = {}) {
  const [subnets, setSubnets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  const fetchSubnets = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    try {
      const { data } = await api.listSubnets({ environment, q }, { signal: controller.signal })
      setSubnets(data)
      setError(null)
    } catch (err) {
      if (err.name !== 'AbortError') setError(err)
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }, [environment, q])

  useEffect(() => {
    fetchSubnets()
    return () => controllerRef.current?.abort()
  }, [fetchSubnets])

  const createSubnet = useCallback(
    async (attrs) => {
      const { data } = await api.createSubnet(attrs)
      await fetchSubnets()
      return data
    },
    [fetchSubnets],
  )

  const updateSubnet = useCallback(async (id, attrs) => {
    const { data } = await api.updateSubnet(id, attrs)
    setSubnets((current) => current.map((s) => (s.id === id ? { ...s, ...data } : s)))
    return data
  }, [])

  const deleteSubnet = useCallback(async (id) => {
    await api.deleteSubnet(id)
    setSubnets((current) => current.filter((s) => s.id !== id))
  }, [])

  return { subnets, loading, error, refetch: fetchSubnets, createSubnet, updateSubnet, deleteSubnet }
}
