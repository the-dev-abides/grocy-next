# Theme and app shell prototype

Throwaway. This branch is never merged. It answers the ticket
"Theme and app shell", GitHub issue #71.

## Run it

1. Check out the branch `prototype/theme-and-app-shell`.
2. Run `pnpm install`.
3. Run `pnpm exec nx run web:serve`.
4. Open `http://localhost:4200/?variant=a`.

The bar at the bottom of the page switches the variant and the dark mode.
The left and right arrow keys switch the variant too. The URL holds the
state: `?variant=a|b|c` and `&dark=1`.

## The variants

- A, "Grocy, kept": grey top bar, grey 250px sidebar, white page, Roboto 14px.
  The night mode is the Grocy night mode with the pink accent.
- B, "Scan first": white chrome, bottom tab bar on a phone, icon rail on a
  large screen, Geist 14px. A cool dark grey at night.
- C, "Blue bar": the Grocy blue is the top bar, the links sit in the bar, one
  round scan button on a phone, Roboto 15px.

Every variant shows the review queue table, the edit dialog, and the theme
page with the palette, the stock status rows, the type, and the manifest.

## The screenshots

The PNG files in this folder are from Playwright on a Pixel 7 viewport and
on a 1366 by 820 viewport. The name says the variant, the viewport, the mode,
and the view.
