// One product as the Grocy objects endpoint returns it. This type is written
// by hand from the Grocy 4.7.1 OpenAPI document and holds the fields that the
// product list reads. It is temporary. Grocy Next replaces Grocy and builds
// its own entity model.
export interface GrocyProduct {
  id: number;
  name: string;
  description: string | null;
}
