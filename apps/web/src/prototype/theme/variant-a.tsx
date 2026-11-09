// PROTOTYPE. Throwaway. Variant A: Grocy, kept.
// A grey top bar, a grey 250px sidebar with a blue active bar on the left,
// a white page. On a phone the sidebar opens from the left as a sheet.
// Roboto at 14px. The scan buttons are the first group of the sidebar.
import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { otherItems, pageTitle, queueItem, scanItems, stockItems, type NavItem, type Page } from './data';
import { PageContent } from './pages';
import { Mark } from './mark';

export const name = 'Grocy, kept';

function Group({ label, items, page, go }: { label?: string; items: NavItem[]; page: Page; go: (p: Page) => void }) {
  return (
    <div className="flex flex-col">
      {label && (
        <p className="text-sidebar-foreground/60 px-4 pt-3 pb-1 text-xs font-medium">{label}</p>
      )}
      {items.map((item) => {
        const active = item.page === page;
        return (
          <button
            key={item.page}
            type="button"
            onClick={() => go(item.page)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center gap-3 px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring',
              'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_4px_0_0_var(--sidebar-primary)]',
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-sidebar-primary text-sidebar-primary-foreground rounded-full px-1.5 py-px text-xs font-medium tabular-nums">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Nav({ page, go }: { page: Page; go: (p: Page) => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col py-2">
      <Group label="Scan" items={scanItems} page={page} go={go} />
      <Group items={[queueItem]} page={page} go={go} />
      <Group label="Stock" items={stockItems} page={page} go={go} />
      <Group label="More" items={otherItems} page={page} go={go} />
    </nav>
  );
}

export function VariantA() {
  const [page, setPage] = useState<Page>('queue');
  const [open, setOpen] = useState(false);
  const go = (p: Page) => { setPage(p); setOpen(false); };

  return (
    <div className="proto-font-roboto bg-background text-foreground min-h-svh text-sm">
      <header className="bg-sidebar border-sidebar-border fixed inset-x-0 top-0 z-30 flex h-13 items-center gap-2 border-b-2 px-2 lg:pl-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open the menu" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-72 p-0">
            <SheetTitle className="flex h-13 items-center gap-2 px-4">
              <Mark className="size-6" /> Grocy Next
            </SheetTitle>
            <Nav page={page} go={go} />
          </SheetContent>
        </Sheet>
        <span className="flex w-auto items-center gap-2 text-base font-medium lg:w-[234px]">
          <Mark className="size-6" /> Grocy Next
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search"><Search /></Button>
          {scanItems.map((item) => (
            <Button key={item.page} variant={item.page === page ? 'default' : 'outline'} size="sm" className="hidden sm:inline-flex" onClick={() => go(item.page)}>
              <item.icon data-icon="inline-start" /> {item.label}
            </Button>
          ))}
        </div>
      </header>

      <aside className="bg-sidebar border-sidebar-border text-sidebar-foreground fixed top-13 bottom-0 left-0 z-20 hidden w-[250px] overflow-y-auto border-r-2 lg:block">
        <Nav page={page} go={go} />
      </aside>

      <main className="pt-13 lg:pl-[250px]">
        <div className="flex flex-col gap-4 p-4 lg:p-6">
          <h1 className="text-2xl font-medium">{pageTitle[page]}</h1>
          <PageContent page={page} variant="a" />
        </div>
      </main>
    </div>
  );
}
