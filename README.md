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

## Layout of the theme

| Path | What it is |
|---|---|
| `layout.jinja`, `header.jinja`, `footer.jinja` | Page shell, with bllor-ngo's colour, announcement bar and footer settings |
| `templates/` | One template per Vitrin route (all of Vitrin's required templates are present) |
| `sections/` | The three home sections, under their legacy file names |
| `components/products/donation-card.jinja` | The donation card used by every list, built from `donation-progress`, `donation-amount` and `units-picker` |
| `components/cart/donation-line.jinja` | One cart line, in the legacy cart markup that `assets/cart.css` styles |
| `components/quick-donation.jinja` | The floating quick donation widget |
| `assets/cart.js` | Add to cart, donate now and gift, on Vitrin's theme SDK (`window.zid`) |
| `assets/js.js` | Navigation, amount pickers, the amount cap and the donation availability window |
| `assets/cart-page.js`, `assets/quick-donation.js` | Cart page and quick donation behaviour |
| `locale/ar/LC_MESSAGES/messages.po` | Arabic strings (Vitrin compiles the `.po` itself) |

## What differs from the legacy theme, on purpose

- **Offline donations are no longer counted twice.** The legacy card showed
  `project_collected_amount + project_external_collected_amount`.
- **Cart lines are rendered by the theme.** Vitrin's built-in cart list draws a quantity
  dropdown with one option per unit of stock (up to 99,999 for quick donation, an open
  donation) and leaves the crowdfunding amount input without a handler.
- **Gift details use Vitrin's gift dialog** on the cart page, instead of the theme's own
  gift form, which posted to a catalog-only endpoint.
- **"Donate now" uses `zid.cart.buyNow`**: it empties the cart and adds this donation, then
  opens Vitrin's login or checkout dialog, or goes to `/checkout`.
- **The categories page reuses the server-rendered card**: each category loads its first
  opportunities from its own category page, instead of rebuilding the card in JavaScript.
- **Home tabs that point at the legacy `demo_products` placeholder are hidden.** Catalog
  filled them with a fake demo product.
- **A project with a start date but no end date is permanent once started**, and a project
  whose window is closed shows "View details" instead of an empty block.
- **Reviews, questions and blog pages exist.** Vitrin routes them to the theme and has no
  fallback.

## Running locally

Run Vitrin with this folder as its development theme (see Vitrin's README):

```bash
USE_DEVELOPMENT_THEME=True
DEVELOPMENT_THEME_ROOT=/path/to/bllor-ngo-theme
CACHE_ENABLED=False
HOST_OVERRIDE=l28xcc.zidtest.com   # a testing charity store with donation products
```

Locally, `asset_url` has no CDN base and renders `None/<version>/<file>`, so theme assets
404 unless something serves `assets/` at that path. Pages that call core's catalog API
(product, categories, cart, payment options) also need `API_TOKEN` in Vitrin's `.env`;
without it Vitrin redirects them to the login page.

Testing charity stores:

| Store | Use it for |
|---|---|
| `l28xcc.zidtest.com` (24037) | bllor-ngo store with 123 donation products, offline amounts and finished projects |
| `jjhh1.zidtest.com` (25689) | Open donations |
| `dc9rfw.zidtest.com` (28816) | Quick donation enabled, with its `zid-quick-donation` product |
| `test250.zidtest.com` (26476) | Quick donation enabled but no product: the widget must remove itself |

## Before publishing

Run Vitrin's theme validation (`/validate` on a dev store) and check every required
template passes. The only expected warning is `options` on the header's `checkboxes`
setting, which the theme editor needs.
