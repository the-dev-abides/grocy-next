import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// The confirm of an action on many rows, so that a wrong tap does not book
// or delete the whole queue. The action of a reject is the destructive
// button.
export interface Confirm {
  action: string;
  body: string;
  isDestructive: boolean;
  isEnabled: boolean;
  onConfirm: () => void;
  title: string;
}

export function ConfirmDialog({
  confirm,
  onClose,
}: Readonly<{ confirm: Confirm | null; onClose: () => void }>) {
  return (
    <Dialog
      open={confirm !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{confirm?.title}</DialogTitle>
          <DialogDescription>{confirm?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={
              confirm?.isDestructive === true ? 'destructive' : 'default'
            }
            disabled={confirm?.isEnabled !== true}
            onClick={() => {
              confirm?.onConfirm();
              onClose();
            }}
          >
            {confirm?.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
