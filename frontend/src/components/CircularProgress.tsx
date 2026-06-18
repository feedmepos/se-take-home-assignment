interface CircularProgressProps {
  progress: number; // 0 to 1
  countdown: number; // seconds remaining to display in center
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({
  progress,
  countdown,
  size = 52,
  strokeWidth = 4,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const isActive = progress > 0;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isActive ? "#FFECD9" : "#E8E3DC"}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        {isActive && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#DA291C"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        )}
      </svg>
      <span
        className="absolute flex items-baseline gap-px leading-none"
        style={{ color: isActive ? "#DA291C" : "#B0A898" }}
      >
        <span className="font-black" style={{ fontSize: size * 0.22 }}>
          {isActive ? (countdown > 0 ? `${countdown}` : "✓") : "—"}
        </span>
        {isActive && countdown > 0 && (
          <span className="font-semibold" style={{ fontSize: size * 0.18 }}>
            s
          </span>
        )}
      </span>
    </div>
  );
}
