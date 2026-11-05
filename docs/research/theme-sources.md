# The Grocy colour palette and shadcn/ui theming on Tailwind 4

Ticket: GitHub issue #66, "The Grocy colour palette and shadcn/ui theming on
Tailwind 4".
Parent map: GitHub issue #61.

This document records facts. It does not choose.

Date of research: 2026-11-05. All facts come from the sources that are named
next to them. The Grocy facts come from the Grocy repository at the tag
`v4.7.1`. The shadcn/ui, Tailwind, Base UI, MDN, and Vite PWA facts come from
the current docs and from the npm registry on 2026-11-05.

## The question

What is the Grocy colour palette, and how does a shadcn/ui app on Tailwind 4
define a theme today? The theme prototype needs both.

## Summary

- Grocy has no colour variables of its own. Bootstrap 4.6.2 gives the base
  palette. Three hand-written CSS files add the Grocy colours as literal hex
  values: `public/css/grocy.css`, `public/css/grocy_menu_layout.css`, and
  `public/css/grocy_night_mode.css`.
- The Grocy light theme is grey on white. The top bar and the sidebar are
  `#e5e5e5` with `#d6d6d6` borders. The one accent colour is `#337ab7`, the
  blue of the Grocy logo and of the active sidebar item.
- The Grocy night mode is a second stylesheet. It changes the page to
  `#333131` with `#c1c1c1` text, and it changes the accent to `#ff7585`.
- Grocy marks stock status with four Bootstrap table row classes. Expired is
  `table-danger`, overdue is `table-secondary`, due soon is `table-warning`,
  and below minimum stock is `table-info`.
- Grocy uses Roboto 400, 500, and 700 at a 0.85rem content size on the
  Bootstrap 1rem base. The sidebar is 250px wide and collapses to 55px. The
  phone layout starts below 992px.
- Grocy uses Font Awesome Free 7.3.1, the solid style only.
- A shadcn/ui theme is a set of CSS variables on `:root` and `.dark`, in the
  oklch colour space. A `@theme inline` block maps each variable to a
  Tailwind utility. The web app in this repo already has this file at
  `apps/web/src/styles.css`, with the `neutral` base colour.
- Dark mode is a `dark` class on the `<html>` element. A `@custom-variant
  dark` line binds the `dark:` utilities to that class.
- shadcn/ui lists 66 components. Base UI is the default primitive library
  since July 2026. Every component that the scan screens and the review queue
  need has a Base UI page.
- A phone installs a web app from a manifest. Chromium needs `name` or
  `short_name`, a 192px and a 512px icon, `start_url`, and `display`. A
  service worker is not a requirement for installation. The Vite PWA plugin
  `vite-plugin-pwa` 2.0.0 generates the manifest and the service worker.

## 1. The Grocy colours

### 1.1 Where Grocy defines its colours

Grocy loads these stylesheets in `views/layout/default.blade.php`, in this
order:

1. `@fontsource/roboto` 400, 500, and 700.
2. `bootstrap/dist/css/bootstrap.min.css` (Bootstrap 4.6.2 from `yarn.lock`).
3. `@fortawesome/fontawesome-free/css/fontawesome.min.css` and
   `solid.min.css`.
4. Third-party CSS for DataTables, Tempus Dominus, and others.
5. `public/css/grocy.css` and `public/css/grocy_menu_layout.css`.
6. `public/css/grocy_night_mode.css`, only when the user setting
   `night_mode_enabled_internal` is true.

There is no `public/scss/` folder. The three Grocy CSS files are hand-written
and hold literal hex values. Grocy defines no CSS custom properties.

Sources: `views/layout/default.blade.php` lines 27-90, `package.json`,
`yarn.lock`, `public/css/` in the Grocy repository at `v4.7.1`.

### 1.2 The light theme

The light theme is Bootstrap 4.6.2 defaults plus the Grocy overrides. The
"Variable" column names the Bootstrap Sass variable or the Grocy CSS selector
that defines the value.

| Role | Hex | File and variable or selector |
| --- | --- | --- |
| Page background | `#ffffff` | `grocy_menu_layout.css`: `.content-wrapper { background: white }`; Bootstrap `$body-bg: $white` |
| Body text | `#212529` | Bootstrap `_variables.scss`: `$body-color: $gray-900` |
| Top bar background | `#e5e5e5` | `grocy_menu_layout.css`: `#mainNav { background-color: #e5e5e5 !important }` |
| Top bar bottom border | `#d6d6d6` | `grocy_menu_layout.css`: `#mainNav { border-bottom: 2px solid; border-color: #d6d6d6 }` |
| Sidebar background | `#e5e5e5` | `grocy_menu_layout.css`: `.navbar-sidenav, .sidenav-second-level { background-color: #e5e5e5 !important }` |
| Sidebar right border | `#d6d6d6` | `grocy_menu_layout.css`: `.navbar-sidenav, .sidenav-second-level { border-right: 2px solid; border-color: #d6d6d6 }` |
| Sidebar item hover and active background | `#d6d6d6` | `grocy_menu_layout.css`: `.navbar-sidenav>li:hover, ..., .active-page { background-color: #d6d6d6 !important }` |
| Sidebar active indicator (accent) | `#337ab7` | `grocy_menu_layout.css`: `.active-page { box-shadow: inset 7px 0 0 #337ab7 !important }` |
| Sidebar link text | `rgba(0,0,0,0.5)` | `grocy_menu_layout.css`: `#mainNav.navbar-light ... .nav-link { color: rgba(0, 0, 0, 0.5) }` |
| Sidebar link hover text | `rgba(0,0,0,0.7)` | `grocy_menu_layout.css`: `... .nav-link:hover { color: rgba(0, 0, 0, 0.7) }` |
| Sidebar active link text | `#000000` | `grocy_menu_layout.css`: `.navbar-sidenav li.active a { color: #000 !important }` |
| Sidebar toggler | `#d6d6d6` | `grocy_menu_layout.css`: `.sidenav-toggler { background-color: #d6d6d6 !important }` |
| Brand (logo) colour | `#337ab7` | `public/img/logo.svg` and `public/img/icon.svg`: `fill="#337ab7"` |
| Primary (Bootstrap) | `#007bff` | Bootstrap `_variables.scss`: `$primary: $blue`, `$blue: #007bff` |
| Secondary | `#6c757d` | Bootstrap: `$secondary: $gray-600` |
| Success | `#28a745` | Bootstrap: `$success: $green` |
| Info | `#17a2b8` | Bootstrap: `$info: $cyan` |
| Warning | `#ffc107` | Bootstrap: `$warning: $yellow` |
| Danger | `#dc3545` | Bootstrap: `$danger: $red` |
| Light | `#f8f9fa` | Bootstrap: `$light: $gray-100` |
| Dark | `#343a40` | Bootstrap: `$dark: $gray-800` |
| Border and table border | `#dee2e6` | Bootstrap: `$border-color: $gray-300`, `$table-border-color: $border-color` |
| Link colour (Bootstrap default) | `#007bff` | Bootstrap: `$link-color: theme-color("primary")`; compiled `a { color: #007bff }` |
| Link hover (Bootstrap default) | `#0056b3` | Bootstrap: `$link-hover-color: darken($link-color, 15%)`; compiled `a:hover { color: #0056b3 }` |
| Link colour (Grocy override) | inherits the text colour | `grocy.css`: `a:not(.btn):not(.nav-link):not(.dropdown-item):not(.list-group-item) { color: inherit; text-decoration: underline; text-decoration-style: dotted }` |
| Toast success | `#28a745` | `grocy.css`: `.toast-success { background-color: #28a745 }` |
| Toast error | `#dc3545` | `grocy.css`: `.toast-error { background-color: #dc3545 }` |
| Active tab underline | `#000000` | `grocy.css`: `.grocy-tabs .nav-link.active { border-bottom-color: #000 !important }` |
| Sticky form footer border | `#d6d6d6` | `grocy.css`: `.sticky-form-footer { border-top: 1px solid #d6d6d6; background-color: white }` |
| Combobox active item | `#e5e5e5` | `grocy.css`: `.typeahead .active { background-color: #e5e5e5 }` |

