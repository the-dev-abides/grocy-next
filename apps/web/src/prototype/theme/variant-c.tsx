// PROTOTYPE. Throwaway. Variant C: blue bar.
// The Grocy blue is the top bar. No sidebar. On a large screen the
// navigation is a row of links in the bar, and the two scan buttons sit on
// the right of the bar. On a phone the menu is a sheet, and one round scan
// button at the bottom right opens Purchase and Inventory. Roboto at 15px.
import { useState } from 'react';
import { ChevronDown, Menu, Search, ScanBarcode } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { otherItems, pageTitle, queueItem, scanItems, stockItems, type NavItem, type Page } from './data';
import { PageContent } from './pages';
import { Mark } from './mark';

export const name = 'Blue bar';

function BarLink({ item, page, go }: { item: NavItem; page: Page; go: (p: Page) => void }) {
  const active = item.page === page;
  return (
    <button
      type="button"
      onClick={() => go(item.page)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-14 items-center gap-1.5 border-b-3 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring',
        active ? 'border-sidebar-primary text-sidebar-foreground font-medium' : 'border-transparent text-sidebar-foreground/80 hover:text-sidebar-foreground',
      )}
    >
      {item.label}
      {item.badge && (
        <span className="bg-sidebar-primary text-sidebar-primary-foreground rounded-full px-1.5 text-xs font-medium tabular-nums">{item.badge}</span>
      )}
    </button>
  );
}

export function VariantC() {
  const [page, setPage] = useState<Page>('queue');
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const go = (p: Page) => { setPage(p); setOpen(false); setScanOpen(false); };
  const menuItems = [queueItem, ...stockItems, ...otherItems];

  return (
    <div className="proto-font-roboto bg-background text-foreground min-h-svh text-[15px]">
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-30 shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-2 lg:px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden" aria-label="Open the menu" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="flex h-14 items-center gap-2 px-4"><Mark className="size-6" /> Grocy Next</SheetTitle>
              <nav aria-label="Main" className="flex flex-col py-2">
                {[...scanItems, ...menuItems].map((item) => (
                  <button key={item.page} type="button" onClick={() => go(item.page)} aria-current={item.page === page ? 'page' : undefined}
                    className={cn('flex h-11 items-center gap-3 px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', item.page === page ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent')}>
                    <item.icon className="size-5" /> <span className="flex-1">{item.label}</span>
                    {item.badge && <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">{item.badge}</span>}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <span className="mr-4 flex items-center gap-2 text-base font-medium"><Mark className="size-7" inverted /> Grocy Next</span>
          <nav aria-label="Main" className="hidden h-14 items-center lg:flex">
            {menuItems.map((i) => <BarLink key={i.page} item={i} page={page} go={go} />)}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Search"><Search /></Button>
            {scanItems.map((item) => (
              <Button key={item.page} size="sm" onClick={() => go(item.page)}
                className={cn('hidden lg:inline-flex', item.page === page ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90' : 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80')}>
                <item.icon data-icon="inline-start" /> {item.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 pb-24 lg:p-6">
        <h1 className="text-2xl font-medium">{pageTitle[page]}</h1>
        <PageContent page={page} variant="c" />
      </main>

      {/* Phone: the scan button. */}
      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex flex-col items-end gap-2 lg:hidden">
        {scanOpen && scanItems.map((item) => (
          <Button key={item.page} variant="outline" className="bg-background h-10 rounded-full px-4 shadow-md" onClick={() => go(item.page)}>
            <item.icon data-icon="inline-start" /> {item.label}
          </Button>
        ))}
        <Button size="icon-lg" className="size-14 rounded-full shadow-lg [&_svg]:size-6" aria-expanded={scanOpen} aria-label="Scan" onClick={() => setScanOpen((v) => !v)}>
          {scanOpen ? <ChevronDown /> : <ScanBarcode />}
        </Button>
      </div>
    </div>
  );
}
