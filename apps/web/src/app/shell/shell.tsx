import { cn } from 'cn';
import { Menu } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { Mark } from './mark';
import { Nav, scanItems } from './nav';

function Brand() {
  return (
    <>
      <Mark className="size-6" /> Grocy Next
    </>
  );
}

// Below `md` a hamburger button in the top bar opens the sidebar as a sheet
// from the left. A click on an item closes the sheet.
function MenuSheet() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open the menu"
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="flex h-13 items-center gap-2 px-4">
          <Brand />
        </SheetTitle>
        <Nav
          onNavigate={() => {
            setIsOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

// The two scan buttons of the top bar. They hide below `sm`, where the
// sidebar holds them. The button of the open scan screen is the primary one.
function ScanButtons() {
  const { pathname } = useLocation();
  return (
    <>
      {scanItems.map((item) => {
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              buttonVariants({
                size: 'sm',
                variant: pathname === item.to ? 'default' : 'outline',
              }),
              `
                hidden
                sm:inline-flex
              `,
            )}
          >
            <item.icon data-icon="inline-start" /> {item.label}
          </Link>
        );
      })}
    </>
  );
}

// The app shell of ADR 0013: a 52px top bar, a 250px sidebar, and the page.
// The sidebar by screen width, in Tailwind steps:
// - `lg` and wider, 1024px and up: open, with the labels.
// - `md`, 768px to 1023px: an icon rail of 56px. It opens to 250px over the
//   page on hover and on keyboard focus.
// - Below `md`, under 768px: the hamburger button and the sheet.
export function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-svh bg-background text-sm text-foreground">
      <header
        className="
          fixed inset-x-0 top-0 z-40 flex h-13 items-center gap-2 border-b
          border-sidebar-border bg-sidebar px-2
          lg:pl-4
        "
      >
        <MenuSheet />
        <span
          className="
            flex items-center gap-2 text-base font-medium
            lg:w-[234px]
          "
        >
          <Brand />
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ScanButtons />
        </div>
      </header>
      <aside
        aria-label="Sidebar"
        className="
          group/side fixed top-13 bottom-0 left-0 z-30 hidden w-14
          overflow-x-hidden overflow-y-auto border-r border-sidebar-border
          bg-sidebar text-sidebar-foreground shadow-none transition-[width]
          duration-150
          md:block
          md:focus-within:w-[250px] md:focus-within:shadow-lg
          md:hover:w-[250px] md:hover:shadow-lg
          lg:w-[250px] lg:shadow-none
        "
      >
        <Nav isRail />
      </aside>
      <main
        className="
          pt-13
          md:pl-14
          lg:pl-[250px]
        "
      >
        {children}
      </main>
    </div>
  );
}