Two rules in `grocy_menu_layout.css` set the sidebar background. The first,
inside `@media (min-width: 992px)`, sets `#mainNav.navbar-light
.navbar-collapse .navbar-sidenav { background: #f8f9fa }`. The second, later
in the file, sets `.navbar-sidenav { background-color: #e5e5e5 !important }`.
The `!important` rule wins, so the sidebar is `#e5e5e5` at every width.

Button use in the views, counted with `grep` over `views/`: `btn-outline-dark`
75, `btn-success` 55, `btn-outline-info` 34, `btn-primary` 32,
`btn-outline-secondary` 28, `btn-info` 28, `btn-danger` 27, `btn-secondary`
22, `btn-outline-primary` 12, `btn-light` 10, `btn-outline-danger` 3.

Sources: `public/css/grocy.css`, `public/css/grocy_menu_layout.css`,
`public/img/logo.svg`, `public/img/icon.svg` in the Grocy repository at
`v4.7.1`; `scss/_variables.scss` and `dist/css/bootstrap.css` in the
Bootstrap repository at `v4.6.2`.

### 1.3 The stock status colours

Grocy marks the state of a product row in the stock overview with a Bootstrap
table row class. The server sets the class in
`views/stockoverview.blade.php` line 197. The browser resets it after each
stock change in `public/viewjs/stockoverview.js` lines 294-318. The rules:

1. The next due date is in the past and the amount is above zero. If the
   product `due_type` is 1 (best before date), the row is `table-secondary`
   and the state is "overdue". If the `due_type` is 2 (expiration date), the
   row is `table-danger` and the state is "expired".
2. The next due date is within the next X days (user setting). The row is
   `table-warning` and the state is "due soon".
3. The minimum stock amount is above zero and the aggregated stock amount is
   below it. The row is `table-info` and the state is "below minimum stock".

Above the table, four filter badges show the counts. Each badge has its own
message class in `grocy.css`. The `id` and the `data-status-filter` attribute
name the state (`views/stockoverview.blade.php` lines 60-74).

| State | Row class | Row background, light | Row background, night | Badge class | Badge light (background / text / top border) | Badge night (background / text) |
| --- | --- | --- | --- | --- | --- | --- |
| Expired | `table-danger` | `#f5c6cb` | `#471116` | `.error-message` | `#ffeeee` / `#780a0a` / `#ba2525` | `#780a0a` / `#d1d1d1` |
| Overdue | `table-secondary` | `#d6d8db` | `#4c4e50` | `.secondary-message` | `#e1e4e8` / `#4e575f` / `#68696b` | `#4e575f` / `#d1d1d1` |
| Due soon | `table-warning` | `#ffeeba` | `#473604` | `.warning-message` | `#fffaeb` / `#7c5e10` / `#e9b949` | `#7c5e10` / `#d1d1d1` |
| Below minimum stock | `table-info` | `#bee5eb` | `#07373f` | `.normal-message` | `#e0e8f9` / `#2d3a8c` / `#4c63b6` | `#2d3a8c` / `#d1d1d1` |

The light row backgrounds come from Bootstrap. The mixin
`table-row-variant` in `scss/mixins/_table-row.scss` mixes each theme colour
with white at level `$table-bg-level: -9` (`$theme-color-interval: 8%`). The
compiled values are in `dist/css/bootstrap.css` lines 1740-1831. The night
row backgrounds come from `grocy_night_mode.css`. The badge colours come from
`grocy.css` (light) and `grocy_night_mode.css` (night).

Sources: `views/stockoverview.blade.php`, `public/viewjs/stockoverview.js`,
`public/css/grocy.css`, `public/css/grocy_night_mode.css` in the Grocy
repository at `v4.7.1`; `scss/_variables.scss`, `scss/mixins/_table-row.scss`,
`scss/_tables.scss`, `dist/css/bootstrap.css` in the Bootstrap repository at
`v4.6.2`.

### 1.4 The dark theme (night mode)

Night mode is a second stylesheet, `public/css/grocy_night_mode.css`. The
server adds the class `night-mode` to `<body>` and links the stylesheet when
the user setting `night_mode_enabled_internal` is true
(`views/layout/default.blade.php` lines 86-90 and 132). Every rule in the
file starts with `.night-mode`.

