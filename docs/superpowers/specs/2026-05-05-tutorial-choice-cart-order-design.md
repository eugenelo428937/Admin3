# Tutorial Choice Integration — Cart and Order Processing

**Date:** 2026-05-05
**Branch:** `feat/20260505-tutorial-choice-cart-order`
**Status:** Design approved by user; ready for implementation plan.

## Problem

Two issues, scoped together because they show up on the same code path:

1. **Functional gap.** The `TutorialChoice` model exists at
   `backend/django_Admin3/tutorials/models/tutorial_choice.py` but no part of
   the cart/checkout pipeline writes to it. Tutorial preferences are still
   stored as nested JSON in `cart_item.metadata` and copied as-is into
   `order_item.metadata`. The intended canonical record (relational, per
   `order_item`, with `choice_rank ∈ {1,2,3}`) is never created.

2. **Live 500 on checkout.** Posting `/api/orders/checkout/` with a tutorial
   product currently fails with `IntegrityError: null value in column
   "purchasable_id" of relation "order_items" violates not-null constraint`.
   The failing row is a Tutorial Booking Fee. Root cause: the singleton
   `Purchasable(code='FEE_GENERIC')` row is missing from the dev DB even
   though migration `store/0009_create_fee_generic_purchasable.py` declares
   it. `OrderBuilder._transfer_fees` does
   `Purchasable.objects.filter(code='FEE_GENERIC').first()`, gets `None`,
   and the resulting `OrderItem` row violates the NOT NULL constraint on
   `purchasable_id`.

## Goals

- Cart and order layers persist tutorial event preferences as relational
  rows (`CartTutorialChoice` / `TutorialChoice`) rather than only as
  metadata JSON.
- Forward-only: existing orders keep their metadata-encoded choices
  untouched. No data migration of historical orders.
