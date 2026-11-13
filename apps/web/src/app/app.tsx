import { Navigate, Route, Routes } from 'react-router';

import { ReviewQueuePage } from './review-queue/review-queue-page';
import { InventoryScanPage } from './scan/inventory-scan-page';
import { ConsumeTransferPrototypePage } from './scan/prototype/consume-transfer-prototype-page';
import { PurchaseScanPage } from './scan/purchase-scan-page';
import { Shell } from './shell/shell';
import { ProductsPage } from './stock/products-page';

// The routes of the web app. The route `/` and an unknown path open the
// review queue. The API serves `index.html` for every path outside `/api`,
// so every route opens from a reload too.
export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate replace to="/review-queue" />} />
        <Route path="/scan/purchase" element={<PurchaseScanPage />} />
        <Route path="/scan/inventory" element={<InventoryScanPage />} />
        <Route
          path="/scan/consume-transfer"
          element={<ConsumeTransferPrototypePage />}
        />
        <Route path="/review-queue" element={<ReviewQueuePage />} />
        <Route path="/stock" element={<ProductsPage />} />
        <Route path="*" element={<Navigate replace to="/review-queue" />} />
      </Routes>
    </Shell>
  );
}
