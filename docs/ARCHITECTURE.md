# Architecture

## Runtime services

| Service | Container | Purpose |
|---|---|---|
| Node-RED | `comp7503-nodered` | Data collection, normalization, queries, HTTP routes, Dashboard UI |
| MongoDB | `comp7503-mongo` | Successful batch ledger and normalized price history |
| Browser | local browser | Dashboard rendering and browser-local Favorites |

Both containers join `comp7503-net`. MongoDB is addressed from Node-RED as `comp7503-mongo:27017`, not as `localhost`.

## Data flow

1. A scheduled Node-RED flow checks whether a successful batch is required.
2. The official JSON is requested and validated.
3. Product names, categories, merchant codes, prices, and offer text are normalized.
4. Nine merchant records are written for each product in `pricewatch_history`; missing quotes remain `null`.
5. A successful batch is recorded in `pricewatch_batches` only after validation.
6. Dashboard queries always start from the latest successful batch for current/category views.
7. History analysis reads multiple successful batches and preserves actual collection timestamps.
8. Favorites are kept in the browser with the shared `window.PriceWatchFavorites` API.

## Dashboard routes

| Route | View |
|---|---|
| `/dashboard/prices` | Latest product search and merchant price comparison |
| `/dashboard/categories` | Category comparison, savings distribution, offers, and favorites |
| `/dashboard/history` | Product history, trends, and favorites |

## Design choices

- Current views never mix different batches on one screen.
- Product comparison uses stable product codes instead of display names.
- Display-only name repair never writes back to MongoDB.
- The UI treats missing prices as missing data rather than zero.
- Dashboard CSS uses module prefixes such as `.pw-b-*` and `.pw-c-*` to avoid global collisions.
