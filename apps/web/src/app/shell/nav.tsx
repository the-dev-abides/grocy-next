import { cn } from 'cn';
import {
  ClipboardList,
  Inbox,
  type LucideIcon,
  Package,
  ScanBarcode,
} from 'lucide-react';
import { NavLink } from 'react-router';

interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

interface Group {
  items: readonly NavItem[];
  label?: string;
  name: string;
}

// The two scan items. The sidebar and the top bar show them.
export const scanItems: readonly NavItem[] = [
  { icon: ScanBarcode, label: 'Purchase', to: '/scan/purchase' },
  { icon: ClipboardList, label: 'Inventory', to: '/scan/inventory' },
];

// The sidebar groups, in the order of ADR 0013. The review queue group has
// no label. The badge with the count of pending scans comes with the pending
// scan list.
const groups: readonly Group[] = [
  { items: scanItems, label: 'Scan', name: 'scan' },
  {
    items: [{ icon: Inbox, label: 'Review queue', to: '/review-queue' }],
    name: 'review-queue',
  },
  {
    items: [{ icon: Package, label: 'Products', to: '/stock' }],
    label: 'Stock',
    name: 'stock',
  },
];

// On the icon rail the labels fade out. They fade in when the rail opens on
// hover or on keyboard focus, and they stay on a large screen.
const RAIL_LABEL = `
  md:opacity-0
  md:group-hover/side:opacity-100
  md:group-focus-within/side:opacity-100
  lg:opacity-100
`;

function NavGroup({
  group,
  isRail,
  onNavigate,
}: Readonly<{
  group: Group;
  isRail: boolean;
  onNavigate: (() => void) | undefined;
}>) {
  return (
    <div className="flex flex-col gap-0.5">
      {group.label === undefined ? null : (
        <p
          className={cn(
            `
              h-7 px-4 pt-3 text-xs font-medium whitespace-nowrap
              text-sidebar-foreground/60
            `,
            isRail && RAIL_LABEL,
          )}
        >
          {group.label}
        </p>
      )}
      {group.items.map((item) => {
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={isRail ? item.label : undefined}
            className={({ isActive }) => {
              return cn(
                `
                  relative mx-2 flex h-10 items-center gap-3 rounded-lg px-3
                  text-left whitespace-nowrap text-sidebar-foreground/75
                  outline-none
                  hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                  focus-visible:ring-2 focus-visible:ring-sidebar-ring
                `,
                isActive &&
                  `
                    bg-sidebar-accent font-medium text-sidebar-accent-foreground
                    shadow-[inset_4px_0_0_var(--sidebar-primary)]
                  `,
              );
            }}
          >
            <item.icon className="size-5 shrink-0" />
            <span className={cn('flex-1', isRail && RAIL_LABEL)}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}

// `isRail` is true inside the fixed sidebar, where the labels hide on `md`.
// `onNavigate` runs after a click on an item. The sheet closes with it.
export function Nav({
  isRail = false,
  onNavigate,
}: Readonly<{ isRail?: boolean; onNavigate?: () => void }>) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 py-2">
      {groups.map((group) => {
        return (
          <NavGroup
            key={group.name}
            group={group}
            isRail={isRail}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
