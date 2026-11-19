import type { PendingScan, Product } from '../api/next-api';

import { ChoiceSelect } from './choice-select';
import { ANY_STOCK_ENTRY, stockEntryChoices } from './stock-plan-text';

// The stock entry select of a Consume row and a Transfer row. It lists the
// stock entries at the "from" location, as the Grocy consume form and
// transfer form list them. A Consume also lists the stock entries of the
// sub-products. The first choice names no stock entry, so Grocy
// takes the stock entries in its consume order. With a stock entry, the
// accept takes that stock entry only.
export function StockEntrySelect({
  bookingType,
  locationId,
  onChange,
  product,
  stockEntryId,
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  locationId: null | number;
  onChange: (stockEntryId: null | string) => void;
  product: Product | undefined;
  stockEntryId: null | string;
}>) {
  return (
    <ChoiceSelect
      choices={stockEntryChoices(
        product,
        locationId,
        stockEntryId,
        bookingType,
      )}
      label="Stock entry"
      value={stockEntryId ?? ANY_STOCK_ENTRY}
      onChange={(value) => {
        onChange(value === ANY_STOCK_ENTRY ? null : value);
      }}
    />
  );
}
