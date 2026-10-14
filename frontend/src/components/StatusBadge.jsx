const STYLES = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  reserved: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  static: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
