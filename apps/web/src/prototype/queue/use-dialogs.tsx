// PROTOTYPE. Throwaway. One hook that holds the dialog state of a variant
// and renders the dialogs. The variants differ in layout, not in dialogs.
import { useState, type ReactNode } from 'react';
import { BulkEditDialog, EditDialog, NewProductDialog, PickProductDialog } from './dialogs';
import { ConfirmDialog } from './parts';
import { canAccept, type Catalog, type PendingScan, type Queue } from './queue';

interface Confirm {
  title: string;
  body: ReactNode;
  action: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function useDialogs(catalog: Catalog, queue: Queue, scans: PendingScan[]) {
  const [editing, setEditing] = useState<PendingScan | null>(null);
  const [bulk, setBulk] = useState<number[] | null>(null);
  const [picking, setPicking] = useState<PendingScan | null>(null);
  const [creating, setCreating] = useState<PendingScan | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const acceptIds = (ids: number[], title: string) => {
    const rows = scans.filter((s) => ids.includes(s.id));
    const ready = rows.filter(canAccept).length;
    const skipped = rows.length - ready;
    setConfirm({
      title,
      body: <>One booking per row, {ready} {ready === 1 ? 'row' : 'rows'}. {skipped > 0 && `${skipped} ${skipped === 1 ? 'row has' : 'rows have'} no product or no count and will be refused. `}A booking can be undone in Grocy.</>,
      action: `Accept ${ready}`,
      onConfirm: () => void queue.acceptMany(ids),
    });
  };
  const rejectIds = (ids: number[], title: string) => {
    setConfirm({
      title,
      body: <>{ids.length} pending {ids.length === 1 ? 'scan is' : 'scans are'} deleted. The queue keeps no history.</>,
      action: `Reject ${ids.length}`,
      destructive: true,
      onConfirm: () => queue.rejectMany(ids),
    });
  };

  const dialogs = (
    <>
      <EditDialog scan={editing} catalog={catalog} queue={queue} onClose={() => setEditing(null)} onPick={(s) => { setEditing(null); setPicking(s); }} />
      <BulkEditDialog ids={bulk} scans={scans} catalog={catalog} queue={queue} onClose={() => setBulk(null)} />
      <PickProductDialog scan={picking} catalog={catalog} queue={queue} onClose={() => setPicking(null)} />
      <NewProductDialog scan={creating} catalog={catalog} queue={queue} onClose={() => setCreating(null)} />
      <ConfirmDialog open={confirm !== null} title={confirm?.title ?? ''} body={confirm?.body} action={confirm?.action ?? ''} destructive={confirm?.destructive} onConfirm={() => confirm?.onConfirm()} onClose={() => setConfirm(null)} />
    </>
  );

  return { dialogs, edit: setEditing, bulkEdit: setBulk, pick: setPicking, create: setCreating, acceptIds, rejectIds };
}

export type Dialogs = ReturnType<typeof useDialogs>;

// The checkbox selection of a variant.
export function useSelection(scans: PendingScan[]) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const ids = scans.map((s) => s.id);
  const live = [...selected].filter((id) => ids.includes(id));
  const all = live.length > 0 && live.length === ids.length;
  const toggle = (id: number) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(all ? new Set() : new Set(ids));
  const clear = () => setSelected(new Set());
  const has = (id: number) => selected.has(id);
  return { selected: live, all, toggle, toggleAll, clear, has, some: live.length > 0 };
}