| Role | Hex | Selector in `grocy_night_mode.css` |
| --- | --- | --- |
| Page background | `#333131` | `body.night-mode`, `.night-mode .content-wrapper`, `.night-mode .container-fluid` |
| Body text | `#c1c1c1` | `body.night-mode { color: #c1c1c1 }` |
| Top bar background | `#333131` | `.night-mode #mainNav { background-color: #333131 !important }` |
| Top bar bottom border | `#383838` | `.night-mode #mainNav { border-color: #383838 !important }` |
| Sidebar background | `#333131` | `.night-mode .navbar-sidenav, .night-mode .sidenav-second-level` |
| Sidebar right border | `#383838` | same rule, `border-color: #383838 !important` |
| Sidebar item hover and active background | `#383838` | `.night-mode .active-page { background-color: #383838 !important }` |
| Sidebar active indicator (accent) | `#ff7585` | `.night-mode .active-page { box-shadow: inset 7px 0 0 #ff7585 !important }` |
| Sidebar toggler | `#383838` | `.night-mode .sidenav-toggler` |
| Sidebar toggler icon | `#c1c1c1` | `#mainNav.fixed-top.navbar-light .sidenav-toggler a i { color: #c1c1c1 }` |
| Buttons, nav links, dropdown items text | `#c1c1c1` | `.night-mode .btn, .night-mode .nav-link, .night-mode .dropdown-item { color: #c1c1c1 !important }` |
| Card border | `#383838` | `.night-mode .card { border: 2px solid; border-color: #383838 }` |
| Form control text | `#ced4da` | `.night-mode .form-control { color: #ced4da; background-color: #333131; border: 1px solid #ced4da }` |
| Form control focus border | `#80bdff` | `.night-mode .form-control:focus { border-color: #80bdff }` |
| Placeholder | `#b1bac4` | `.night-mode ::placeholder` |
| Muted text | `#8f9ba5` | `.night-mode .text-muted { color: #8f9ba5 !important }` |
| `a.text-dark` | `#8f9ba5`, hover `#d1d1d1` | `.night-mode a.text-dark`, `.night-mode a.text-dark:hover` |
| Discrete link hover | `#83c6ff` | `.night-mode a.discrete-link:not(.nav-link):hover` |
| Discrete link focus | `#ffa8af` | `.night-mode a.discrete-link:focus` |
| Light button, input group text | `#292b2a` | `.night-mode .btn-light, .night-mode .input-group-text` |
| Info button | `#0c5f6e` | `.night-mode .btn-info` |
| Outline info button | `#1ed1ee` | `.night-mode .btn-outline-info` |
| Warning button | `#a9810a` | `.night-mode .btn-warning` |
| Danger button and alert | `#6f1b23` | `.night-mode .btn-danger, .night-mode .alert-danger` |
| Success button | `#17642a` | `.night-mode .btn-success` |
| Table info and alert info | `#07373f` | `.night-mode .table-info, .night-mode .alert-info` |
| Table danger | `#471116` | `.night-mode .table-danger` |
| Table warning | `#473604` | `.night-mode .table-warning` |
| Table secondary | `#4c4e50` | `.night-mode .table-secondary td` |
| Row group and active tab | `#2f3031` | `.night-mode table.dataTable tr.dtrg-group td, .night-mode .nav-tabs .nav-link.active` |
| Toast success | `#092810` | `.night-mode .toast-success` |
| Toast error | `#471015` | `.night-mode .toast-error` |
| Modal border | `rgba(186,189,189,0.66)` | `.night-mode .modal-content` |
| Modal footer border | `#6f7173` | `.night-mode .modal-footer` |
| QR code background | `#eeeeee` | `.night-mode .qr-code` |

The web app manifest uses `#333131` for `background_color` and `theme_color`
in both modes (`controllers/SystemController.php` lines 55-56).

The night mode switch has three user setting values: `on`, `off`, and
`follow-system`. The function `CheckNightMode()` in
`public/js/grocy_nightmode.js` reads them. With `follow-system`, it uses
`window.matchMedia("(prefers-color-scheme: dark)").matches`. A user who is
not logged in always follows the system. A second setting,
`auto_night_mode_enabled`, turns night mode on inside a time range
(`auto_night_mode_time_range_from`, `auto_night_mode_time_range_to`, and
`auto_night_mode_time_range_goes_over_midnight`). The time range wins over
`on` and `off` and loses to `follow-system`.

Sources: `public/css/grocy_night_mode.css`, `views/layout/default.blade.php`,
`public/js/grocy_nightmode.js`, `controllers/SystemController.php` in the
Grocy repository at `v4.7.1`.

## 2. The Grocy type

| Fact | Value | Source |
| --- | --- | --- |
| Font family | `'Roboto', sans-serif` | `grocy.css`: `body { font-family: 'Roboto', sans-serif }` |
| Font weights loaded | 400, 500, 700 | `views/layout/default.blade.php` lines 27-31: `@fontsource/roboto/400.css`, `500.css`, `700.css` |
| Font package | `@fontsource/roboto` 5.3.0 | `yarn.lock`; Fontsource lists Roboto under the OFL-1.1 licence |
| Base font size | `1rem` (16px at the browser default) | Bootstrap `$font-size-base: 1rem` |
| Base line height | 1.5 | Bootstrap `$line-height-base: 1.5` |
| Content font size | `0.85rem` | `grocy.css`: `.content-text { font-size: 0.85rem }`; the main content column has this class (`default.blade.php` line 692: `<div class="col content-text fa-width-auto">`) |
| Heading sizes | h1 2.5rem, h2 2rem, h3 1.75rem, h4 1.5rem, h5 1.25rem, h6 1rem | Bootstrap `$h1-font-size` to `$h6-font-size` |
| Heading weight | 500 | Bootstrap `$headings-font-weight: 500` |
| Page title element | `<h2 class="title">` | `views/stockoverview.blade.php` line 15 |
| Small text | `.875em` | Bootstrap `$small-font-size` |
| Extra small button | `0.875rem`, padding `0.25rem 0.4rem`, line height 0.5 | `grocy.css`: `.btn-xs` |
| Time-ago text | `0.8em`, italic | `grocy.css`: `.timeago-contextual` |
| Card header icons | `22px` | `grocy.css`: `.grocy-card .card-icons a { font-size: 22px }` |
| Related links buttons | `14px` | `grocy.css`: `.related-links .btn { font-size: 14px }` |
| Larger text helper | `125%` | `grocy.css`: `.text-larger` |
| Validation feedback in content | `95%` | `grocy.css`: `.content-text .invalid-feedback` |
| Tab labels | uppercase | `grocy.css`: `.grocy-tabs .nav-link { text-transform: uppercase }` |

Sources: `public/css/grocy.css`, `views/layout/default.blade.php`,
`views/stockoverview.blade.php`, `yarn.lock` in the Grocy repository at
`v4.7.1`; `scss/_variables.scss` in the Bootstrap repository at `v4.6.2`;
the Fontsource page for Roboto.

## 3. The Grocy layout

### 3.1 The top bar

- The top bar is `<nav id="mainNav" class="navbar navbar-expand-lg
  navbar-light fixed-top">` (`default.blade.php` line 134-135).
- The body has the class `fixed-nav` with `padding-top: 54px`. An earlier
  rule in the same file sets 56px; the later 54px rule wins
  (`grocy_menu_layout.css`).
- The top bar has `line-height: 1`, `padding-bottom: 0.3rem`, and a 2px
  bottom border. Its side padding is `0.25rem` below 992px and `0.75rem` on
  the left at 992px and above.
