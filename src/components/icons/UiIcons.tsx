type IconProps = {
  className?: string
}

export const QueueIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="5" width="16" height="3" rx="1.5" className="fill-current" />
    <rect x="4" y="10.5" width="12" height="3" rx="1.5" className="fill-current" />
    <rect x="4" y="16" width="8" height="3" rx="1.5" className="fill-current" />
  </svg>
)

export const CustomerIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4" className="fill-current" />
    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const VipIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 3.5 14.5 9l6 .6-4.5 4 1.3 5.9L12 16.8 6.7 19.5 8 13.6l-4.5-4 6-.6L12 3.5Z" className="fill-current" />
  </svg>
)

export const ManagerIcon = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="3" className="fill-current" />
    <rect x="7" y="2" width="10" height="4" rx="2" className="fill-current opacity-70" />
    <circle cx="12" cy="12" r="2.5" className="fill-white" />
  </svg>
)

export const BotIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="7" width="14" height="10" rx="3" className="fill-current" />
    <circle cx="10" cy="12" r="1.2" className="fill-white" />
    <circle cx="14" cy="12" r="1.2" className="fill-white" />
    <rect x="11" y="3" width="2" height="3" rx="1" className="fill-current" />
  </svg>
)

export const CompletedIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" className="fill-current" />
    <path d="m8.5 12.2 2.2 2.2 4.8-4.8" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ProcessingIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="8" className="stroke-current" strokeWidth="2" />
    <path d="M12 12V8" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 12 15 14" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
