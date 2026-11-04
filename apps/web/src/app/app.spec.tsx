import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { App } from './app';
import { store } from './store';

// The smoke test renders the page with the real store and checks that it
// mounts. The product list request has no API to reach in the test, so the
// page shows its error text. The product list is proven against a running
// Grocy instance, not here.
describe('the web app', () => {
  it('renders the product list page with the real store', () => {
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
  });
});
