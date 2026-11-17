import { ConsumeRow } from './consume-row';
import { ScanScreen } from './scan-screen';

// The Consume and Transfer scan screen: the shared scan screen with the "from"
// location in the defaults. In this version every scan is a Consume. The scan
// screen copies the booking type and the "from" location into each create
// call. The server sets the amount, the unit, and, with no "from" location,
// the location of the Grocy consume form.
export function ConsumeTransferScanPage() {
  return (
    <ScanScreen
      bookingType="consume"
      title="Consume and Transfer"
      emptyText="Point the camera at a barcode, or type a code. The scan appears here."
      renderRow={(scan, session) => {
        return (
          <ConsumeRow
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
