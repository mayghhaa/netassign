import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { Spinner } from './Feedback.jsx'

export default function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
