import { useCallback, useSyncExternalStore } from 'react'
import { ACTOR_KEY } from '../api/client.js'

const EVENT = 'netassign:actor'

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

const getSnapshot = () => window.localStorage.getItem(ACTOR_KEY) ?? ''

/** Name of the engineer making changes; sent as X-Actor and recorded in the audit log. */
export default function useActor() {
  const actor = useSyncExternalStore(subscribe, getSnapshot)
  const setActor = useCallback((value) => {
    const trimmed = value.trim()
    if (trimmed) window.localStorage.setItem(ACTOR_KEY, trimmed)
    else window.localStorage.removeItem(ACTOR_KEY)
    window.dispatchEvent(new Event(EVENT))
  }, [])
  return [actor, setActor]
}
