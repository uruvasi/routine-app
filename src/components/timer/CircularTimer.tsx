interface Props {
  remaining: number
  total: number
  size?: number
  label?: string
  sublabel?: string
  color?: string
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CircularTimer({
  remaining,
  total,
  size = 240,
  label,
  sublabel,
  color = '#6366f1',
}: Props) {
  const stroke = 10
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? remaining / total : 0
  const dashoffset = circumference * (1 - progress)
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-gray-100 dark:text-gray-800"
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-semibold text-gray-800 dark:text-gray-100">
            {formatTime(remaining)}
          </span>
          {label && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
