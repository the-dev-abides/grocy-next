import { InventoryRow } from './inventory-row';
import { ScanScreen } from './scan-screen';

// The Inventory scan screen: the shared scan screen without the store and
// the price. One row per product, with the Grocy stock from the product
// read. A repeat scan of a product changes nothing on its row. A row with no
// product and no lookup result gets the write-in name field, and the typed
// name goes to the row with an update. The review queue sets the count.
export function InventoryScanPage() {
  return (
    <ScanScreen
      bookingType="inventory"
      title="Inventory"
      emptyText="Point the camera at a barcode, or type a code. Each product appears here one time."
      renderRow={(scan, session) => {
        return (
          <InventoryRow
            lists={session.lists}
            scan={scan}
            onReject={() => {
              session.reject(scan);
            }}
            onWriteInName={(writeInName) => {
              session.update(scan, { writeInName });
            }}
          />
        );
      }}
    />
  );
}