- The brand link is 250px wide at 992px and above, and 130px when the
  sidebar is collapsed. It holds `public/img/logo.svg`.
- In embedded mode (`body.embedded`), the top padding is 0.

### 3.2 The sidebar

- The sidebar is `<ul class="navbar-nav navbar-sidenav">` inside the
  collapsing `navbar-collapse` block of the top bar (`default.blade.php`
  lines 159-161). It is part of the nav element, not a separate element.
- At 992px and above, the sidebar is `position: absolute` at the left edge.
  Each `nav-item` is 250px wide. The sidebar starts 46px below the top (a
  later rule overrides 56px). Its height is `calc(100vh - 94px)`.
- The content wrapper has `margin-left: 245px` at 992px and above. An earlier
  rule sets 250px; the later 245px rule wins.
- Each sidebar link has `padding: 0.75em` and `padding-right: 1.25em`.
  Second-level links have `padding-left: 2.75em`, third-level `3.75em`.
- The active item has an inset 7px bar on the left in `#337ab7` and a
  `#d6d6d6` background. Hover and focus use the same style.
- Collapsed sidebar: `body.sidenav-toggled` sets the sidebar, every item,
  and every link to 55px wide. The link text (`.nav-link-text`) is hidden.
  Tooltips (`.navbar-sidenav-tooltip`) show. The content wrapper has
  `margin-left: 55px`. The toggler (`.sidenav-toggler`) sits at the bottom
  of the sidebar at `margin-top: calc(100vh - 48px)`. The toggler icon is
  mirrored with `transform: scaleX(-1)`.
- The sidebar hides overflow and shows a scroll bar only on hover
  (`.navbar-sidenav:hover { overflow-y: auto }`).

### 3.3 The tables

- The stock overview table and the shopping list table have the classes
  `table table-sm table-striped nowrap w-100` (`views/stockoverview.blade.php`
  line 159, `views/shoppinglist.blade.php` line 193).
- Bootstrap `table-sm` sets the cell padding to `0.3rem`. The default
  `.table` cell padding is `0.75rem`. Cells have a 1px top border in
  `#dee2e6`.
- Grocy sets `.dataTable td { vertical-align: middle !important }`.
- Grocy hides the DataTables search box and the info line
  (`.dataTables_filter, .dataTables_info { display: none }`) and uses its own
  filter row.
- Row groups (`tr.dtrg-group`) have `cursor: pointer`. Columns with
  `.fit-content` have `white-space: nowrap; width: 1%`.
- The DataTables packages in use: `datatables.net` 1.10, `colreorder`,
  `rowgroup`, and `select`, each with the `bs4` styling package
  (`package.json`).

### 3.4 The phone layout

- The viewport meta is `width=device-width, initial-scale=1`
  (`default.blade.php` line 9-10).
- The breakpoint is the Bootstrap `lg` breakpoint, 992px, from the
  `navbar-expand-lg` class. The Bootstrap grid breakpoints are sm 576px, md
  768px, lg 992px, xl 1200px.
- Below 992px the sidebar is inside the collapsed `navbar-collapse` block. A
  `navbar-toggler` button (hamburger icon) opens it. The open block has
  `max-height: 75vh` and scrolls. The sidebar text is right-aligned. The
  active item bar moves to the right edge (`box-shadow: inset -10px 0 0
  #337ab7`). The content wrapper has no left margin.
- The row action menu (`.table-inline-menu.dropdown-menu`) is `96vw` wide
  below 400px and 400px wide at 400px and above.
- The table filter row (`#table-filter-row`) is collapsed below the md
  breakpoint and opens with a filter button that has `d-md-none`
  (`views/stockoverview.blade.php` lines 75-80). Filter controls stack with
  an 8px gap below 768px.
- The helper `.width-xs-sm-100` sets `width: 100%` below 767.98px.
- Forms have a sticky footer (`.sticky-form-footer`) fixed at the bottom
  with `z-index: 1030`. The last form group gets `padding-bottom: 2rem` to
  stay clear of it.
- Modals are 650px wide for forms, 800px for `.wider`, and 90% for `.table`
  at 576px and above. Modal body padding is `0.75rem`.
- The camera barcode scanner container has `max-height: 90vh` and the live
  stream is `width: 100%`.

Sources: `public/css/grocy.css`, `public/css/grocy_menu_layout.css`,
`views/layout/default.blade.php`, `views/stockoverview.blade.php`,
`views/shoppinglist.blade.php`, `package.json` in the Grocy repository at
`v4.7.1`; `scss/_variables.scss` and `dist/css/bootstrap.css` in the
Bootstrap repository at `v4.6.2`.

## 4. The Grocy icon set

- Package: `@fortawesome/fontawesome-free`, version 7.3.1 in `yarn.lock`
  (`package.json` range `^7.3.1`). The npm description is "The iconic font,
  CSS, and SVG framework". The npm licence field is `(CC-BY-4.0 AND OFL-1.1
  AND MIT)`.
- Grocy links two CSS files: `css/fontawesome.min.css` and
  `css/solid.min.css` (`default.blade.php` lines 35-38). It does not link
  the regular or the brands style.
- The views use the class `fa-solid` 422 times and `fa-regular` or
  `fa-brands` 0 times (counted with `grep` over `views/`).
- The Grocy CSS uses the font family name `'Font Awesome 7 Free'` and the
  glyph codes `\f105` (angle right) and `\f107` (angle down) for the sidebar
  and dropdown chevrons (`grocy_menu_layout.css`, `grocy.css`).
- Grocy adds one custom glyph, `.fa-custom-sigma-sign`, with the content
  `\03a3` in a sans-serif font (`grocy.css`).
- Logo files: `public/img/logo.svg` (top bar), `public/img/icon.svg`,
  `public/img/icon-32.png` (favicon, `sizes="32x32"`), and
  `public/img/icon-1024.png` (manifest icon). The SVG fill is `#337ab7`.

Sources: `package.json`, `yarn.lock`, `views/layout/default.blade.php`,
`public/css/grocy.css`, `public/css/grocy_menu_layout.css`, `public/img/`
in the Grocy repository at `v4.7.1`; the npm registry for
`@fortawesome/fontawesome-free`.

## 5. How a shadcn/ui theme is defined on Tailwind 4

### 5.1 The packages (npm, 2026-11-05)

