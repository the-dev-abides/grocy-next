import type { ComponentProps } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const badgeVariants = cva(
  `
    inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1
    overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs
    font-medium whitespace-nowrap
    [&>svg]:pointer-events-none [&>svg]:size-3!
  `,
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: `
          bg-destructive/10 text-destructive
          dark:bg-destructive/20
        `,
        outline: 'border-border text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
      },
    },
  },
);

function Badge({
  className,
  variant = 'default',
  ...props
}: Readonly<ComponentProps<'span'> & VariantProps<typeof badgeVariants>>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ className, variant }))}
      {...props}
    />
  );
}

export { Badge };
