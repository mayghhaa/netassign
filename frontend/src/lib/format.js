export const ENVIRONMENTS = ['production', 'staging', 'development', 'qa', 'lab', 'dmz']
export const STATUSES = ['available', 'reserved', 'static']

const numberFormat = new Intl.NumberFormat('en-US')

export function formatCount(value) {
  if (value === null || value === undefined) return '—'
  if (value >= 1e15) return value.toExponential(2)
  return numberFormat.format(value)
}

export function formatPercent(value) {
  if (!value) return '0%'
  if (value < 0.01) return '<0.01%'
  return `${value.toFixed(value < 10 ? 1 : 0)}%`
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`
}

export function utilizationTone(percent) {
  if (percent >= 90) return { bar: 'bg-rose-500', text: 'text-rose-600' }
  if (percent >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
}

export const ENVIRONMENT_STYLES = {
  production: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  staging: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  development: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  qa: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  lab: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  dmz: 'bg-orange-50 text-orange-700 ring-orange-600/20',
}

export const MAC_PATTERN = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$|^[0-9a-f]{12}$|^([0-9a-f]{4}\.){2}[0-9a-f]{4}$/i
