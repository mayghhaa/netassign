import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBanner, Spinner } from '../components/Feedback.jsx'
import Pagination from '../components/Pagination.jsx'
import useAuditLogs from '../hooks/useAuditLogs.js'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import { formatDateTime } from '../lib/format.js'

const EVENT_STYLES = {
  create: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  update: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  destroy: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}
const EVENT_LABELS = { create: 'Created', update: 'Updated', destroy: 'Deleted' }
const TYPE_LABELS = { Subnet: 'Subnet', IpAddress: 'IP address' }

function formatValue(value) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400 italic">empty</span>
  return <span className="font-mono">{String(value)}</span>
}

function ChangeList({ changes, event }) {
  const entries = Object.entries(changes).filter(([field]) => field !== 'id')
  if (entries.length === 0) return <span className="text-slate-400">—</span>
  return (
    <ul className="space-y-0.5 text-xs">
      {entries.map(([field, [before, after]]) => (
        <li key={field} className="text-slate-600">
          <span className="font-medium text-slate-700">{field}</span>:{' '}
          {event === 'create' ? (
            formatValue(after)
          ) : (
            <>
              <span className="text-rose-600 line-through decoration-rose-300">{formatValue(before)}</span>
              {' → '}
              <span className="text-emerald-700">{formatValue(after)}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function AuditLogs() {
  const [params, setParams] = useSearchParams()
  const filters = {
    item_type: params.get('item_type') ?? '',
    event: params.get('event') ?? '',
    actor: params.get('actor') ?? '',
    subnet_id: params.get('subnet_id') ?? '',
    page: params.get('page') ?? '1',
  }
  const actor = useDebouncedValue(filters.actor)
  const { logs, meta, loading, error } = useAuditLogs({ ...filters, actor, per_page: 50 })

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: key === 'actor' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Every creation, update and deletion of subnets and IP allocations.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-44" value={filters.item_type} onChange={(e) => update('item_type', e.target.value)} aria-label="Record type">
          <option value="">All records</option>
          <option value="Subnet">Subnets</option>
          <option value="IpAddress">IP addresses</option>
        </select>
        <select className="input w-40" value={filters.event} onChange={(e) => update('event', e.target.value)} aria-label="Event">
          <option value="">All events</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="destroy">Deleted</option>
        </select>
        <input className="input w-48" type="search" placeholder="Filter by actor" value={filters.actor} onChange={(e) => update('actor', e.target.value)} aria-label="Actor" />
        {filters.subnet_id && (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
            Subnet #{filters.subnet_id}
            <button type="button" onClick={() => update('subnet_id', '')} className="text-indigo-400 hover:text-indigo-700" aria-label="Clear subnet filter">
              ×
            </button>
          </span>
        )}
        {loading && <Spinner />}
      </div>

      <ErrorBanner error={error} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Record</th>
                <th className="px-4 py-3">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{log.whodunnit ?? <span className="text-slate-400">system</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${EVENT_STYLES[log.event]}`}>
                      {EVENT_LABELS[log.event] ?? log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-slate-500">{TYPE_LABELS[log.item_type] ?? log.item_type}</div>
                    {log.subnet_id ? (
                      <Link to={`/subnets/${log.subnet_id}`} className="font-mono text-indigo-600 hover:underline">
                        {log.label ?? `#${log.item_id}`}
                      </Link>
                    ) : (
                      <span className="font-mono">{log.label ?? `#${log.item_id}`}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChangeList changes={log.changes} event={log.event} />
                  </td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No audit entries match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={(p) => update('page', String(p))} noun="entries" />
      </div>
    </div>
  )
}
