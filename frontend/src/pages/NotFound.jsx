import { Link } from 'react-router-dom'
import { EmptyState } from '../components/Feedback.jsx'

export default function NotFound() {
  return (
    <EmptyState title="Page not found" action={<Link to="/" className="btn-primary">Back to dashboard</Link>}>
      The page you are looking for does not exist.
    </EmptyState>
  )
}