| Package | Latest | Fact |
| --- | --- | --- |
| `shadcn` | 4.23.0 | Published 2026-10-27. The CLI and a runtime package. Its `exports` include `./tailwind.css`, `./utils`, `./preset`, `./schema`, `./registry`, `./icons`, and `./mcp`. |
| `@base-ui/react` | 1.9.0 | Base UI release v1.9.0 is dated 2026-10-09. Peer range `react ^17 || ^18 || ^19`. |
| `tailwindcss` | 4.3.4 | The repo has `^4.3.3`. |
| `@tailwindcss/vite` | 4.3.4 | The Vite plugin for Tailwind 4. |
| `tw-animate-css` | 1.4.0 | Replaces `tailwindcss-animate`. |
| `lucide-react` | 1.69.0 | The icon library named in `components.json`. ISC licence. The repo has `^1.66.0`. |
| `cn` | 0.5.2 (repo) | The manual install page adds `cn` and re-exports it: `export { cn } from "cn"`. |
| `@fontsource-variable/geist` | 5.3.0 | The font that `apps/web/src/styles.css` imports. |

Sources: `npm view <name> version` for each package on 2026-11-05;
`apps/web/package.json` in this repo; the Base UI releases page; the Lucide
docs.

### 5.2 The CSS file

The shadcn/ui manual installation page gives the CSS file. The repo file
`apps/web/src/styles.css` has the same structure. Its parts, in order:

1. Imports: `@import "tailwindcss";`, `@import "tw-animate-css";`,
   `@import "shadcn/tailwind.css";`. The repo file also imports
   `@fontsource-variable/geist`.
2. The dark variant: `@custom-variant dark (&:is(.dark *));`.
3. A `@theme inline` block. It maps each theme variable to a Tailwind
   namespace: `--color-background: var(--background);` and so on for every
   colour, `--radius-sm` to `--radius-4xl` as `calc()` of `--radius`, and
   `--font-sans`.
4. A `:root` block with the light values.
5. A `.dark` block with the dark values.
6. A `@layer base` block: `* { @apply border-border outline-ring/50; }` and
   `body { @apply bg-background text-foreground; }`.

The theming page states the naming rule: "The background suffix is omitted
for the surface token. For example, `primary` pairs with
`primary-foreground`." The base token is the surface colour. The
`-foreground` token is the text and icon colour on that surface.

### 5.3 The CSS variables

The theming page lists these variables, 32 in total:

- `--radius`
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`
- `--border`, `--input`, `--ring`
- `--chart-1` to `--chart-5`
- `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`,
  `--sidebar-primary-foreground`, `--sidebar-accent`,
  `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`

The repo file defines all 32 plus `--font-sans` and `--font-heading`.

### 5.4 The colour space

The default values are oklch, for example `--primary: oklch(0.205 0 0)`. The
Tailwind v4 page of shadcn/ui says: "HSL colors are now converted to OKLCH."
The Tailwind 4 default palette is also oklch, for example
`--color-red-500: oklch(63.7% 0.237 25.331)`. The `.dark` block in the
template uses alpha for borders: `--border: oklch(1 0 0 / 10%)`.

The `tailwind.baseColor` field picks the default values. The allowed values
are `neutral`, `stone`, `zinc`, `mauve`, `olive`, `mist`, and `taupe`. The
repo uses `neutral`. The docs say the base colour "cannot be changed after
initialization" by the CLI; the values are plain CSS and can be edited by
hand.

### 5.5 `@theme` and `@theme inline`

The Tailwind docs state: "Theme variables are special CSS variables defined
using the `@theme` directive that influence which utility classes exist in
your project." A variable in the `--color-*` namespace creates `bg-*`,
`text-*`, `border-*`, and the other colour utilities. The other namespaces
are `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`,
`--leading-*`, `--breakpoint-*`, `--container-*`, `--spacing-*`,
`--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`,
`--blur-*`, `--perspective-*`, `--zoom-*`, `--aspect-*`, `--ease-*`, and
`--animate-*`.

The `inline` option is for "theme variables that reference other variables".
With `inline`, "the utility class will use the theme variable value instead
of referencing the actual theme variable". Without it, "your utility classes
might resolve to unexpected values because of how variables are resolved in
CSS". This is why the shadcn/ui template keeps the colour values on `:root`
and `.dark`, and maps them in `@theme inline`.

`@theme static` emits every theme variable in the output CSS. By default,
Tailwind emits only the variables that are used.

### 5.6 Light and dark mode

- Tailwind default: the `dark:` variant follows the `prefers-color-scheme`
  media feature.
- Class override: `@custom-variant dark (&:where(.dark, .dark *));` in the
  Tailwind docs. The shadcn/ui template uses `@custom-variant dark (&:is(.dark
  *));`. With either line, "`dark:*` utilities ... will be applied whenever
  the `dark` class is present earlier in the HTML tree".
- Attribute override: `@custom-variant dark (&:where([data-theme=dark],
  [data-theme=dark] *));`.
- The shadcn/ui dark mode page for Vite gives a `ThemeProvider` component.
  It holds a `theme` value of `"light"`, `"dark"`, or `"system"`. It stores
  the value in `localStorage` under the key `"vite-ui-theme"`. A
  `useEffect` removes the classes `light` and `dark` from
  `document.documentElement` and adds the active one. For `"system"`, it
  reads `window.matchMedia("(prefers-color-scheme: dark)").matches`. The
  effect does not listen for a later change of the system setting. A
  `ModeToggle` dropdown offers Light, Dark, and System.
- The Tailwind docs give an inline script for the `<head>` that sets the
  class before the first paint, from `localStorage.theme` and `matchMedia`.

### 5.7 The `components.json` fields

The schema is `https://ui.shadcn.com/schema.json`. The fields, from the
components.json docs page and the schema file:

| Field | Values | Meaning |
| --- | --- | --- |
| `$schema` | `https://ui.shadcn.com/schema.json` | The JSON schema. |
| `style` | One of 26 values in the schema: `default`, `new-york`, and `{library}-{style}` for the libraries `radix`, `base`, `aria` and the styles `vega`, `nova`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`. | The component style. "This cannot be changed after initialization." `default` is deprecated. The repo uses `base-nova`. |
| `rsc` | `true`, `false` | React Server Components. `true` adds `use client` to client components. |
| `tsx` | `true`, `false` | TypeScript or JavaScript files. |
| `tailwind.config` | path or `""` | For Tailwind 4, "leave this blank". |
| `tailwind.css` | path | The CSS file that imports Tailwind. The repo uses `src/styles.css`. |
| `tailwind.baseColor` | `neutral`, `stone`, `zinc`, `mauve`, `olive`, `mist`, `taupe` | The default theme tokens. Not changeable by the CLI after init. |
| `tailwind.cssVariables` | `true`, `false` | `true` uses the semantic tokens. `false` uses inline Tailwind colour utilities. Not changeable by the CLI after init. |
| `tailwind.prefix` | string | A utility prefix such as `tw-`. |
| `iconLibrary` | string | The icon library. The repo uses `lucide`. The docs page does not describe this field. |
| `rtl` | boolean | Right-to-left support. The docs page does not describe this field. |
| `aliases.components`, `aliases.ui`, `aliases.lib`, `aliases.hooks`, `aliases.utils` | import paths | Where the CLI writes and how it rewrites imports. Backed by `tsconfig` `paths` or `package.json#imports`. |
| `menuColor` | `default`, `inverted`, `default-translucent`, `inverted-translucent` | In the schema enum. The docs page does not describe this field. The repo uses `default`. |
| `menuAccent` | `subtle`, `bold` | In the schema enum. The docs page does not describe this field. The repo uses `subtle`. |
| `registries` | object keyed by `@name` | Each value is a URL template with `{name}`, or an object with `url`, `headers`, and `params`. `${VAR_NAME}` expands from the environment. |

