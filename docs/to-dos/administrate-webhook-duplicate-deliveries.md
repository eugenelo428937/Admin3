# Administrate Webhook: Duplicate Deliveries for Single User Edit

## Problem

A single user edit on an Administrate event (observed: changing `lmsStart` via
Administrate's admin UI) fires the `Event Updated` webhook **twice**, ~1 second
apart. Both deliveries land cleanly (`status='applied'`) but the second apply is
a no-op write that consumes:

- One Administrate API rate-limit slot per duplicate
- One DB transaction per duplicate (`TutorialEvents.save()` + `Event.update_or_create()`)
- One audit-log entry per duplicate

The current dedup constraint at
[webhook_inbox.py:62-70](../backend/django_Admin3/administrate/models/webhook_inbox.py#L62-L70)
correctly **does not** collapse these — `(administrate_webhook_id,
entity_external_id, administrate_event_timestamp)` differs because the
`triggered_at` timestamps are 1 second apart. From Administrate's side, these
genuinely are two distinct events.

## Forensic Evidence (Inbox rows 34 & 35)

Both rows: same `administrate_webhook_id` (`T3V0Ym91bmRIb29rOjE=`), same
`entity_external_id` (`Q291cnNlOjk1MDA=`), same `webhook_type_name`
(`Event Updated`), both `applied`.

**Field-level diff of `raw_payload`** — only three values differ, all of them
are time/identity, not business state:

| Field | Row 34 | Row 35 | Δ |
|---|---|---|---|
| `metadata.triggered_at` | `11:25:53.000000Z` | `11:25:54.000000Z` | +1s |
| `metadata.sent_at` | `11:25:54.731973Z` | `11:25:55.970298Z` | +1.2s |
| `payload.node.updatedAt` | `11:25:53.616861Z` | `11:25:54.887850Z` | +1.3s |

Every other field in `payload.node` (`lifecycleState`, `lmsStart`, `lmsEnd`,
`customFieldValues`, places, FKs, …) is byte-identical between the two rows.

Conclusion: Administrate wrote the row twice on its side (visible via two
distinct `updatedAt` values), and each write fired an independent delivery
(distinct Sentry trace IDs, distinct HMAC signatures).

## Root Cause Analysis (Hypotheses)

Likely upstream causes — none confirmed:

1. **Two-phase save on date fields**: Administrate's UI may write LMS dates in
   two steps (raw value → normalized/projected value with timezone), each
   triggering a separate `UPDATE` and webhook.
2. **Post-save hook on Administrate's side** that touches a derived field
   (registration deadline, computed duration, etc.) within seconds.
3. **Our own automation loop** — unlikely given Sentry traces are distinct, but
   worth sanity-checking that no Admin3-side code calls back into Administrate
   in response to the first webhook.

## Solution: Two-Step Plan

### Step 1 (zero-risk cleanup): Remove `updatedAt` from the GraphQL query

The `updatedAt` field is requested in `EVENT_WEBHOOK_QUERY` at
[administrate_webhooks.py:54](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py#L54)
but **not consumed anywhere** in our codebase:

```bash
grep -rn "updatedAt" administrate/ tutorials/ --include='*.py'
# Only hit: administrate/management/commands/administrate_webhooks.py:54
# (the query string itself; map_node_to_tutorial_event_fields never reads it)
```

**Effect of removal:**
- Administrate stops serializing/signing the field on every delivery
  (marginal — a few bytes saved)
- More importantly: two consecutive deliveries for content-equivalent state
  produce **byte-identical `payload.node`**, which is the precondition for
  trivial content-hash dedup in Step 2
- Does NOT fix the double-fire — Administrate still sends two HTTP requests
  and still spends two rate-limit slots

**Apply via:**
```bash
# 1. Remove `updatedAt` from EVENT_WEBHOOK_QUERY constant
# 2. Re-register webhooks (idempotent — updates existing rather than creating)
python manage.py administrate_webhooks register
```

### Step 2 (optional, after Step 1): Intake-time content-hash dedup

With `updatedAt` removed, the per-delivery diff is reduced to envelope metadata
(`metadata.triggered_at`, `metadata.sent_at`, `Sentry-Trace`, HMAC signature)
that lives **outside** `payload.node`. So `hash(payload['node'])` becomes a
stable signature for "Administrate's view of this entity."

**Sketch** (location: whichever view creates `WebhookInbox` rows):

```python
import hashlib, json
from datetime import timedelta
from django.utils import timezone

def _hash_node(node: dict) -> str:
    return hashlib.sha256(
        json.dumps(node, sort_keys=True, separators=(',', ':')).encode()
    ).hexdigest()

# Inside the inbound webhook view, before saving the inbox row:
signature = _hash_node(raw_payload['payload']['node'])
recent = (
    WebhookInbox.objects
    .filter(
        entity_external_id=entity_id,
        status=WebhookInbox.STATUS_APPLIED,
        received_at__gte=timezone.now() - timedelta(seconds=10),
    )
    .order_by('-received_at')
    .first()
)
if recent and _hash_node(recent.raw_payload['payload']['node']) == signature:
    inbox_row.status = WebhookInbox.STATUS_DUPLICATE
    inbox_row.error_message = f'Content-equivalent to inbox row {recent.id}'
    inbox_row.save()
    return  # skip dispatch
```

**Trade-offs:**

| Option | Pros | Cons |
|---|---|---|
| Intake-time near-window check (above) | No schema migration; rejects before any work | Tunable window (10s? 30s?); won't catch duplicates that drift past the window |
| Apply-time hash on bridge | Strictly idempotent regardless of timing | Requires migration to add `last_applied_payload_hash` to `adm.events`; touches more code |

Recommendation: intake-time is the cheaper of the two and sufficient for the
observed failure mode (1-second gap). If Administrate later produces wider gaps
(e.g. a delayed cascade fires 30 seconds after the user edit), revisit and
either widen the window or migrate to apply-time hashing.

### Step 0 (independent of code changes): Ask Administrate Support

Show Administrate support inbox rows 34 and 35. Two `Event Updated` events for
one user edit on a single field looks like an internal cascade on their side.
They may be able to identify which post-save job is touching the row and
suppress or batch it. **This is the only intervention that genuinely saves API
rate-limit budget** — everything else just reduces our DB churn.

## Things Worth Knowing Before Implementing

- **Rate limit reality**: Administrate counts each delivery at *send time*, not
  apply time. Steps 1 and 2 reduce our DB load but do **not** refund rate-limit
  quota — only Step 0 (upstream fix) does.
- **`EVENT_WEBHOOK_QUERY` is uploaded to Administrate** on every `register` run
  ([administrate_webhooks.py:172](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py#L172))
  — trimming the query string in code is the actual mechanism for shrinking
  what Administrate sends. Not just a local read shape.
- **Envelope metadata is not query-controllable**: `metadata.triggered_at` and
  `metadata.sent_at` come from Administrate's webhook envelope, not from the
  GraphQL query. They will always differ between deliveries even after Step 1,
  which is why Step 2 hashes `payload.node` rather than the full `raw_payload`.
- **Existing handler is already idempotent** at the data level (see
  [webhook_handlers.py:247-258](../backend/django_Admin3/administrate/services/webhook_handlers.py#L247-L258))
  — `setattr+save` of identical values + `update_or_create` of the bridge.
  The "cost" of a duplicate today is purely the wasted transaction and audit
  noise, not data corruption.

## Implementation Checklist

### Step 1 — Drop `updatedAt` from query (low risk)

- [ ] Remove the `updatedAt` line from `EVENT_WEBHOOK_QUERY` in
      `administrate/management/commands/administrate_webhooks.py`
- [ ] Add a brief comment in the "Field shapes verified against live UAT"
      docstring above the query explaining why `updatedAt` is deliberately
      omitted (so future devs don't re-add it during the next "let's enrich the
      payload" pass)
- [ ] Run `python manage.py administrate_webhooks register` against UAT
- [ ] Verify in UAT that subsequent deliveries no longer carry `payload.node.updatedAt`
- [ ] Promote to production

### Step 0 — Upstream investigation (parallel to Step 1)

- [ ] Open Administrate support ticket with inbox row 34/35 evidence; ask why
      a single LMS date edit produces two `UPDATE` statements ~1.3s apart
- [ ] Audit our own code for any path that calls Administrate's API in response
      to receiving an `Event Updated` webhook (would create a feedback loop)

### Step 2 — Intake dedup (only if Step 0 doesn't resolve and noise still matters)

- [ ] Implement `_hash_node()` helper
- [ ] Add near-window content-hash check in the inbound webhook view (before
      dispatching to the task layer)
- [ ] Choose dedup window (default suggestion: 10 seconds; revisit if observed
      duplicates exceed this)
- [ ] Add a test: simulate two POSTs with identical `payload.node` 2s apart,
      assert the second creates a row with `status='duplicate'` and no apply work
- [ ] Add a test: simulate two POSTs with content-different `payload.node` 2s
      apart, assert both apply normally
- [ ] Monitor `WebhookInbox.objects.filter(status='duplicate')` for a week to
      confirm rate and that no legitimate update gets misclassified

## References

- Inbox model & dedup constraint:
  [administrate/models/webhook_inbox.py:62-70](../backend/django_Admin3/administrate/models/webhook_inbox.py#L62-L70)
- GraphQL query (the field-shaping seam):
  [administrate/management/commands/administrate_webhooks.py:35-62](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py#L35-L62)
- Mapper (consumer of payload — does not read `updatedAt`):
  [administrate/services/webhook_handlers.py:155-203](../backend/django_Admin3/administrate/services/webhook_handlers.py#L155-L203)
- Existing apply-side idempotence (no-op safe today):
  [administrate/services/webhook_handlers.py:247-258](../backend/django_Admin3/administrate/services/webhook_handlers.py#L247-L258)
