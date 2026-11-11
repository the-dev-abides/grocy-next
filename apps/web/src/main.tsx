import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';

import { App } from './app/app';
import { store } from './app/store';
import './styles.css';

// `index.html` holds the root element.
const rootElement = document.querySelector('#root');
if (rootElement === null) {
  throw new Error('The root element is missing from index.html.');
}
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
