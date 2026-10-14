import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, UNAUTHORIZED_EVENT } from '../api/client.js'
import { AuthContext } from './AuthContext.js'

/** Tracks the signed-in user (status: loading | authenticated | anonymous) from the API's session cookie. */
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    let active = true
    api
      .getSession()
      .then((res) => active && setState({ status: 'authenticated', user: res.data }))
      .catch(() => active && setState({ status: 'anonymous', user: null }))

    const onUnauthorized = () => setState({ status: 'anonymous', user: null })
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => {
      active = false
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password)
    setState({ status: 'authenticated', user: res.data })
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setState({ status: 'anonymous', user: null })
  }, [])

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