Sources: the shadcn/ui pages Theming, Dark Mode (Vite), Tailwind v4,
components.json, Installation (Manual), Installation (Vite); the schema file
`https://ui.shadcn.com/schema.json`; the Tailwind docs pages Theme Variables
and Dark Mode; `apps/web/components.json` and `apps/web/src/styles.css` in
this repo.

## 6. The shadcn/ui components on Base UI

### 6.1 The component list

The shadcn/ui components page lists 66 components: Accordion, Alert, Alert
Dialog, Aspect Ratio, Attachment, Avatar, Badge, Breadcrumb, Bubble, Button,
Button Group, Calendar, Card, Carousel, Chart, Checkbox, Code Block,
Collapsible, Combobox, Command, Context Menu, Data Table, Date Picker,
Dialog, Direction, Drawer, Dropdown Menu, Empty, Field, Hover Card, Input,
Input Group, Input OTP, Item, Kbd, Label, Marker, Menubar, Message, Message
Scroller, Native Select, Navigation Menu, Pagination, Popover, Progress,
Questionnaire, Radio Group, Resizable, Scroll Area, Select, Separator, Sheet,
Sidebar, Skeleton, Slider, Spinner, Switch, Table, Tabs, Textarea, Toast,
Toggle, Toggle Group, Tooltip, Trace, Typography. Code Block and Trace are
marked "New".

Each component page has three tabs: Base UI, React Aria, and Radix UI. The
URLs are `/docs/components/base/<name>`, `/docs/components/aria/<name>`, and
`/docs/components/radix/<name>`.

