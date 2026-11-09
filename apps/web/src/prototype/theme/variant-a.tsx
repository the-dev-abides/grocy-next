// PROTOTYPE. Throwaway. Variant A: Grocy, kept.
// A grey top bar, a grey sidebar with a blue active bar on the left, a white
// page. Roboto at 14px. The scan buttons are the first group of the sidebar.
//
// The sidebar by screen width (Tailwind steps):
// - lg and wider, 1024px and up: open, 250px, with the labels.
// - md, 768px to 1023px: an icon rail of 56px. It opens to 250px over the
//   page on hover and on keyboard focus.
// - below md, under 768px: a hamburger button opens the sidebar as a sheet.
import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { otherItems, pageTitle, queueItem, scanItems, stockItems, type NavItem, type Page } from './data';
import { PageContent } from './pages';
import { Mark } from './mark';

export const name = 'Grocy, kept';

// `rail` is true inside the fixed sidebar, where the labels hide on md.
function Group({ label, items, page, go, rail }: { label?: string; items: NavItem[]; page: Page; go: (p: Page) => void; rail?: boolean }) {
  const hideOnRail = rail && 'md:opacity-0 md:group-hover/side:opacity-100 md:group-focus-within/side:opacity-100 lg:opacity-100';
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className={cn('text-sidebar-foreground/60 h-7 px-4 pt-3 text-xs font-medium whitespace-nowrap', hideOnRail)}>{label}</p>
      )}
      {items.map((item) => {
        const active = item.page === page;
        return (
          <button
            key={item.page}
            type="button"
            onClick={() => go(item.page)}
            aria-current={active ? 'page' : undefined}
            title={rail ? item.label : undefined}
            className={cn(
              'relative mx-2 flex h-10 items-center gap-3 rounded-lg px-3 text-left whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_4px_0_0_var(--sidebar-primary)]',
            )}
          >
            <item.icon className="size-5 shrink-0" />
            <span className={cn('flex-1', hideOnRail)}>{item.label}</span>
            {item.badge && (
              <span className={cn(
                'bg-sidebar-primary text-sidebar-primary-foreground rounded-full px-1.5 py-px text-xs font-medium tabular-nums',
                rail && 'md:absolute md:top-1 md:left-6 md:px-1 md:text-[10px] md:group-hover/side:static md:group-hover/side:px-1.5 md:group-hover/side:text-xs md:group-focus-within/side:static md:group-focus-within/side:px-1.5 md:group-focus-within/side:text-xs lg:static lg:px-1.5 lg:text-xs',
              )}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Nav({ page, go, rail }: { page: Page; go: (p: Page) => void; rail?: boolean }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1 py-2">
      <Group label="Scan" items={scanItems} page={page} go={go} rail={rail} />
      <Group items={[queueItem]} page={page} go={go} rail={rail} />
      <Group label="Stock" items={stockItems} page={page} go={go} rail={rail} />
      <Group label="More" items={otherItems} page={page} go={go} rail={rail} />
    </nav>
  );
}

export function VariantA() {
  const [page, setPage] = useState<Page>('queue');
  const [open, setOpen] = useState(false);
  const go = (p: Page) => { setPage(p); setOpen(false); };

  return (
    <div className="proto-font-roboto bg-background text-foreground min-h-svh text-sm">
      <header className="bg-sidebar border-sidebar-border fixed inset-x-0 top-0 z-40 flex h-13 items-center gap-2 border-b px-2 lg:pl-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open the menu" />}>
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

      <aside className="group/side bg-sidebar border-sidebar-border text-sidebar-foreground fixed top-13 bottom-0 left-0 z-30 hidden w-14 overflow-x-hidden overflow-y-auto border-r shadow-none transition-[width] duration-150 md:block md:hover:w-[250px] md:hover:shadow-lg md:focus-within:w-[250px] md:focus-within:shadow-lg lg:w-[250px] lg:shadow-none">
        <Nav page={page} go={go} rail />
      </aside>

      <main className="pt-13 md:pl-14 lg:pl-[250px]">
        <div className="flex flex-col gap-4 p-4 lg:p-6">
          <h1 className="text-2xl font-medium">{pageTitle[page]}</h1>
          <PageContent page={page} variant="a" />
        </div>
      </main>
    </div>
  );
}
