import { cn } from 'cn';
import { Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';

// The trash can of a Consume row, on the scan screen and in the review
// queue. A tap sets or clears the spoiled flag. The trash can is red when the
// flag is on. The button has the name "Spoiled" and says whether it is
// pressed.
export function SpoiledButton({
  isDisabled = false,
  isSpoiled,
  onToggle,
  size = 'icon',
}: Readonly<{
  isDisabled?: boolean;
  isSpoiled: boolean;
  onToggle: () => void;
  size?: 'icon' | 'icon-lg';
}>) {
  return (
    <Button
      variant={isSpoiled ? 'destructive' : 'ghost'}
      size={size}
      aria-label="Spoiled"
      aria-pressed={isSpoiled}
      title="Spoiled"
      disabled={isDisabled}
      className={cn('shrink-0', !isSpoiled && 'text-muted-foreground')}
      onClick={onToggle}
    >
      <Trash />
    </Button>
  );
}