The changelog entry "July 2026 - Base UI as the Default" states: "New
projects now use Base UI by default. Radix is still fully supported." and
"Radix is not being deprecated". Every update ships for both libraries
"unless it only exists in Base UI". The reasons given: Base UI "is at 1.6.0
with 6M+ weekly downloads" and "Projects created on shadcn/create now pick
Base UI over Radix 2 to 1". A new project opts into Radix with `pnpm dlx
shadcn init -b radix`. A migration skill (`pnpm dlx skills add shadcn/ui`)
moves one component at a time.

Base UI itself (`@base-ui/react`) lists 37 components: Accordion, Alert
Dialog, Autocomplete, Avatar, Button, Checkbox, Checkbox Group, Collapsible,
Combobox, Context Menu, Dialog, Drawer, Field, Fieldset, Form, Input, Menu,
Menubar, Meter, Navigation Menu, Number Field, OTP Field, Popover, Preview
Card, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Switch,
Tabs, Toast, Toggle, Toggle Group, Toolbar, Tooltip. The quick start says
"All components are included in a single package." It asks for `isolation:
isolate` on the application root element, and `body { position: relative }`
for Safari on iOS 26 and later.

### 6.2 The components that the scan screens and the review queue need

| Need | shadcn/ui component | Base UI status | Facts |
| --- | --- | --- | --- |
| Data table with row selection | Data Table | Has a Base UI page. | A guide, not a component: "instead of a data-table component, I thought it would be more helpful to provide a guide on how to build your own." Built on TanStack Table: "This guide uses TanStack Table v9". Install `@tanstack/react-table` (9.3.1 on npm). Row selection: register `rowSelectionFeature`, hold a `rowSelection` state, header checkbox with `table.getIsAllPageRowsSelected()` and `table.toggleAllPageRowsSelected()`, row checkbox with `row.getIsSelected()` and `row.toggleSelected()`. Selected rows get a `data-state` attribute. The `Table` component (`add table`) gives `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`. |
| Dialog | Dialog | Has a Base UI page. API reference points to Base UI Dialog. | `add dialog`. Parts: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`. `showCloseButton={false}` hides the default close control. |
| Sheet | Sheet | Has a Base UI page. API reference points to Base UI Dialog. | `add sheet`. "Extends the Dialog component to display content that complements the main content of the screen." The `side` prop "Values are `top`, `right`, `bottom`, or `left`." |
| Select | Select | Has a Base UI page. API reference points to Base UI Select. | `add select`. Parts: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectItem`. The Base UI version has an `items` prop on `Select` and `alignItemWithTrigger` on `SelectContent`. |
| Combobox | Combobox | Has a Base UI page. API reference points to Base UI. A Radix page also exists. | `add combobox`. Parts: `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxEmpty`, `ComboboxList`, `ComboboxItem`; for multiple selection `ComboboxChips`, `ComboboxChip`, `ComboboxChipsInput`, `ComboboxValue`; for groups `ComboboxGroup`, `ComboboxLabel`, `ComboboxCollection`, `ComboboxSeparator`. |
| Command | Command | Has a Base UI page. | `add command`. "The `<Command />` component uses the cmdk component by Dip." `CommandDialog` wraps it in a dialog. |
| Toast | Toast | Has a Base UI page. API reference points to Base UI Toast. | `add toast`. `Toaster` goes in the root layout. Calls: `toast.add({ title, description })`, `toast.close(id)`, `toast.promise(...)` with `loading`, `success`, and `error` states. Base UI Toast has the parts `Toast.Provider`, `Toast.Viewport`, `Toast.Root`, `Toast.Title`, `Toast.Description`, `Toast.Action`, `Toast.Close`, the hook `useToastManager`, and `Toast.createToastManager()` for use outside the React tree. The changelog lists "Toast" under July 2026. |
| Sonner | Sonner | No Base UI page. `/docs/components/base/sonner` answers HTTP 308 to `/docs/components/base/toast`. | The Radix page exists: `add sonner`, `Toaster` from `@/components/ui/sonner`, `toast("...")` from the `sonner` package (2.0.8 on npm). The Radix Toast page says: "The toast component has been deprecated. Use the sonner component instead." The Base UI Toast page has no such notice. |
| Sidebar | Sidebar | Has a Base UI page. The `base-nova` registry item depends on `button`, `input`, `separator`, `sheet`, `skeleton`, `tooltip`, `use-mobile`. | `add sidebar`. Constants in `sidebar.tsx`: `SIDEBAR_WIDTH = "16rem"`, `SIDEBAR_WIDTH_MOBILE = "18rem"`, `SIDEBAR_WIDTH_ICON = "3rem"`, `SIDEBAR_KEYBOARD_SHORTCUT = "b"`, `SIDEBAR_COOKIE_NAME = "sidebar_state"`, cookie age 7 days. `MOBILE_BREAKPOINT = 768` in `use-mobile`. On mobile it renders inside a `Sheet`. `collapsible`: `offcanvas`, `icon`, `none`. `variant`: `sidebar`, `floating`, `inset` (wrap the content in `SidebarInset`). Uses the eight `--sidebar-*` variables. Widths can be set per instance with `--sidebar-width` and `--sidebar-width-mobile` on `SidebarProvider`. |

Sources: the shadcn/ui pages Components, Changelog (July 2026, Base UI as
the Default), Data Table, Table, Dialog, Sheet, Select, Combobox, Command,
Toast (Base UI and Radix tabs), Sonner (Radix tab), Sidebar; the registry
items `r/styles/base-nova/sidebar.json` and `r/styles/base-nova/use-mobile.json`;
the Base UI pages Quick start, Toast, Releases; `npm view` for
`@tanstack/react-table`, `sonner`, and `@base-ui/react`.

## 7. Installing a React app on a phone

### 7.1 The manifest

MDN: "A web application manifest ... is a JSON text file that provides
information about a web application." The top-level keys are called members.
"All members are optional in the specification, but some applications
require some members to be present."

The members on the MDN reference: `background_color`, `categories`,
`description`, `display`, `display_override`, `file_handlers`, `icons`,
`id`, `launch_handler`, `name`, `note_taking`, `orientation`,
`prefer_related_applications`, `protocol_handlers`, `related_applications`,
`scope`, `scope_extensions`, `screenshots`, `serviceworker`, `share_target`,
`short_name`, `shortcuts`, `start_url`, `theme_color`, and the
`*_localized` forms. MDN notes that `dir`, `lang`, and `iarc_rating_id` are
not implemented.

The page links the manifest with `<link rel="manifest" href="manifest.json"
/>`. The MIME type is `application/manifest+json`; browsers also accept
`application/json`. If the manifest request needs credentials, the link
needs `crossorigin="use-credentials"`, also on the same origin.

### 7.2 The display mode

MDN: `display` "If not specified, the default value `browser` is used." The
values:

- `fullscreen`: "Opens the app with browser UI elements hidden and uses the
  entirety of the available display area."
- `standalone`: "Opens the app to look and feel like a standalone native
  app."
- `minimal-ui`: "Opens the app to look and feel like a standalone app but
  with a minimal set of UI elements for navigation."
- `browser`: "Opens the app in a conventional browser tab or new window".

"If a browser does not support the specified display mode, it follows a
pre-defined fallback chain: `fullscreen` → `standalone` → `minimal-ui` →
`browser`." `display_override` is an ordered list that the browser tries
before `display`.

### 7.3 The icons

MDN: each entry in `icons` has `src` (required), `sizes`, `type`, and
`purpose`. `sizes` is "`<width in pixels>x<height in pixels>`", space
separated for several sizes, or `any` for a vector image. `type` is a MIME
type such as `image/png`. `purpose` is `any` (default), `maskable`
("designed with icon masks and safe zone in mind"), or `monochrome` (the
browser "uses only the alpha channel as a mask over any solid fill"). "For
raster formats like PNG, specifying the exact available sizes is
recommended."

The Vite PWA minimal requirements page says it is "better to add 2 icons with
`any` and `maskable` purposes" than one icon with `purpose: 'any maskable'`.

### 7.4 What makes the app installable

MDN, "Making PWAs installable":

- "For a PWA to be installable it must be served using the `https`
  protocol, or from a local development environment using `localhost` or
  `127.0.0.1`".
- "Chromium-based browsers, including Google Chrome, Samsung Internet, and
  Microsoft Edge, require that the manifest includes the following members:"
  `name` or `short_name`; `icons` "must contain a 192px and a 512px icon";
  `start_url`; `display` and/or `display_override`;
  `prefer_related_applications` "must be `false` or not present".
- "If the PWA has more than one page, every page must reference the manifest
  in this way."
- Service worker: "While not a requirement for a PWA to be installable, many
  PWAs use service workers to provide an offline experience."
- Safari on macOS Sonoma (Safari 17) and later: Add to Dock "for any web app
  with or without a manifest file". "On iOS 16.4 and later, PWAs can be
  installed from the Share menu in Safari, Chrome, Edge, Firefox, and
  Orion." The `beforeinstallprompt` event "is not supported on iOS".
- "Firefox does not support installing PWAs using a manifest file."

The Chrome developers blog, "Update to the installability criteria": "we
have removed the requirement to have a service worker that implements the
`fetch()` method" "since version 108 on mobile and 112 on Desktop". "For now
the algorithm that displays the install prompt still requires the presence
of a `fetch()` handler." The web.dev install criteria page adds the `display`
value `window-controls-overlay` and the engagement rule: the user must click
or tap once and spend 30 seconds on the page before Chrome fires
`beforeinstallprompt`.

### 7.5 The Vite plugin

`vite-plugin-pwa` on npm: version 2.0.0, published 2026-10-03. Peer range
`vite: ^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`,
`workbox-build ^7.4.1`, `workbox-window ^7.4.1`, `@vite-pwa/assets-generator
^1.0.0 || ^2.0.0`. The current Vite is 8.3.6. The docs site is
`https://vite-pwa-org.netlify.app/`.

The plugin, from its guide: it will "Generate the web application manifest
and add it to your entry point", "Generate the service worker using the
`strategies` option", and "Generate a script to register the service worker
in the browser". It builds the service worker with the `workbox-build` Node
library. The minimal config is `VitePWA({ registerType: 'autoUpdate' })` in
the Vite `plugins` array.

Options:

