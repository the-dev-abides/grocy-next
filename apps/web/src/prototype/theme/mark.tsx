// PROTOTYPE. Throwaway. The app mark: a barcode in a rounded square.
import { cn } from 'cn';

export function Mark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('shrink-0', className)}>
      <rect width="64" height="64" rx="14" fill={inverted ? '#ffffff' : '#337ab7'} />
      <g fill={inverted ? '#337ab7' : '#ffffff'}>
        <rect x="12" y="18" width="5" height="28" rx="1.5" />
        <rect x="20" y="18" width="3" height="28" rx="1.5" />
        <rect x="26" y="18" width="7" height="28" rx="1.5" />
        <rect x="36" y="18" width="3" height="28" rx="1.5" />
        <rect x="42" y="18" width="5" height="28" rx="1.5" />
        <rect x="50" y="18" width="3" height="28" rx="1.5" />
      </g>
    </svg>
  );
}
