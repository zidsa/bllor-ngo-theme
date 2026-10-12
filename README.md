# bllor-ngo theme for Vitrin

A Jinja port of the legacy catalog NGO theme **bllor-ngo** (legacy code `default-ngo`,
production theme id `60f18ebd-4e60-46a0-a2d5-97d454c4b609`), used by charity stores.

The port keeps bllor-ngo's markup, CSS class names and setting ids, and replaces the
catalog-only parts (the `zid.store.*` JS SDK, catalog helpers and platform includes) with
their Vitrin equivalents.

## Why the setting ids must not change

Stores are moved by extension-backend's `sync_old_settings`, which copies each merchant's
legacy settings into this theme **verbatim**: the same setting ids, and the same file names
(`modules/x.twig` becomes `sections/x.jinja`). Renaming a setting or a section file
silently drops that merchant's value at migration.

| File | Setting ids carried over |
|---|---|
| `layout.jinja` | `colors_*`, `donate_money_default_money`, `donate_money_money_list`, `quick_donate_*` |
| `header.jinja` | `announcement_bar_*`, `header_options`, `header_search_placeholder` |
| `footer.jinja` | `about_us_title`, `about_us_des`, `links_1_*`, `certificates_*` |
| `sections/category-products.jinja` | `title`, `products[]` (`title`, `products`, `display_more`, `more_text`) |
| `sections/main-slider.jinja` | `slider[]` (`image`, `url`) |
| `sections/partners.jinja` | `title`, `store_partners[]` (`image`, `url`) |

Layout, header and footer schemas use groups and fieldsets. Vitrin stores their values
flat, joining the ids with `_`, so group `donate` > fieldset `money` > field
`default_money` is read as `settings.donate_money_default_money`.

## Donation rules the templates follow

A donation is a product priced at 1 whose quantity is the amount donated.

- `project_collected_amount` already includes `project_external_collected_amount`.
  Never add the two (the legacy theme did, and showed offline money twice).
- The "can donate" check uses `has_remaining_amounts` / `has_remaining_units` or
  `is_open_donation`, because the explicit remaining fields are `null` when the merchant
  hides them.
- Open donations have no goal and no progress bar.
- A project is complete only when the percentage is exactly 100.

## Running locally

Run Vitrin with this folder as its development theme (see Vitrin's README):

```bash
USE_DEVELOPMENT_THEME=True
DEVELOPMENT_THEME_ROOT=/path/to/bllor-ngo-theme
CACHE_ENABLED=False
HOST_OVERRIDE=l28xcc.zidtest.com   # a testing charity store with donation products
```
