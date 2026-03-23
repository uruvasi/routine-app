interface Props {
  remaining: number
  total: number
  size?: number
  label?: string
  sublabel?: string
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CircularTimer({ remaining, total, size = 280, label, sublabel }: Props) {
  const stroke = 3
  const r = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? remaining / total : 0
  const dashoffset = circumference * (1 - progress)
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#e2e2e7"
            strokeWidth={stroke}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#5e5ce6"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-headline font-bold leading-none tracking-tight text-on-surface"
            style={{ fontSize: size >= 280 ? '3.5rem' : '2.5rem' }}
          >
            {formatTime(remaining)}
            <span style={{ color: 'rgba(94,92,230,0.35)', fontSize: '0.55em' }}>.00</span>
          </span>
          {label && (
            <span className="text-xs uppercase tracking-[0.2em] text-outline mt-2 text-center px-4 truncate max-w-full">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-outline mt-1">{sublabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}
