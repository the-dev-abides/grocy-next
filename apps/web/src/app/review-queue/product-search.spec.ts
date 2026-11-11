import { searchProducts } from './product-search';

const products = [
  { description: null, id: 3, name: 'Nutella Biscuits 304 g' },
  { description: 'Cream cheese', id: 2, name: 'Philadelphia Original 150 g' },
  { description: null, id: 1, name: 'Coca-Cola Original 330 ml' },
];

describe('the search of the product pick dialog', () => {
  it('lists every product by name when the search is empty', () => {
    expect(searchProducts(products, '').map(({ id }) => id)).toEqual([1, 3, 2]);
  });

  it('finds a product by a part of its name, case ignored', () => {
    expect(searchProducts(products, 'phila').map(({ id }) => id)).toEqual([2]);
    expect(searchProducts(products, ' ORIGINAL ').map(({ id }) => id)).toEqual([
      1, 2,
    ]);
  });

  it('finds nothing for a text that no name holds', () => {
    expect(searchProducts(products, 'rice')).toEqual([]);
  });

  it('lists nothing while the product list has not loaded', () => {
    expect(searchProducts(undefined, 'phila')).toEqual([]);
  });
});
