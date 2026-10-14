import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AllocationModal from '../components/AllocationModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EnvironmentBadge from '../components/EnvironmentBadge.jsx'
import { ErrorBanner, Spinner } from '../components/Feedback.jsx'
import Pagination from '../components/Pagination.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import SubnetFormModal from '../components/SubnetFormModal.jsx'
import UtilizationBar from '../components/UtilizationBar.jsx'
import { api } from '../api/client.js'
import useAllocateIp from '../hooks/useAllocateIp.js'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import useSubnetDetails from '../hooks/useSubnetDetails.js'
import { formatCount, formatDateTime, timeAgo } from '../lib/format.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'static', label: 'Static' },
]

function InfoItem({ label, value, mono = true }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</dd>
    </div>
  )
}

function SyncIndicator({ lastSyncedAt, onRefresh }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 5000)
    return () => clearInterval(timer)
  }, [])
  return (
    <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700" title="Auto-refreshes every 15s · click to refresh now">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live · synced {timeAgo(lastSyncedAt)}
    </button>
  )
}

export default function SubnetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(search)
  const { subnet, addresses, meta, loading, error, lastSyncedAt, refetch } = useSubnetDetails(id, { status, q, page })

  const [allocating, setAllocating] = useState(null) // row being allocated/edited, or {} for a new allocation
  const [releasing, setReleasing] = useState(null)
  const [editingSubnet, setEditingSubnet] = useState(false)
  const [deletingSubnet, setDeletingSubnet] = useState(false)
  const { release } = useAllocateIp(id, { onSuccess: refetch })

  const closeAllocation = useCallback(() => setAllocating(null), [])

  if (!subnet && loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!subnet) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm text-indigo-600 hover:underline">
          ← Back to dashboard
        </Link>
        <ErrorBanner error={error} onRetry={refetch} />
      </div>
    )
  }

  const counts = meta?.counts ?? {}
  const n = subnet.network

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link to="/" className="hover:text-indigo-600">
          Dashboard
        </Link>{' '}
        / <span className="text-slate-700">{subnet.name}</span>
      </nav>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{subnet.name}</h1>
            <EnvironmentBadge environment={subnet.environment} />
          </div>
          <p className="mt-1 font-mono text-slate-600">
            {subnet.cidr}
            {subnet.vlan_id && <span className="ml-3 font-sans text-sm text-slate-500">VLAN {subnet.vlan_id}</span>}
          </p>
          {subnet.description && <p className="mt-2 max-w-2xl text-sm text-slate-500">{subnet.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/audit?subnet_id=${subnet.id}`} className="btn-secondary">
            History
          </Link>
          <button type="button" className="btn-secondary" onClick={() => setEditingSubnet(true)}>
            Edit subnet
          </button>
          <button type="button" className="btn-secondary text-rose-600" onClick={() => setDeletingSubnet(true)}>
            Delete
          </button>
          <button type="button" className="btn-primary" onClick={() => setAllocating({})} disabled={subnet.utilization.available === 0}>
            Allocate IP
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoItem label="Network" value={`${n.network_address}/${n.prefix_length}`} />
            <InfoItem label="Netmask" value={n.netmask} />
            <InfoItem label="Broadcast" value={n.broadcast_address ?? 'n/a (IPv6)'} />
            <InfoItem label="First usable" value={n.first_usable} />
            <InfoItem label="Last usable" value={n.last_usable} />
            <InfoItem label="Total addresses" value={formatCount(n.total_addresses)} mono={false} />
          </dl>
        </div>
        <div className="card flex flex-col justify-center gap-3 p-5">
          <UtilizationBar utilization={subnet.utilization} size="lg" />
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{formatCount(subnet.utilization.used)}</strong> of{' '}
            <strong className="text-slate-900">{formatCount(subnet.utilization.total)}</strong> usable addresses allocated
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={status === f.key}
                onClick={() => {
                  setStatus(f.key)
                  setPage(1)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  status === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
                <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 text-xs tabular-nums text-slate-600">{formatCount(counts[f.key])}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {lastSyncedAt && <SyncIndicator lastSyncedAt={lastSyncedAt} onRefresh={refetch} />}
            <input
              type="search"
              className="input md:w-64"
              placeholder="Search IP, hostname, MAC…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              aria-label="Search addresses"
            />
          </div>
        </div>

        {error && (
          <div className="p-4">
            <ErrorBanner error={error} onRetry={refetch} />
          </div>
        )}

        <div className="relative overflow-x-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-16">
              <Spinner className="h-6 w-6" />
            </div>
          )}
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">IP address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Hostname</th>
                <th className="px-4 py-3">MAC address</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {addresses.map((ip) => (
                <tr key={ip.address} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap text-slate-900">{ip.address}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={ip.status} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{ip.hostname ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{ip.mac_address ?? <span className="text-slate-300">—</span>}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-500" title={ip.notes ?? ''}>
                    {ip.notes ?? ''}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{ip.updated_at ? formatDateTime(ip.updated_at) : ''}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {ip.status === 'available' ? (
                      <button type="button" className="btn-ghost text-indigo-600" onClick={() => setAllocating(ip)}>
                        Allocate
                      </button>
                    ) : (
                      <>
                        <button type="button" className="btn-ghost" onClick={() => setAllocating(ip)}>
                          Edit
                        </button>
                        <button type="button" className="btn-ghost text-rose-600" onClick={() => setReleasing(ip)}>
                          Release
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && addresses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No addresses match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} noun="addresses" />
      </div>

      <AllocationModal open={allocating !== null} subnet={subnet} record={allocating} onClose={closeAllocation} onSaved={refetch} />
      <ConfirmDialog
        open={releasing !== null}
        title={`Release ${releasing?.address ?? ''}?`}
        message={
          <>
            The address{releasing?.hostname ? ` assigned to ${releasing.hostname}` : ''} will return to the available pool. The change is
            recorded in the audit log.
          </>
        }
        confirmLabel="Release IP"
        onConfirm={() => release(releasing.id)}
        onClose={() => setReleasing(null)}
      />
      <SubnetFormModal
        open={editingSubnet}
        subnet={subnet}
        onClose={() => setEditingSubnet(false)}
        onSubmit={async (attrs) => {
          await api.updateSubnet(subnet.id, attrs)
          await refetch()
        }}
      />
      <ConfirmDialog
        open={deletingSubnet}
        title={`Delete ${subnet.name}?`}
        message={`This permanently removes ${subnet.cidr} and its ${formatCount(subnet.utilization.used)} allocation(s). Audit history is retained.`}
        confirmLabel="Delete subnet"
        onConfirm={async () => {
          await api.deleteSubnet(subnet.id)
          navigate('/')
        }}
        onClose={() => setDeletingSubnet(false)}
      />
    </div>
  )
}
