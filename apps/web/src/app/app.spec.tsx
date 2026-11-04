import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { App } from './app';
import { store } from './store';

// The test renders the page with the real store. The network is the one
// boundary that the test replaces: `fetch` answers the product list request
// with two products.
const PRODUCTS = [
  { id: 1, name: 'Cookies', description: null },
  { id: 2, name: 'Chocolate', description: 'Dark, 70 percent.' },
];

describe('the web app', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith('/api/v2/products')) {
        return Response.json(PRODUCTS);
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the product list from the Next API', async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Grocy Next' }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Products' }),
    ).toBeDefined();
    expect(await screen.findByText('Cookies')).toBeDefined();
    expect(screen.getByText('Chocolate')).toBeDefined();
    expect(screen.getByText('Dark, 70 percent.')).toBeDefined();
    expect(screen.getByText('2 products')).toBeDefined();
  });
});
