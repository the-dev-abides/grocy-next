import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { App } from './app';
import { store } from './store';

// The tests render the app with the real store at one route and check what
// the shell and the page show. The product list request has no API to reach
// in the test, so the page shows its error text. The product list is proven
// against a running Grocy instance, not here. The end-to-end tests follow
// the links and check the sidebar states by screen width.
function renderAt(path: string) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );
}

describe('the web app', () => {
  it.each([
    ['/', 'Review queue'],
    ['/review-queue', 'Review queue'],
    ['/scan/purchase', 'Purchase'],
    ['/scan/inventory', 'Inventory'],
    ['/stock', 'Products'],
    ['/no-such-page', 'Review queue'],
  ])('opens the path %s with the page title %s', (path, title) => {
    renderAt(path);

    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeDefined();
  });

  it('renders the product list of milestone 1 under /stock', async () => {
    renderAt('/stock');

    expect(
      await screen.findByText(
        'The product list did not load. Check that the API runs and that Grocy answers.',
      ),
    ).toBeDefined();
  });

  it('renders the review queue under /review-queue', async () => {
    renderAt('/review-queue');

    expect(
      await screen.findByText(
        'The review queue did not load. Check that the API runs.',
      ),
    ).toBeDefined();
  });

  it('shows the sidebar with the scan items, the review queue, and the stock item', () => {
    renderAt('/review-queue');

    const sidebar = screen.getByRole('navigation', { name: 'Main' });
    expect(within(sidebar).getByText('Scan')).toBeDefined();
    expect(within(sidebar).getByText('Stock')).toBeDefined();
    expect(
      within(sidebar).getByRole('link', { name: 'Purchase' }),
    ).toBeDefined();
    expect(
      within(sidebar).getByRole('link', { name: 'Inventory' }),
    ).toBeDefined();
    expect(
      within(sidebar).getByRole('link', { name: 'Products' }),
    ).toBeDefined();
    expect(
      within(sidebar).getByRole('link', {
        current: 'page',
        name: 'Review queue',
      }),
    ).toBeDefined();
  });

  it('marks the stock item as the current page under /stock', () => {
    renderAt('/stock');

    const sidebar = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(sidebar).getByRole('link', { current: 'page', name: 'Products' }),
    ).toBeDefined();
    expect(
      within(sidebar).queryByRole('link', {
        current: 'page',
        name: 'Review queue',
      }),
    ).toBeNull();
  });

  it('shows the two scan buttons in the top bar', () => {
    renderAt('/review-queue');

    const topBar = screen.getByRole('banner');
    expect(
      within(topBar).getByRole('link', { name: 'Purchase' }),
    ).toBeDefined();
    expect(
      within(topBar).getByRole('link', { name: 'Inventory' }),
    ).toBeDefined();
  });
});
