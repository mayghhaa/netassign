import { useCallback, useState } from 'react'
import { api } from '../api/client.js'

/**
 * Mutations for a subnet's addresses: allocate (specific or next available),
 * edit, and release. Tracks submission state and per-field server errors.
 */
export default function useAllocateIp(subnetId, { onSuccess } = {}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(
    async (fn) => {
      setSubmitting(true)
      setError(null)
      try {
        const result = await fn()
        await onSuccess?.(result)
        return result
      } catch (err) {
        setError(err)
        throw err
      } finally {
        setSubmitting(false)
      }
    },
    [onSuccess],
  )

  const allocate = useCallback(
    (attrs) => run(async () => (await api.allocateIp(subnetId, attrs)).data),
    [run, subnetId],
  )
  const update = useCallback((id, attrs) => run(async () => (await api.updateIp(id, attrs)).data), [run])
  const release = useCallback((id) => run(() => api.releaseIp(id)), [run])
  const fetchNextAvailable = useCallback(async () => (await api.nextAvailableIp(subnetId)).data.address, [subnetId])
  const reset = useCallback(() => setError(null), [])

  return {
    allocate,
    update,
    release,
    fetchNextAvailable,
    submitting,
    error,
    fieldErrors: error?.fieldErrors ?? {},
    reset,
  }
}
