---
status: accepted
---

# The theme and the app shell

Milestone 2 has the first screens, so it builds the theme and the app shell.
The theme is an implied requirement: one visual theme that every screen
uses. We decided on the Grocy colour scheme and the Grocy layout, with a
modern aesthetic: the shadcn/ui tokens on Tailwind 4, Roboto, Lucide icons,
a grey top bar and a grey sidebar with the blue active bar, a sidebar that
changes with the screen width, and an install manifest. The maintainer
picked this direction from three prototype variants.

## The decision

- The colour scheme is the Grocy scheme, as shadcn/ui tokens in oklch. Light
  mode: page `#ffffff`, text `#212529`, top bar and sidebar `#e5e5e5`, their
  borders and the active item `#d6d6d6`, the one accent `#337ab7` on the
  primary button, the checkbox, the focus ring, and the active bar. Dark
  mode is the Grocy night mode: page `#333131`, text `#c1c1c1`, borders and
  the active item `#383838`, muted text `#8f9ba5`, and the accent `#ff7585`
  on the primary button, the checkbox, and the active bar. The stock status
  rows keep the Grocy row colours: expired `#f5c6cb`, overdue `#d6d8db`, due
  soon `#ffeeba`, below minimum stock `#bee5eb`, and at night `#471116`,
  `#4c4e50`, `#473604`, `#07373f`. The oklch values are in the prototype
  file `prototype.css`. The radius is `0.375rem`.
- The type is Roboto 400, 500, and 700 from `@fontsource/roboto`, the Grocy
  font. The base size of the content is 14px (`text-sm`). The page title is
  1.5rem at weight 500, a section title 1.125rem at weight 500, small text
  0.75rem, and a code or a barcode is the monospace font at 0.875rem. Geist
  leaves the web app.
- The icons are Lucide, as `components.json` already says. Font Awesome is
  not used.
- The top bar is 52px, grey, with a 1px bottom border. It holds the mark and
  the name on the left, and on the right a search button and the two scan
  buttons, Purchase and Inventory. The scan buttons hide below 640px, where
  the sidebar holds them.
- The sidebar is 250px, grey, with a 1px right border. The groups, in
  order: Scan with Purchase and Inventory, the Review queue with the count
  of pending scans as a badge, Stock, and More. An item is a rounded row of
  40px. The active item has the `#d6d6d6` background and a 4px blue bar on
  the left. The sidebar changes with the screen width in Tailwind steps:
  - `lg` and wider, 1024px and up: open, with the labels.
  - `md`, 768px to 1023px: an icon rail of 56px. It opens to 250px over the
    page on hover and on keyboard focus.
  - Below `md`, under 768px: a hamburger button in the top bar opens the
    sidebar as a sheet from the left.
- The page is white with a title of 1.5rem and 16px of padding, 24px from
  `lg`. A table has 0.875rem text, 8px cell padding, rows of 44px, a header
  row on the muted colour, and a 1px border around it. A selected row has
  the muted background. A row with a Grocy error has the expired row
  colour. A dialog is the shadcn/ui dialog with a two-column form from
  640px.
- The mark is a white barcode of six bars on a rounded square in `#337ab7`.
- The install manifest at `/manifest.webmanifest`: `id` and `start_url`
  `/`, `scope` `/`, `name` and `short_name` `Grocy Next`, `display`
  `standalone`, `orientation` `any`, `background_color` `#ffffff`,
  `theme_color` `#337ab7`, and three PNG icons: 192 and 512 with purpose
  `any`, and 512 with purpose `maskable` and the mark inside the safe
  zone. The HTML has the `theme-color` meta, the `apple-touch-icon` link,
  and the manifest link. No service worker in milestone 2.

## Considered options

- A white chrome with a bottom tab bar on a phone and an icon rail on a
  large screen, in Geist. Rejected: a Grocy user does not recognise it.
- The Grocy blue as the top bar with the links in it and no sidebar.
  Rejected: the sidebar is the Grocy layout.
- Geist, the font of the milestone 1 scaffold. Rejected: Roboto is the
  Grocy font.
- The Grocy breakpoint of 992px for the hamburger. Rejected: Tailwind has
  no 992px step, and the icon rail covers 768px to 1023px.
- The blue kept at night. Rejected: the pink is the Grocy night mode.
- Font Awesome, the Grocy icon set. Rejected: shadcn/ui and `components.json`
  use Lucide, and no screen needs a glyph that Lucide lacks.
- A service worker for the install prompt. Rejected: Chromium installs a
  web app from the manifest alone, and offline scanning is out of scope.

## Consequences

- The to-spec run for the scan screens and the review queue starts from
  these tokens, this shell, and this table density.
- How the user picks the dark mode is not decided here. The prototype
  reads a URL parameter. The to-spec run settles it. The minimum is the
  system preference through `prefers-color-scheme`.
- The icon rail on `md` covers a phone in landscape and a small tablet.

## Sources

- The theme research on branch `research/theme-sources`.
- The prototype on branch `prototype/theme-and-app-shell`, with the
  screenshots in `docs/prototype/theme/`.
- Ticket [#71](https://github.com/the-dev-abides/grocy-next/issues/71).
