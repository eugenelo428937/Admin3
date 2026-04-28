# Multiple Discount Price Resolution

## Background

`orders/management/commands/import_orders_from_csv.py` imports historical
orders from `docs/misc/orders_26.csv`. The CSV has three discount-flag
columns — `retaker`, `additional`, `reducerate` — any of which can be `T`.
Each flag maps to a `store.Price.price_type`:

| CSV column | `price_type` |
|------------|--------------|
| `retaker=T`    | `retaker`    |
| `additional=T` | `additional` |
| `reducerate=T` | `reduced`    |
| all `F`        | `standard`   |

## Open questions

1. **Multiple flags `T` simultaneously** — the current importer writes a
   placeholder `actual_price = 999` and `orders.total_amount = 9999` so the
   import can complete. We have not yet defined a resolution rule. Possible
   strategies:
   - Precedence order (e.g., `retaker > reduced > additional`) with a
     warning logged.
   - Compose a combined price (e.g., sum of discounts off standard) — needs
     product-owner input.
   - Reject the row in validation and require manual data fix upstream.
2. **Missing Price row** — if a CSV line needs `retaker` but the
   `store.Price` table has no `retaker` row for that purchasable, do we
   (a) fall back to `standard`, (b) skip the line, or (c) fail the import?
3. **`orders.total_amount` reconciliation** — today we write `9999` per
   order. Once per-item prices are resolved we must sum them into
   `subtotal`/`total_amount` (VAT is out of scope for legacy import).

## Next step

Decide the precedence/composition rule with the product owner, then replace
the placeholder logic in `resolve_price_type_and_amount()` inside
`orders/management/commands/import_orders_from_csv.py` and backfill
`actual_price` + `orders.total_amount` across already-imported rows.
