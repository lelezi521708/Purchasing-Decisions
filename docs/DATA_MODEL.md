# Data model

## `pricewatch_history`

One document represents one product, one merchant, and one collection batch.

| Field | Meaning |
|---|---|
| `schemaVersion` | Current schema version, `1` |
| `batchId` | ISO string identifying the collection batch |
| `productCode` | Stable product identifier, including the leading `P` |
| `merchantCode` | Stable merchant code such as `AEON` or `PARKNSHOP` |
| `name`, `brand` | Primary display fields |
| `nameEn`, `brandEn` | English display fields when available |
| `category1`, `category2`, `category3` | Hierarchical category fields |
| `price` | Positive HKD number or `null` |
| `offerText`, `offerTextEn` | Original offer text |
| `offersRaw` | Preserved raw offer entries |
| `collectedAt` | BSON Date for the local collection time |

The recommended unique index is:

```javascript
{ batchId: 1, productCode: 1, merchantCode: 1 }
```

## `pricewatch_batches`

The batch ledger records only successfully validated collections for current and history queries.

Important fields include `_id`/`batchId`, `status`, `collectedAt`, `completedAt`, `productCount`, `merchantCount`, `recordCount`, and `quotedRecordCount`.

## Query rules

- Current/category pages select the newest successful batch first, then query its matching history records.
- History pages use several successful batches in chronological order.
- An absent quote remains absent; it is never converted to zero.
- Display-name repair is done in the formatting layer and does not mutate stored records.

## Favorites

Favorites are not MongoDB data. They are stored in the same browser origin under:

```text
pricewatch:favorites:v1
```

Each item has `{ productCode, name }`. Product codes are normalized to uppercase for de-duplication and synchronization.
