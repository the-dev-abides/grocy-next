import { PriceField } from './price-field';
import { PurchaseRow } from './purchase-row';
import { ScanScreen } from './scan-screen';
import { nextAmount } from './swipe';

// The Purchase scan screen. It is the shared scan screen with the store in the
// defaults. It has the price for the next scan under the camera and the amount
// controls on each row. Plus and minus send an update with the new amount.
export function PurchaseScanPage() {
  return (
    <ScanScreen
      bookingType="purchase"
      title="Purchase"
      emptyText="Point the camera at a barcode, or type a code. The scan appears here."
      renderControls={(session) => {
        return (
          <PriceField
            nextPrice={session.scanDefaults.nextPrice}
            onChange={session.scanDefaults.setNextPrice}
          />
        );
      }}
      renderRow={(scan, session) => {
        return (
          <PurchaseRow
            lists={session.lists}
            scan={scan}
            onChangeAmount={(delta) => {
              session.update(scan, { amount: nextAmount(scan.amount, delta) });
            }}
            onReject={() => {
              session.reject(scan);
            }}
          />
        );
      }}
    />
  );
}
