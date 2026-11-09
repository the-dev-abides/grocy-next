// PROTOTYPE. Throwaway. Variant B: scan first.
// White chrome. On a phone: no top bar, a bottom tab bar with Purchase,
// Inventory, Review queue, and Menu. On a large screen: an icon rail on the
// left that opens to 220px on hover or focus. Geist at 14px. The blue is only
// on the active item and the primary button.
import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { allItems, otherItems, pageTitle, queueItem, scanItems, stockItems, type NavItem, type Page } from './data';
import { PageContent } from './pages';
import { Mark } from './mark';

export const name = 'Scan first';

function RailItem({ item, page, go }: { item: NavItem; page: Page; go: (p: Page) => void }) {
  const active = item.page === page;
  return (
    <button
      type="button"
      onClick={() => go(item.page)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative mx-2 flex h-11 items-center gap-3 rounded-lg px-2.5 text-left whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
      )}
    >
      <item.icon className="size-5 shrink-0" />
      <span className="opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
        {item.label}
      </span>
      {item.badge && (
        <span className="bg-sidebar-primary text-sidebar-primary-foreground absolute top-1.5 left-6 rounded-full px-1.5 text-[10px] font-medium tabular-nums group-hover/rail:static group-hover/rail:ml-auto group-hover/rail:px-2 group-hover/rail:text-xs">
          {item.badge}
        </span>
      )}
    </button>
  );
}

export function VariantB() {
  const [page, setPage] = useState<Page>('queue');
  const [open, setOpen] = useState(false);
  const go = (p: Page) => { setPage(p); setOpen(false); };
  const tabs: NavItem[] = [...scanItems, queueItem];
  const inTabs = tabs.some((t) => t.page === page);

  return (
    <div className="proto-font-geist bg-background text-foreground min-h-svh text-sm">
      {/* Large screen: the rail. */}
      <aside className="group/rail bg-sidebar border-sidebar-border text-sidebar-foreground fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r py-3 transition-[width] duration-150 hover:w-56 focus-within:w-56 lg:flex">
        <div className="mb-3 flex h-10 items-center gap-3 px-4.5">
          <Mark className="size-7 shrink-0" />
          <span className="text-base font-medium whitespace-nowrap opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">Grocy Next</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5">
          {scanItems.map((i) => <RailItem key={i.page} item={i} page={page} go={go} />)}
          <RailItem item={queueItem} page={page} go={go} />
          <div className="bg-sidebar-border mx-4 my-2 h-px" />
          {stockItems.map((i) => <RailItem key={i.page} item={i} page={page} go={go} />)}
          <div className="flex-1" />
          {otherItems.map((i) => <RailItem key={i.page} item={i} page={page} go={go} />)}
        </nav>
      </aside>

      <main className="pb-20 lg:pb-6 lg:pl-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:p-8">
          <header className="flex items-center gap-2">
            <Mark className="size-7 lg:hidden" />
            <h1 className="text-2xl font-medium tracking-tight">{pageTitle[page]}</h1>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Search"><Search /></Button>
            </div>
          </header>
          <PageContent page={page} variant="b" />
        </div>
      </main>

      {/* Phone: the tab bar. */}
      <nav aria-label="Main" className="bg-sidebar border-sidebar-border fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] lg:hidden">
        {tabs.map((item) => {
          const active = item.page === page;
          return (
            <button
              key={item.page}
              type="button"
              onClick={() => go(item.page)}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex h-16 flex-col items-center justify-center gap-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring', active ? 'text-sidebar-primary font-medium' : 'text-sidebar-foreground/70')}
            >
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-sidebar-accent')}>
                <item.icon className="size-5" />
              </span>
              {item.label}
              {item.badge && (
                <span className="bg-sidebar-primary text-sidebar-primary-foreground absolute top-2 right-[calc(50%-1.75rem)] rounded-full px-1.5 text-[10px] font-medium tabular-nums">{item.badge}</span>
              )}
            </button>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<button type="button" className={cn('flex h-16 flex-col items-center justify-center gap-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring', !inTabs ? 'text-sidebar-primary font-medium' : 'text-sidebar-foreground/70')} />}
          >
            <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', !inTabs && 'bg-sidebar-accent')}><Menu className="size-5" /></span>
            Menu
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
            <nav aria-label="More" className="grid grid-cols-3 gap-2 px-4 pb-4">
              {allItems.filter((i) => !tabs.includes(i)).map((item) => (
                <button key={item.page} type="button" onClick={() => go(item.page)} className={cn('flex flex-col items-center gap-2 rounded-xl border p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring', item.page === page && 'bg-accent text-accent-foreground border-transparent')}>
                  <item.icon className="size-5" />{item.label}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
