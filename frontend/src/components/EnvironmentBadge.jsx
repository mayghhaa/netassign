import { ENVIRONMENT_STYLES } from '../lib/format.js'

export default function EnvironmentBadge({ environment }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset ${ENVIRONMENT_STYLES[environment] ?? 'bg-slate-50 text-slate-600 ring-slate-500/20'}`}>
      {environment}
    </span>
  )
}
