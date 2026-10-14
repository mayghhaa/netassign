import { formatCount } from '../lib/format.js'

export default function Pagination({ meta, onPageChange, noun = 'results' }) {
  if (!meta) return null
  const { page, per_page: perPage, total, total_pages: totalPages } = meta
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row">
      <span>
        Showing <strong className="font-medium text-slate-900">{formatCount(from)}</strong>–
        <strong className="font-medium text-slate-900">{formatCount(to)}</strong> of{' '}
        <strong className="font-medium text-slate-900">{formatCount(total)}</strong> {noun}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <span className="tabular-nums">
          Page {formatCount(page)} / {formatCount(totalPages)}
        </span>
        <button type="button" className="btn-secondary px-3 py-1.5" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
