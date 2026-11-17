// One consume to book in Grocy. The amount is in the stock unit. For a tare
// weight product, the amount is the gross weight, container included. A null
// location lets Grocy take stock at all locations. Grocy picks the stock
// entries in its consume order. A stock id names the one stock entry that
// the consume takes, as the Grocy `stock_id` text. The client always allows
// the sub-product substitution, as the Grocy consume form does.
export interface Consume {
  amount: number;
  isSpoiled: boolean;
  locationId: null | number;
  stockId: null | string;
}

// One open of the rest of one stock entry. The amount is in the stock unit of
// the product of the stock entry. The stock id is the Grocy `stock_id` text of
// the stock entry.
export interface Open {
  amount: number;
  stockId: string;
}

// One stock entry as the accept of a Consume reads it before the consume. It
// carries the product of the stock entry, because the read includes the stock
// entries of the sub-products of a parent product. The stock id is the Grocy
// `stock_id` text. The amount is in the stock unit of that product.
export interface ConsumeStockEntry {
  amount: number;
  isOpen: boolean;
  locationId: null | number;
  productId: number;
  stockId: string;
}