- `strategies`: `generateSW` (default; "the `vite-plugin-pwa` will generate
  the service worker for you") or `injectManifest` ("compile your custom
  service worker and inject its precache manifest").
- `registerType`: `prompt` (default; "inform the user that there is a new
  version of the application, and let the user decide when to update it") or
  `autoUpdate` ("have the browser update the application when there is a new
  version").
- `injectRegister`: `inline`, `script`, `script-defer`, `null`, or `auto`
  (default). `auto` switches to `script` when the code imports no virtual
  module.
- `manifest`: the manifest object. Its `scope` defaults to the Vite `base`
  option.

The plugin's minimal requirements page lists what the entry HTML "must have":
the viewport meta, a title and description, a favicon, an
`apple-touch-icon` link, and a `theme-color` meta. The manifest "must have":
`name`, `short_name` (in the example), `description`, `theme_color` that
"must match" the meta, a 192x192 icon, and a 512x512 icon. The README lists
"Zero-Config", "auto inject Web App Manifest", "generate service worker with
offline support (via Workbox)", and support for React.

### 7.6 The current state of the web app in this repo

- `apps/web/index.html` has the viewport meta `width=device-width,
  initial-scale=1`, a `<title>Grocy Next</title>`, and a favicon link to
  `/favicon.ico`. It has no manifest link, no `theme-color` meta, no
  `apple-touch-icon`, and no description.
- `apps/web/package.json` has no PWA plugin and no service worker code.

### 7.7 How Grocy does it

Grocy serves a manifest at `/manifest` from
`controllers/SystemController.php`. The link is added only when the user is
authenticated, with `crossorigin="use-credentials"`. The manifest has `name`
and `short_name` set to `Grocy <page title>`, one icon
`./img/icon-1024.png` of `1024x1024` `image/png`, `start_url` set to the
current page, `background_color` and `theme_color` `#333131`, and `display`
`standalone`. The response `Content-Type` is `application/json`. Grocy has
no service worker.

Sources: the MDN pages Web app manifest, `display`, `icons`, Making PWAs
installable; the Chrome developers blog "Update to the installability
criteria"; the web.dev page "What does it take to be installable?"; the npm
registry for `vite-plugin-pwa` and `vite`; the Vite PWA guide pages Getting
Started, Register Service Worker, Service Worker Strategies and Behaviors,
PWA Minimal Requirements; the `vite-plugin-pwa` README; `apps/web/index.html`
and `apps/web/package.json` in this repo; `controllers/SystemController.php`,
`routes.php`, and `views/layout/default.blade.php` in the Grocy repository at
`v4.7.1`.

## Sources

Grocy at `v4.7.1`:

- https://github.com/grocy/grocy/blob/v4.7.1/public/css/grocy.css
- https://github.com/grocy/grocy/blob/v4.7.1/public/css/grocy_menu_layout.css
- https://github.com/grocy/grocy/blob/v4.7.1/public/css/grocy_night_mode.css
- https://github.com/grocy/grocy/blob/v4.7.1/views/layout/default.blade.php
- https://github.com/grocy/grocy/blob/v4.7.1/views/stockoverview.blade.php
- https://github.com/grocy/grocy/blob/v4.7.1/views/shoppinglist.blade.php
- https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/stockoverview.js
- https://github.com/grocy/grocy/blob/v4.7.1/public/js/grocy_nightmode.js
- https://github.com/grocy/grocy/blob/v4.7.1/controllers/SystemController.php
- https://github.com/grocy/grocy/blob/v4.7.1/routes.php
- https://github.com/grocy/grocy/blob/v4.7.1/package.json
- https://github.com/grocy/grocy/blob/v4.7.1/yarn.lock
- https://github.com/grocy/grocy/tree/v4.7.1/public/img

Bootstrap at `v4.6.2`:

- https://github.com/twbs/bootstrap/blob/v4.6.2/scss/_variables.scss
- https://github.com/twbs/bootstrap/blob/v4.6.2/scss/_tables.scss
- https://github.com/twbs/bootstrap/blob/v4.6.2/scss/mixins/_table-row.scss
- https://github.com/twbs/bootstrap/blob/v4.6.2/dist/css/bootstrap.css

shadcn/ui:

- https://ui.shadcn.com/docs/theming
- https://ui.shadcn.com/docs/dark-mode/vite
- https://ui.shadcn.com/docs/tailwind-v4
- https://ui.shadcn.com/docs/components-json
- https://ui.shadcn.com/schema.json
- https://ui.shadcn.com/docs/installation/manual
- https://ui.shadcn.com/docs/installation/vite
- https://ui.shadcn.com/docs/components
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://ui.shadcn.com/docs/components/base/data-table
- https://ui.shadcn.com/docs/components/base/table
- https://ui.shadcn.com/docs/components/base/dialog
- https://ui.shadcn.com/docs/components/base/sheet
- https://ui.shadcn.com/docs/components/base/select
- https://ui.shadcn.com/docs/components/base/combobox
- https://ui.shadcn.com/docs/components/base/command
- https://ui.shadcn.com/docs/components/base/toast
- https://ui.shadcn.com/docs/components/radix/toast
- https://ui.shadcn.com/docs/components/radix/sonner
- https://ui.shadcn.com/docs/components/base/sidebar
- https://ui.shadcn.com/r/styles/base-nova/sidebar.json
- https://ui.shadcn.com/r/styles/base-nova/use-mobile.json

Base UI:

- https://base-ui.com/react/overview/quick-start
- https://base-ui.com/react/overview/releases
- https://base-ui.com/react/components/toast

Tailwind CSS 4:

- https://tailwindcss.com/docs/theme
- https://tailwindcss.com/docs/dark-mode

Web app manifest and installation:

- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.chrome.com/blog/update-install-criteria
- https://web.dev/articles/install-criteria

Vite PWA plugin:

- https://www.npmjs.com/package/vite-plugin-pwa
- https://github.com/vite-pwa/vite-plugin-pwa/blob/main/README.md
- https://vite-pwa-org.netlify.app/guide/
- https://vite-pwa-org.netlify.app/guide/register-service-worker.html
- https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors.html
- https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html

Fonts and icons:

- https://fontsource.org/fonts/roboto
- https://www.npmjs.com/package/@fortawesome/fontawesome-free
- https://lucide.dev/guide/packages/lucide-react

npm versions, read with `npm view <name> version` on 2026-11-05: `shadcn`
4.23.0, `@base-ui/react` 1.9.0, `tailwindcss` 4.3.4, `@tailwindcss/vite`
4.3.4, `tw-animate-css` 1.4.0, `lucide-react` 1.69.0,
`@fontsource-variable/geist` 5.3.0, `@fontsource/roboto` 5.3.0,
`@fortawesome/fontawesome-free` 7.3.1, `@tanstack/react-table` 9.3.1,
`sonner` 2.0.8, `vite-plugin-pwa` 2.0.0, `vite` 8.3.6, `bootstrap` 5.3.8
(Grocy uses 4.6.2).
