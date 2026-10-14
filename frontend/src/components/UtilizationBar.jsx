import { formatPercent, utilizationTone } from '../lib/format.js'

export default function UtilizationBar({ utilization, size = 'md', showLabel = true }) {
  const { percent, static: staticCount, reserved, total } = utilization
  const tone = utilizationTone(percent)
  const staticPct = total ? (staticCount / total) * 100 : 0
  const reservedPct = total ? (reserved / total) * 100 : 0
  const height = size === 'lg' ? 'h-3' : 'h-2'

  return (
    <div>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-slate-500">Utilization</span>
          <span className={`font-semibold ${tone.text}`}>{formatPercent(percent)}</span>
        </div>
      )}
      <div
        className={`flex ${height} w-full overflow-hidden rounded-full bg-slate-100`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatPercent(percent)} utilized`}
      >
        <div className={`${tone.bar} transition-all`} style={{ width: `${staticPct}%` }} title={`Static: ${staticCount}`} />
        <div
          className={`${tone.bar} opacity-50 transition-all`}
          style={{ width: `${reservedPct}%` }}
          title={`Reserved: ${reserved}`}
        />
      </div>
    </div>
  )
}
