// One product as the Grocy objects endpoint returns it. The type comes from
// the Grocy 4.7.1 OpenAPI document and holds the fields that the product
// list reads. No generator writes it. It is temporary. Grocy Next replaces
// Grocy and builds its own entity model.
export interface GrocyProduct {
  id: number;
  name: string;
  description: null | string;
}
