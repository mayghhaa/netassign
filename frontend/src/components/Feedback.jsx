export function ErrorBanner({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <span>{error.message ?? String(error)}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline hover:no-underline">
          Retry
        </button>
      )}
    </div>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin text-indigo-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function FieldError({ messages }) {
  if (!messages?.length) return null
  return <p className="mt-1 text-xs text-rose-600">{messages.join(', ')}</p>
}
