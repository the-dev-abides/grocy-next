import type { ReactNode } from 'react';

// The page frame of ADR 0013: a title of 1.5rem and 16px of padding, 24px
// from `lg`.
export function Page({
  children,
  title,
}: Readonly<{ children?: ReactNode; title: string }>) {
  return (
    <div
      className="
        flex flex-col gap-4 p-4
        lg:p-6
      "
    >
      <h1 className="text-2xl font-medium">{title}</h1>
      {children}
    </div>
  );
}
