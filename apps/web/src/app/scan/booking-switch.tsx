import { cn } from 'cn';

import type { DefaultsLists } from './session-defaults';
import type { ScanDefaults } from './use-scan-defaults';

import {
  bookingTypeChoices,
  bookingTypeIcon,
  SWITCH_BOOKING_TYPES,
} from '../booking-types';
import { RowSelect } from './defaults-section';
import { nextScanText } from './scan-text';

// The two halves of the switch, with the icon of each booking type.
const HALVES = bookingTypeChoices(SWITCH_BOOKING_TYPES).map((choice) => {
  const icon = bookingTypeIcon[choice.value];
  return { ...choice, icon };
});

// The switch with two halves under the camera. It sets the booking type of
// the next scan and stays where the user puts it.
function Switch({ scanDefaults }: Readonly<{ scanDefaults: ScanDefaults }>) {
  return (
    <div
      role="radiogroup"
      aria-label="Booking type of the next scan"
      className="grid grid-cols-2 gap-1 p-2"
    >
      {HALVES.map((half) => {
        const isOn = scanDefaults.bookingType === half.value;
        return (
          <button
            key={half.value}
            type="button"
            role="radio"
            aria-checked={isOn}
            className={cn(
              `
                flex h-11 items-center justify-center gap-2 rounded-md border
                font-medium
              `,
              isOn
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground',
            )}
            onClick={() => {
              scanDefaults.setBookingType(half.value);
            }}
          >
            <half.icon className="size-4" /> {half.label}
          </button>
        );
      })}
    </div>
  );
}

// The controls under the camera of the Consume and Transfer scan screen: the
// strip that names the next booking type, the switch, and on Transfer the
// "To" location select. The "to" location is a session default.
export function BookingSwitch({
  lists,
  scanDefaults,
}: Readonly<{ lists: DefaultsLists; scanDefaults: ScanDefaults }>) {
  const { bookingType, defaults, setDefaults } = scanDefaults;
  return (
    <>
      <p className="bg-primary px-3 py-1 font-medium text-primary-foreground">
        {nextScanText(bookingType, defaults.toLocationId, lists.locations)}
      </p>
      <Switch scanDefaults={scanDefaults} />
      {bookingType === 'transfer' && (
        <div className="px-2 pb-2">
          <RowSelect
            label="To"
            none="Select a location"
            rows={lists.locations}
            value={defaults.toLocationId}
            onChange={(toLocationId) => {
              setDefaults({ toLocationId });
            }}
          />
        </div>
      )}
    </>
  );
}
