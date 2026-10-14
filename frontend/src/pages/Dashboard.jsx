import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EnvironmentBadge from '../components/EnvironmentBadge.jsx'
import { EmptyState, ErrorBanner, Spinner } from '../components/Feedback.jsx'
import SubnetFormModal from '../components/SubnetFormModal.jsx'
import UtilizationBar from '../components/UtilizationBar.jsx'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import useSubnets from '../hooks/useSubnets.js'
import { ENVIRONMENTS, formatCount, formatPercent } from '../lib/format.js'

function StatCard({ label, value, hint }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function SubnetCard({ subnet }) {
  const { utilization: u } = subnet
  return (
    <Link
      to={`/subnets/${subnet.id}`}
      className="card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">{subnet.name}</h3>
          <p className="font-mono text-sm text-slate-600">{subnet.cidr}</p>
        </div>
        <EnvironmentBadge environment={subnet.environment} />
      </div>
      <UtilizationBar utilization={u} />
      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-50 py-2">
          <dt className="text-slate-500">Used</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">{formatCount(u.used)}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 py-2">
          <dt className="text-slate-500">Available</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">{formatCount(u.available)}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 py-2">
          <dt className="text-slate-500">VLAN</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">{subnet.vlan_id ?? '—'}</dd>
        </div>
      </dl>
    </Link>
  )
}

export default function Dashboard() {
  const [search, setSearch] = useState('')
  const [environment, setEnvironment] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const q = useDebouncedValue(search)
  const { subnets, loading, error, refetch, createSubnet } = useSubnets({ environment, q })

  const totals = useMemo(() => {
    const v4 = subnets.filter((s) => s.ip_version === 4)
    const used = subnets.reduce((sum, s) => sum + s.utilization.used, 0)
    const total = v4.reduce((sum, s) => sum + s.utilization.total, 0)
    const v4Used = v4.reduce((sum, s) => sum + s.utilization.used, 0)
    const hot = subnets.filter((s) => s.utilization.percent >= 80).length
    return { used, total, percent: total ? (v4Used / total) * 100 : 0, hot }
  }, [subnets])

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subnet Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Address space utilization across every environment.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
          <span className="text-lg leading-none">+</span> New subnet
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Subnets" value={formatCount(subnets.length)} hint={environment ? `in ${environment}` : 'all environments'} />
        <StatCard label="Allocated IPs" value={formatCount(totals.used)} hint="static + reserved" />
        <StatCard label="IPv4 utilization" value={formatPercent(totals.percent)} hint={`${formatCount(totals.total)} usable IPv4 hosts`} />
        <StatCard label="Subnets ≥ 80% full" value={formatCount(totals.hot)} hint="capacity planning watchlist" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          className="input sm:max-w-xs"
          placeholder="Search name, CIDR, VLAN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search subnets"
        />
        <select className="input capitalize sm:w-48" value={environment} onChange={(e) => setEnvironment(e.target.value)} aria-label="Filter by environment">
          <option value="">All environments</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
        {loading && <Spinner className="h-5 w-5 self-center" />}
      </div>

      <ErrorBanner error={error} onRetry={refetch} />

      {!loading && !error && subnets.length === 0 ? (
        <EmptyState
          title={q || environment ? 'No subnets match your filters' : 'No subnets yet'}
          action={<button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>Create a subnet</button>}
        >
          Define a CIDR block to start tracking IP allocations.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subnets.map((subnet) => (
            <SubnetCard key={subnet.id} subnet={subnet} />
          ))}
        </div>
      )}

      <SubnetFormModal open={showCreate} onClose={() => setShowCreate(false)} onSubmit={createSubnet} />
    </div>
  )
}
