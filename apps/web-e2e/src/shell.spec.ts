import { expect, test } from '@playwright/test';

// The tests of the app shell of ADR 0013: the routes, the three sidebar
// states by screen width, the dark mode, and the install manifest.

const ROUTES = [
  { path: '/', title: 'Review queue' },
  { path: '/scan/purchase', title: 'Purchase' },
  { path: '/scan/inventory', title: 'Inventory' },
  { path: '/review-queue', title: 'Review queue' },
  { path: '/stock', title: 'Products' },
  { path: '/no-such-page', title: 'Review queue' },
];

for (const { path, title } of ROUTES) {
  test(`the path ${path} opens the page ${title}`, async ({ page }) => {
    await page.goto(path);

    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
  });
}

test('the sidebar is open with the labels at 1024px', async ({ page }) => {
  await page.setViewportSize({ height: 768, width: 1024 });
  await page.goto('/');

  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS('width', '250px');
  await expect(sidebar.getByText('Review queue')).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('button', { name: 'Open the menu' }),
  ).toBeHidden();

  await sidebar.getByRole('link', { name: 'Products' }).click();
  await expect(page).toHaveURL('/stock');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Products' }),
  ).toBeVisible();
});

test('the sidebar is an icon rail that opens on hover at 768px', async ({
  page,
}) => {
  await page.setViewportSize({ height: 1024, width: 768 });
  await page.goto('/');

  const sidebar = page.getByRole('complementary', { name: 'Sidebar' });
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS('width', '56px');
  await expect(sidebar.getByText('Review queue')).toHaveCSS('opacity', '0');
  await expect(
    page.getByRole('button', { name: 'Open the menu' }),
  ).toBeHidden();

  await sidebar.hover();
  await expect(sidebar).toHaveCSS('width', '250px');
  await expect(sidebar.getByText('Review queue')).toHaveCSS('opacity', '1');
});

test('the sidebar is a sheet behind a hamburger button at 375px', async ({
  page,
}) => {
  await page.setViewportSize({ height: 667, width: 375 });
  await page.goto('/');

  await expect(
    page.getByRole('complementary', { name: 'Sidebar' }),
  ).toBeHidden();
  const menuButton = page.getByRole('button', { name: 'Open the menu' });
  await expect(menuButton).toBeVisible();

  await menuButton.click();
  const sheet = page.getByRole('dialog', { name: 'Grocy Next' });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole('link', { name: 'Review queue' }),
  ).toHaveAttribute('aria-current', 'page');

  await sheet.getByRole('link', { name: 'Purchase' }).click();
  await expect(page).toHaveURL('/scan/purchase');
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Purchase' }),
  ).toBeVisible();
});

test('the scan buttons of the top bar hide below 640px', async ({ page }) => {
  await page.setViewportSize({ height: 667, width: 375 });
  await page.goto('/');

  const topBar = page.getByRole('banner');
  await expect(topBar.getByRole('link', { name: 'Purchase' })).toBeHidden();

  await page.setViewportSize({ height: 768, width: 1024 });
  await expect(topBar.getByRole('link', { name: 'Purchase' })).toBeVisible();
  await topBar.getByRole('link', { name: 'Inventory' }).click();
  await expect(page).toHaveURL('/scan/inventory');
});

test('the page is dark when the system preference is dark', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  // The Grocy night mode page colour, `#333131`, as the oklch token.
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'oklch(0.315 0.003 17.3)',
  );
});

test('the page has the manifest link, the theme-color meta, and the apple-touch-icon link', async ({
  page,
  request,
}) => {
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#337ab7',
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon.png',
  );

  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest: { icons: { purpose: string; sizes: string; src: string }[] } =
    await manifestResponse.json();
  expect(
    manifest.icons.map(({ purpose, sizes }) => `${sizes} ${purpose}`),
  ).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok()).toBe(true);
  }
  const appleIconResponse = await request.get('/apple-touch-icon.png');
  expect(appleIconResponse.ok()).toBe(true);
});
