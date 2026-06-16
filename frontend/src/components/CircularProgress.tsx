interface CircularProgressProps {
  progress: number   // 0 to 1
  countdown: number  // seconds remaining to display in center
  size?: number
  strokeWidth?: number
}

export function CircularProgress({ progress, countdown, size = 48, strokeWidth = 4 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-orange-500 transition-[stroke-dashoffset] duration-100"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-orange-500 leading-none">
        {countdown > 0 ? `${countdown}s` : '✓'}
      </span>
    </div>
  )
}
