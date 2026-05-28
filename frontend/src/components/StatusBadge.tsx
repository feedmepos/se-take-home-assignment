import { humanizeStatus, type AnyStatus } from './humanizeStatus';

function badgeClass(status: AnyStatus): string {
  switch (status) {
    case 'PENDING':
      return 'badge badge-info badge-sm';
    case 'PROCESSING':
      return 'badge badge-warning badge-sm';
    case 'COMPLETE':
      return 'badge badge-success badge-sm';
    case 'IDLE':
      return 'badge badge-neutral badge-sm';
  }
}

interface StatusBadgeProps {
  status: AnyStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  return <span className={badgeClass(status)}>{humanizeStatus(status)}</span>;
}
