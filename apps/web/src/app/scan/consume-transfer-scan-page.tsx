import { BookingSwitch } from './booking-switch';
import { ConsumeTransferRow } from './consume-transfer-row';
import { ScanScreen } from './scan-screen';

// The Consume and Transfer scan screen: the shared scan screen with the "from"
// location in the defaults. The switch under the camera sets the booking type
// of the next scan, and a Transfer has the "To" location select. The scan
// screen copies the booking type, the "from" location, and on a Transfer the
// "to" location into each create call. The server sets the amount, the unit,
// and, with no "from" location, the location of the Grocy form.
export function ConsumeTransferScanPage() {
  return (
    <ScanScreen
      bookingType="consume"
      title="Consume and Transfer"
      emptyText="Point the camera at a barcode, or type a code. The scan appears here."
      renderControls={(session) => {
        return (
          <BookingSwitch
            lists={session.lists}
            scanDefaults={session.scanDefaults}
          />
        );
      }}
      renderRow={(scan, session) => {
        return (
          <ConsumeTransferRow
            lists={session.lists}
            scan={scan}
            onFlip={(bookingType) => {
              session.update(scan, { bookingType });
            }}
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
