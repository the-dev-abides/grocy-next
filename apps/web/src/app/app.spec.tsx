import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { App } from './app';
import { store } from './store';

describe('the web app', () => {
  it('renders the placeholder page with the real store', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Grocy Next' }),
    ).toBeDefined();
  });
});