- The 500 on checkout is fixed both at the data layer (ensure
  `FEE_GENERIC` row exists) and at the application layer (clear error if
  it's ever missing again).
- No required frontend change for this story. The cart-add API contract
  is unchanged; the cart-read API gains a new `tutorial_choices` array
  in addition to the legacy metadata view.

## Non-goals

- Changing the cart-add request payload shape. The frontend continues to
  send the existing `{type:'tutorial', subjectCode, newLocation:{...}}`
  payload; the server translates it.
- Removing tutorial choice data from `metadata`. We dual-write/dual-emit
  for now; cleanup is a future story.
- Backfilling historical `order_items` whose tutorial choices live only
  in metadata.
- Supporting tutorial purchases for guest carts. Tutorial add-to-cart
  requires an authenticated user with a linked `Student` row.

## Architecture

```
CART side                          ORDER side
─────────────                      ──────────────
CartItem (purchasable=             OrderItem (purchasable=
  Tutorial Product)  ──build──▶      same Tutorial Product)
   │ 1                                │ 1
   │ N (≤3)                           │ N (≤3)
   ▼                                  ▼
CartTutorialChoice    ──build──▶  TutorialChoice (existing model)
  cart_item                          order_item
  student                            student
  tutorial_event                     tutorial_event
  choice_rank                        choice_rank
```

Invariants:

- One `CartItem` per `(cart, tutorial product)`. "Tutorial product"
  here is the `store.Product` whose ID the frontend posts as
  `productId` on cart-add — i.e. the catalog tutorial product (e.g.
  `CB1/PCSM01P/2025-04`), *not* a specific `TutorialEvents` row. The
  line's `purchasable` is the *product being paid for* — unchanged
  from today.
  The `tutorial_event` selections live in child `CartTutorialChoice`
  rows, not on the cart_item.
- 1-to-1 cart→order copy at build time, both for the line item and its
  child choices. `OrderBuilder` iterates the cart's children and creates
  matching `TutorialChoice` rows on the new `OrderItem`.
- `Student` is resolved at add-to-cart time. Tutorial add rejects for
  guest sessions or for users without a linked `Student`.
- The relational rows are the source of truth post-change. `metadata`
  is rebuilt from them for display continuity, but writes go through
  the relational path.

## Components

### 1. New model: `CartTutorialChoice`

File: `backend/django_Admin3/tutorials/models/cart_tutorial_choice.py`.
Mirrors `TutorialChoice` field-for-field on the cart side.

```python
class CartTutorialChoice(models.Model):
    CHOICE_RANKS = [(1, '1st'), (2, '2nd'), (3, '3rd')]

    cart_item = models.ForeignKey(
        'cart.CartItem', on_delete=models.CASCADE,
        related_name='tutorial_choices',
    )
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT,
        related_name='cart_tutorial_choices',
    )
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents', on_delete=models.PROTECT,
        related_name='in_cart_choices',
    )
    choice_rank = models.PositiveSmallIntegerField(choices=CHOICE_RANKS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."cart_tutorial_choices"'
        constraints = [
            models.UniqueConstraint(
                fields=['cart_item', 'choice_rank'],
                name='uniq_cart_choice_rank_per_cart_item',
            ),
            models.UniqueConstraint(
                fields=['cart_item', 'tutorial_event'],
                name='uniq_cart_event_per_cart_item',
            ),
            models.CheckConstraint(
                condition=models.Q(choice_rank__in=[1, 2, 3]),
                name='cart_choice_rank_in_1_2_3',
            ),
        ]

    def clean(self):
        super().clean()
        validate_tutorial_choice_event(
            self.tutorial_event, self.cart_item.purchasable,
        )
```

Validation helper (extracted to remove duplication with `TutorialChoice`):

File: `backend/django_Admin3/tutorials/services/online_classroom.py`
(extends the existing module).

```python
def validate_tutorial_choice_event(tutorial_event, line_purchasable):
    """Shared validation rule for cart/order tutorial choice rows.

    Rejects Online Classroom events (auto-enrolment lives elsewhere) and
    rejects subject mismatches between the chosen event and the line's
    purchasable.
    """
    from django.core.exceptions import ValidationError
    if is_online_classroom_event(tutorial_event):
        raise ValidationError({
            'tutorial_event': 'Online Classroom events cannot be chosen — '
                              'students are auto-enrolled in OC products.'
        })
    try:
        event_subject = tutorial_event.store_product\
            .exam_session_subject.subject_id
        line_subject = line_purchasable.product\
            .exam_session_subject.subject_id
    except AttributeError:
        return
    if event_subject != line_subject:
        raise ValidationError({
            'tutorial_event': "Event subject does not match the order "
                              "item's subject.",
        })
```

`TutorialChoice.clean()` is updated to call the same helper, replacing
its inline duplicate.

### 2. `CartService` changes

File: `backend/django_Admin3/cart/services/cart_service.py`.

**`_handle_tutorial_add` rewrite.** Auth-gate, find/create the line by
`(cart, purchasable)`, upsert `CartTutorialChoice` rows from the
incoming payload, then rebuild a metadata view for display.

```python
RANK_MAP = {'1st': 1, '2nd': 2, '3rd': 3}
MAX_RANKS_PER_SUBJECT = 3

def _handle_tutorial_add(self, cart, product, quantity, price_type,
                        actual_price, metadata):
    student = self._require_student(cart)

    subject_code = metadata.get('subjectCode')
    new_location = metadata.get('newLocation') or {}
    incoming_choices = new_location.get('choices', [])

    if not (subject_code and incoming_choices):
        return self._create_item(cart, product, quantity, price_type,
                                 actual_price, metadata)

    item = (CartItem.objects.filter(
                cart=cart, purchasable_id=product.pk,
                price_type=price_type,
            ).first()
            or self._create_item(cart, product, quantity, price_type,
                                 actual_price, _strip_choices(metadata)))

    self._upsert_tutorial_choices(item, student, incoming_choices)
    self._refresh_tutorial_metadata(item)
    return item

def _require_student(self, cart):
    from django.core.exceptions import ValidationError
    from students.models import Student
    if not (cart.user_id and cart.user.is_authenticated):
        raise ValidationError(
            "Tutorial purchases require a logged-in user.")
    student = Student.objects.filter(user=cart.user).first()
    if student is None:
        raise ValidationError(
            "User has no linked student record.")
    return student

def _upsert_tutorial_choices(self, item, student, incoming):
    from django.core.exceptions import ValidationError
    from tutorials.models import CartTutorialChoice
    for c in incoming:
        rank = RANK_MAP.get(c.get('choice'))
        event_id = c.get('eventId')
        if rank is None or event_id is None:
            raise ValidationError(
                f"Invalid tutorial choice payload: {c!r}")
        # Replace existing rank or existing event for this cart_item.
        CartTutorialChoice.objects.filter(
            cart_item=item, choice_rank=rank,
        ).delete()
        CartTutorialChoice.objects.filter(
            cart_item=item, tutorial_event_id=event_id,
        ).delete()
        choice = CartTutorialChoice(
            cart_item=item, student=student,
            tutorial_event_id=event_id, choice_rank=rank,
        )
        choice.full_clean()
        choice.save()
    if item.tutorial_choices.count() > MAX_RANKS_PER_SUBJECT:
        raise ValidationError(
            "At most 3 tutorial choices per subject.")

def _refresh_tutorial_metadata(self, item):
    """Rebuild `metadata.locations[].choices[]` from the relational
    rows so existing readers (admin views, email templates, frontend)
    stay consistent during transition.

    Output shape (matches `tutorialMetadataBuilder.ts` on the frontend):
      {
        'type': 'tutorial',
        'subjectCode': <subject code>,
        'title': <existing title or "<subject> Tutorial">,
        'locations': [
          {
            'location': <event location label>,
            'choices': [
              {'choice': '1st'|'2nd'|'3rd', 'variationId', 'eventId',
               'eventCode', 'eventTitle', 'venue', 'location',
               'startDate', 'endDate'},
              ...
            ],
            'choiceCount': <len(choices)>,
          },
          ...
        ],
        'totalChoiceCount': <sum>,
      }

    Choices are grouped by `tutorial_event.location` (or 'Online' /
    'TBD' fallback) and ordered by `choice_rank` within each group.
    The label (`'1st'`, `'2nd'`, `'3rd'`) is reverse-mapped from rank.
    """
```

**Other touch points in the same file:**

- `_is_tutorial_product`: prefers `cart_item.tutorial_choices.exists()`;
  falls back to the legacy metadata check for old rows.
- `merge_guest_cart`: tutorials are auth-only, so guest carts cannot
  have tutorial cart_items. Defensive: skip transfer of any guest cart
  rows that have `tutorial_choices` (impossible by construction).
- `update_item`: when caller passes `metadata` for a tutorial cart_item,
  route the choices portion through `_upsert_tutorial_choices` so legacy
  update paths keep working.

### 3. `OrderBuilder` changes

File: `backend/django_Admin3/orders/services/order_builder.py`.
`_transfer_items` adds one extra step per cart_item:

```python
def _transfer_tutorial_choices(self, cart_item, order_item):
    from tutorials.models import TutorialChoice
    cart_choices = list(cart_item.tutorial_choices.select_related(
        'student', 'tutorial_event',
    ))
    if not cart_choices:
        return
    TutorialChoice.objects.bulk_create([
        TutorialChoice(
            order_item=order_item,
            student=c.student,
            tutorial_event=c.tutorial_event,
            choice_rank=c.choice_rank,
        )
        for c in cart_choices
    ])
```

Validation runs at add-to-cart time (`full_clean` in the service);
checkout relies on at-add-time validation plus DB constraints. Bulk
insert joins the existing `transaction.atomic()` in
`OrderBuilder.build()`; partial failures roll the whole order back.

### 4. Serializer changes

`backend/django_Admin3/cart/serializers.py` — add a nested read-only
serializer for cart tutorial choices, dual-emitted alongside the
legacy metadata.

```python
class CartTutorialChoiceSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    choice_rank = serializers.IntegerField(read_only=True)
    student_id = serializers.IntegerField(read_only=True)
    tutorial_event_id = serializers.IntegerField(read_only=True)
    event_code = serializers.CharField(
        source='tutorial_event.code', read_only=True)
    event_subject_code = serializers.CharField(
        source='tutorial_event.store_product'
               '.exam_session_subject.subject.code',
        read_only=True)


class CartItemSerializer(serializers.ModelSerializer):
    tutorial_choices = CartTutorialChoiceSerializer(
        many=True, read_only=True)
    class Meta:
        fields = [..., 'tutorial_choices']
```

`backend/django_Admin3/orders/serializers/order_serializer.py` — same
treatment on `OrderItemSerializer`. Admin views and confirmation
emails read tutorial info from the new array going forward.

To prevent N+1: cart/order list and retrieve viewsets add
`prefetch_related(
    'items__tutorial_choices__tutorial_event__store_product'
    '__exam_session_subject__subject',
)`.

### 5. FEE_GENERIC bug fix

Two layers, applied together:

**(a) Idempotent ensure-row migration.**
File: `backend/django_Admin3/store/migrations/<NN>_ensure_fee_generic_exists.py`,
where `<NN>` is the next available number after the latest store migration
on the branch at implementation time. Depends on
`('store', '<latest store migration name>')`.

```python
FEE_GENERIC_CODE = 'FEE_GENERIC'

def ensure_fee_generic(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.update_or_create(
        code=FEE_GENERIC_CODE,
        defaults={
            'kind': 'additional_charge',
            'name': 'Generic Fee',
            'description': 'Catch-all purchasable for fee lines. '
                           'Amount comes from actual_price.',
            'is_active': True,
            'dynamic_pricing': True,
            'vat_classification': '',
        },
    )

def reverse(apps, schema_editor):
    pass  # never auto-delete; OrderItem.purchasable is PROTECT.
```

`update_or_create` is drift-resistant and idempotent. The reverse is
intentionally a no-op because historical `order_items` reference
`FEE_GENERIC` via `PROTECT`; deletion would error halfway through.

**(b) Defensive hard-fail in `_transfer_fees`.**

```python
def _transfer_fees(self, order: Order):
    if not self.cart.fees.exists():
        return
    fee_purchasable = Purchasable.objects.filter(
        code='FEE_GENERIC').first()
    if fee_purchasable is None:
        raise RuntimeError(
            "Missing FEE_GENERIC Purchasable row — run "
            "`manage.py migrate store` to create it.")
    for fee in self.cart.fees.all():
        ...
```

This converts what is today an opaque DB-level NOT NULL violation into
a clear application-level error pointing operators at the fix.

## Test plan

Following project TDD (RED → GREEN → REFACTOR).

| Layer | File | Coverage |
|---|---|---|
| Model | `tutorials/tests/test_cart_tutorial_choice.py` (new) | Constraints (rank ∈ {1,2,3}, uniq rank/event per cart_item), `clean()` rejects OC events and subject mismatch — mirrors `test_tutorial_choice.py`. |
| Service | `cart/tests/test_cart_service_tutorial.py` (new) | `_handle_tutorial_add` creates rows for authenticated user; rejects guest; rejects 4th rank; replaces existing rank when same rank submitted again; rebuilds metadata for display. |
| Builder | `orders/tests/test_order_builder.py` (extend) | `_transfer_tutorial_choices` copies cart→order 1:1; runs inside the same atomic transaction; no-op when cart_item has no choices. |
| Migration | `store/tests/test_migration_fee_generic.py` (extend) | After all migrations applied, `Purchasable.objects.filter(code='FEE_GENERIC').exists()` is True; idempotent re-application doesn't duplicate. |
| Defensive | `orders/tests/test_order_builder.py` | `_transfer_fees` raises `RuntimeError` (clear message) when FEE_GENERIC missing AND fees exist; no-ops when fees are empty even if FEE_GENERIC missing. |
| End-to-end | `orders/tests/test_checkout_orchestrator.py` (extend) | POST cart-add (tutorial) → POST checkout → assert `OrderItem` + `TutorialChoice` rows created on the order side; tutorial booking fee no longer 500s. |

Frontend tests stay as-is. The cart-add API contract is unchanged;
cart-read gains a new field which existing frontend code can ignore.

## Migration & rollout

1. Branch `feat/20260505-tutorial-choice-cart-order` (already created).
2. Apply changes in order:
   1. FEE_GENERIC migration + defensive hard-fail (unblocks current
      checkout flow regardless of TutorialChoice work).
   2. Extract shared `validate_tutorial_choice_event` helper; switch
      `TutorialChoice.clean` to call it (no behavior change).
   3. Add `CartTutorialChoice` model + migration.
   4. `CartService` rewrite of `_handle_tutorial_add` and friends.
   5. `OrderBuilder._transfer_tutorial_choices`.
   6. Serializer additions + viewset `prefetch_related` updates.
3. No data backfill. New orders use the relational rows; legacy
   orders keep their metadata-encoded choices.
4. After deploy, monitor: cart-add error rate; checkout success rate
   for tutorial carts; new `tutorial_choices` row creation count.

## Risks & mitigations

- **Risk: existing user has a guest cart with a tutorial item from
  before this change.** Auth gate would refuse subsequent operations.
  Mitigation: `merge_guest_cart` strips any orphan tutorial rows
  defensively at login. New tutorial adds for guests are the rejection
  path; they were never persisted under the old code either if no user
  was attached.
- **Risk: frontend payload variants we haven't covered.** The
  rewritten `_handle_tutorial_add` falls back to `_create_item` when
  `subjectCode`/`incoming_choices` are missing, preserving the old
  permissive behavior for non-conforming requests. Tests assert this.
- **Risk: dual-write metadata + relational drifts.** `metadata` is
  rebuilt from the relational rows after every upsert in
  `_refresh_tutorial_metadata`, so the relational store remains the
  source of truth. A future cleanup story removes the rebuild and
  drops the metadata copy.
- **Risk: an existing tutorial event becomes OC mid-session.**
  At-add-time validation already passed; checkout doesn't re-validate.
  This is intentional (Section 4 insight) — the user shouldn't be
  blocked at checkout for a catalog change they didn't initiate.
  A separate concern; out of scope.
