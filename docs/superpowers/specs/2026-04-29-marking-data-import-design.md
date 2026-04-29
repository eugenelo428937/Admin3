# Marking Data Import — Design

**Date:** 2026-04-29
**Source:** `docs/to-dos/marking.md`
**Status:** Design (pending implementation plan)

## 1. Goal

Import historical marking data from two legacy CSVs into the new marking app:

| CSV | Target tables | Approx rows |
|-----|---------------|-------------|
| `docs/misc/markers.csv` | `markers` | ~380 |
| `docs/misc/marks26.csv` | `issued_vouchers`, `redeemed_vouchers`, `marking_paper_submissions`, `marking_paper_gradings`, `marking_paper_feedbacks` | ~19,800 |

The work is split into three phases: schema migrations → markers import → marks26 import.

## 2. Schema changes

### 2.1 Migration order (cross-app)

Each app's migrations declare cross-app dependencies so Django runs them topologically:

| Order | App | Migration | Action |
|-------|-----|-----------|--------|
| 1 | `staff` | `0004_add_staff_initials` | Add `Staff.initials` (CharField, indexed). |
| 2 | `marking_vouchers` | `0005_add_redeemed_voucher` | Create `RedeemedVoucher` table. |
| 3 | `marking` | `0010_marking_paper_purchasable_fk` | Rename `marking_paper.store_product` → `purchasable`; retarget FK `store.Product` → `store.Purchasable`; `on_delete=PROTECT`; add `is_active`; add `sequences` (IntegerField, nullable). |
| 4 | `marking` | `0011_add_marker_legacy_id` | Add `Marker.legacy_id` (PositiveIntegerField, unique, nullable, indexed). |
| 5 | `marking` | `0012_submission_swap_voucher_fk` | Drop `marking_voucher` FK on `MarkingPaperSubmission`; add `redeemed_voucher` FK to `marking_vouchers.RedeemedVoucher` (nullable); make `order_item` non-nullable; add `is_active`. |
| 6 | `marking` | `0013_grading_field_changes` | On `MarkingPaperGrading`: add `grade` (CharField, choices A/B/C/D, nullable); rename `submission_date` → `graded_date`; drop `hub_download_date`; add `is_active`. |
| 7 | `marking` | `0014_feedback_field_changes` | On `MarkingPaperFeedback`: rename `grade` → `rating` (keeps E/G/A/P choices); rename `submission_date` → `feedback_date`; drop `hub_download_date`; add `is_active`. |

Existing `marking_paper` rows are preserved through migration 3 because `store.Product` inherits from `store.Purchasable` via MTI: every `store_product_id` is also a valid `purchasable_id` (same PK). The `marking_paper_submissions`, `marking_paper_gradings`, `marking_paper_feedbacks` tables are empty in all environments, so destructive changes are safe.

### 2.2 Field-level changes

`marking.MarkingPaper`:
- Rename `store_product` → `purchasable` (FK to `store.Purchasable`, `on_delete=PROTECT`).
- Add `is_active = BooleanField(default=True, db_index=True)`.
- Add `sequences = IntegerField(null=True, blank=True, db_index=True)`. The legacy CSV has a `sequence` column (int) per paper, e.g., for "X" papers the rows are `(name='X', sequences=1..6)`; for Mock Exams `(name='M1'|'M2'|'M3', sequences=1..2)`. Lookup by `(subject, name, sequences)` (see §5.4). Field is nullable to allow operator backfill on existing `MarkingPaper` rows out-of-band.

`marking.MarkingPaperSubmission`:
- Drop `marking_voucher` FK (was → `store.GenericItem`).
- Add `redeemed_voucher = ForeignKey('marking_vouchers.RedeemedVoucher', on_delete=PROTECT, null=True, blank=True, related_name='submissions')`.
- Make `order_item` non-nullable (`null=False`).
- Add `is_active = BooleanField(default=True, db_index=True)`.

`marking.MarkingPaperGrading`:
- Rename `submission_date` → `graded_date`.
- Drop `hub_download_date`.
- Add `grade = CharField(max_length=1, choices=[('A','A'),('B','B'),('C','C'),('D','D')], null=True, blank=True)`.
- Add `is_active = BooleanField(default=True, db_index=True)`.
- `allocate_by` stays non-nullable.

`marking.MarkingPaperFeedback`:
- Rename `grade` → `rating` (keeps existing E/G/A/P choices unchanged).
- Rename `submission_date` → `feedback_date`.
- Drop `hub_download_date`.
- Add `is_active = BooleanField(default=True, db_index=True)`.

`marking.Marker`:
- Add `legacy_id = PositiveIntegerField(unique=True, null=True, blank=True, db_index=True, help_text='mkref from legacy system')`.

`staff.Staff`:
- Add `initials = CharField(max_length=10, blank=True, default='', db_index=True, help_text='Short initials used to identify staff in legacy systems')`.

## 3. New model: `marking_vouchers.RedeemedVoucher`

```python
# marking_vouchers/models/redeemed_voucher.py
from django.db import models


class RedeemedVoucher(models.Model):
    """One row per voucher redemption against a marking paper.

    The OneToOneField on issued_voucher enforces that a voucher can be
    redeemed at most once.
    """
    issued_voucher = models.OneToOneField(
        'marking_vouchers.IssuedVoucher',
        on_delete=models.PROTECT,
        related_name='redemption',
    )
    marking_paper = models.ForeignKey(
        'marking.MarkingPaper',
        on_delete=models.PROTECT,
        related_name='redemptions',
    )
    redeemed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."redeemed_vouchers"'
        verbose_name = 'Redeemed Voucher'
        verbose_name_plural = 'Redeemed Vouchers'

    def __str__(self):
        return f'Redemption({self.issued_voucher.voucher_code} → {self.marking_paper.name})'
```

When the import script creates a `RedeemedVoucher` it also updates the parent `IssuedVoucher`:

```python
issued_voucher.status = 'redeemed'
issued_voucher.redeemed_at = redeemed_at
issued_voucher.save(update_fields=['status', 'redeemed_at'])
```

A serializer and admin registration mirror existing `IssuedVoucher` patterns.

## 4. `import_markers` management command

```
python manage.py import_markers --csv-path docs/misc/markers.csv [--errors-path markers_errors.csv] [--dry-run]
```

### 4.1 Workflow (single pass — small dataset)

1. **Pre-check**: abort if the `markers` table is non-empty (one-shot semantics; to re-run, truncate first).
2. **Parse** `markers.csv` (columns: `mkref`, `firstname`, `lastname`, `initials`).
3. **Validate every row** (collect all errors, never stop on first):
   - `mkref` is a positive integer.
   - `initials` is non-empty and ≤ 10 characters.
   - `(firstname, lastname)` matches **exactly one** row in `auth_user` (case-sensitive comparison against `User.first_name` and `User.last_name`).
     - 0 matches → error `"No auth_user matches firstname='X' lastname='Y'"`.
     - >1 matches → error `"Ambiguous match: N auth_user rows have firstname='X' lastname='Y'"`.
4. **If any errors**: write `markers_errors.csv`, print summary, exit non-zero. No DB writes.
5. **Else** (and not `--dry-run`): wrap in `transaction.atomic()`. For each row:
   ```python
   Marker.objects.create(
       user=matched_user,
       initial=row['initials'],
       legacy_id=int(row['mkref']),
   )
   ```

### 4.2 Error CSV format

```csv
row_num,mkref,firstname,lastname,initials,error_message
5,38,David,Wilmot,DCW,No auth_user matches firstname='David' lastname='Wilmot'
17,99,John,Smith,JS,Ambiguous match: 3 auth_user rows have firstname='John' lastname='Smith'
```

### 4.3 Flags
- `--csv-path` (required)
- `--errors-path` (default: `markers_errors.csv`)
- `--dry-run` (validate only, no writes even if validation passes)

## 5. `import_marks26` management command

```
python manage.py import_marks26 --csv-path docs/misc/marks26.csv [--errors-path marks26_errors.csv] [--dry-run]
```

### 5.1 Two-pass workflow

#### Pass 1 — Validate-all

1. **Pre-check**: abort if any of `IssuedVoucher`, `RedeemedVoucher`, `MarkingPaperSubmission`, `MarkingPaperGrading`, `MarkingPaperFeedback` is non-empty.
2. **Pre-flight checks** (abort on failure with clear message):
   - `Purchasable.objects.get(code='MV')` must exist (used for every `IssuedVoucher.purchasable`).
   - Collect all distinct `staffalloc` (Col AD) values used on rows where `dateout` is valid. Each must exist in `Staff.initials`. List any missing and abort.
   - Collect all distinct `marker` (Col O) values used on rows where `dateout` is valid. Each must exist in `Marker.initial`. List any missing and abort.
3. **Row validation** (collect all errors, never stop on first):

   **Common (every row):**
   - `ref` (Col A) → must match `Student.student_ref`.

   **Voucher rows** (Col C matches `*/MV/*`):
   - `voucher` (Col R) > 0 — used as `IssuedVoucher.voucher_code`.
   - `order` (Col U) → resolves to one `OrderItem` via `OrderItem.objects.filter(metadata__orderno=row.order)`.
   - `expiry` (Col X) is a parseable date.

   **Voucher rows AND `datelogged` (Col F) valid:**
   - `subject` + `abbrev` + `sequence` resolves to one `MarkingPaper` (lookup formula in §5.4).

   **Non-voucher rows** (Col C is a real product code):
   - `assign` (Col C) exists as `store.Product.product_code`.
   - The product's exam_session_subject is reachable (last 2-3 chars of `assign` represent the session).
   - `subject` + `abbrev` + `sequence` resolves to one `MarkingPaper`.
   - `order` (Col U) resolves to one `OrderItem`.

   **If `datelogged` is valid (any row kind):**
   - `realdatein` (Col W) is parseable as a date.

   **If `dateout` (Col H) is valid:**
   - `datelogged` must also be valid (grading FK → submission; orphan grading is invalid).
   - `staffalloc` (Col AD) is non-empty and matches a `Staff.initials`.
   - `marker` (Col O) is non-empty and matches a `Marker.initial`.
   - `score` (Col M) is parseable as integer or empty.
   - `grade` (Col N) is in `{A, B, C, D, blank}`.

   **If `hubfeedbk` (Col AI) is valid:**
   - `dateout` must also be valid (feedback FK → grading; orphan feedback is invalid).
   - `rating` (Col P) is in `{E, G, A, P, blank}`.

4. **If errors**: write `marks26_errors.csv`, abort with no DB writes.

#### Pass 2 — Atomic import

Skipped if Pass 1 had errors or `--dry-run` was passed. The entire pass runs inside one `transaction.atomic()`.

Per-row state across steps is tracked via three dicts built up during pass 2:

- `rv_by_voucher_code: dict[str, RedeemedVoucher]` — populated in step a (continued); read in step b for voucher rows.
- `submission_by_row_index: dict[int, MarkingPaperSubmission]` — populated in step b; read in step c for grading rows.
- `grading_by_row_index: dict[int, MarkingPaperGrading]` — populated in step c; read in step d for feedback rows.

Each step iterates the parsed rows in input order and writes its dict entry by row index so subsequent steps can resolve their FK target.

**Step a — IssuedVouchers** (every `*/MV/*` row):
```python
mv_purchasable = Purchasable.objects.get(code='MV')
order_item = order_item_lookup[row['order']]

iv = IssuedVoucher.objects.create(
    voucher_code=row['voucher'],
    order_item=order_item,
    purchasable=mv_purchasable,
    expires_at=parse_date(row['expiry']),
    status='active',  # may be flipped to 'redeemed' below
)

# Override auto_now_add issued_at with order_date (purchase time):
IssuedVoucher.objects.filter(pk=iv.pk).update(
    issued_at=order_item.order.order_date,
)
```

**Step a (continued) — RedeemedVouchers** (voucher rows where `datelogged` is valid):
```python
redeemed_at = parse_date(row['datelogged'])
paper = paper_lookup[(row['subject'], f"{row['abbrev']}-{row['sequence']}")]
iv = iv_lookup[row['voucher']]

rv = RedeemedVoucher.objects.create(
    issued_voucher=iv,
    marking_paper=paper,
    redeemed_at=redeemed_at,
)

# Cascade-update IssuedVoucher state:
iv.status = 'redeemed'
iv.redeemed_at = redeemed_at
iv.save(update_fields=['status', 'redeemed_at'])
```

**Step b — MarkingPaperSubmissions** (every row with valid `datelogged`):
```python
MarkingPaperSubmission.objects.create(
    student=student_lookup[row['ref']],
    marking_paper=paper_lookup[(row['subject'], f"{row['abbrev']}-{row['sequence']}")],
    redeemed_voucher=rv if voucher_row else None,
    order_item=order_item_lookup[row['order']],
    submission_date=parse_date(row['realdatein']),
    hub_download_date=parse_date_or_none(row['hubdownld']),
)
```

**Step c — MarkingPaperGradings** (every row with valid `dateout`):
```python
MarkingPaperGrading.objects.create(
    submission=submission_for_row,
    marker=marker_lookup[row['marker']],
    allocate_date=parse_date(row['dateout']),
    allocate_by=staff_lookup[row['staffalloc']],
    graded_date=parse_date(row['hubout']),
    hub_upload_date=parse_date(row['hubout']),
    score=int(row['score']) if row['score'].strip() else None,
    grade=row['grade'].strip() or None,
)
```

**Step d — MarkingPaperFeedbacks** (every row with valid `hubfeedbk`):
```python
MarkingPaperFeedback.objects.create(
    grading=grading_for_row,
    rating=row['rating'].strip() or None,
    comments=row['comments'] or '',
    feedback_date=parse_date(row['hubfeedbk']),
)
```

### 5.2 Error CSV format

```csv
row_num,ref,subject,assign,abbrev,sequence,error_field,error_message
57,76138,CP3,*/MV/22,M2,1,marking_paper,Cannot resolve marking_paper for subject='CP3' name='M2-1'
2722,82730,CP1,CP1/MX/26,X,1,marker,marker='DSR' not found in markers.initial
```

### 5.3 Date parsing helper

- Format: `%d/%m/%Y`.
- Empty markers: `''`, `' '`, `'  '`, `/  /`. Treated as null.
- Dates are interpreted as **midnight Europe/London** and stored as timezone-aware UTC datetimes.

```python
from datetime import datetime
from zoneinfo import ZoneInfo

UK = ZoneInfo('Europe/London')
EMPTY_MARKERS = {'', '/  /'}

def parse_date(value: str) -> datetime | None:
    v = (value or '').strip()
    if v in EMPTY_MARKERS:
        return None
    naive = datetime.strptime(v, '%d/%m/%Y')
    return naive.replace(tzinfo=UK)
```

### 5.4 Marking paper lookup

`MarkingPaper.name` stores the abbrev (e.g., `X`, `Y`, `M1`, `M2`, `M3`) and `MarkingPaper.sequences` stores the integer sequence number. Examples:

| CSV row | name | sequences |
|---------|------|-----------|
| abbrev=X, sequence=1 | `X` | `1` |
| abbrev=X, sequence=2 | `X` | `2` |
| abbrev=M2, sequence=1 | `M2` | `1` |
| abbrev=M2, sequence=2 | `M2` | `2` |

The operator updates existing `MarkingPaper` rows to set `name` and `sequences` consistently before running marks26.

```python
def lookup_marking_paper(subject_code: str, abbrev: str, sequence: int) -> MarkingPaper | None:
    return MarkingPaper.objects.filter(
        purchasable__product__exam_session_subject__subject__code=subject_code,
        name=abbrev,
        sequences=sequence,
        is_active=True,
    ).first()
```

### 5.5 Performance

- ~19,800 rows in marks26.csv. Per-row `create()` inside one transaction is acceptable for this size.
- At start of Pass 2, pre-load lookup dicts to avoid per-row queries:
  - `student_lookup: dict[int, Student]` keyed by `student_ref`
  - `marker_lookup: dict[str, Marker]` keyed by `initial`
  - `staff_lookup: dict[str, Staff]` keyed by `initials`
  - `product_lookup: dict[str, Product]` keyed by `product_code`
  - `paper_lookup: dict[tuple[str, str], MarkingPaper]` keyed by `(subject_code, name)`
  - `order_item_lookup: dict[str, OrderItem]` keyed by `metadata.orderno`
- `bulk_create` is not used because we rely on per-row `pk`s for FK chaining and the `IssuedVoucher` cascade update.

### 5.6 Flags
- `--csv-path` (required)
- `--errors-path` (default: `marks26_errors.csv`)
- `--dry-run` (validation only)

## 6. Operational sequence

The full migration runbook:

1. Apply schema migrations: `python manage.py migrate`.
2. (Out of band) Operator updates existing `MarkingPaper.name` values to the `{abbrev}-{sequence}` format.
3. (Out of band) Operator populates `Staff.initials` for every staff member referenced in `marks26.csv`'s `staffalloc` column.
4. Run markers import: `python manage.py import_markers --csv-path docs/misc/markers.csv`.
5. (Optional) Dry-run marks26: `python manage.py import_marks26 --csv-path docs/misc/marks26.csv --dry-run`.
6. Run marks26 import: `python manage.py import_marks26 --csv-path docs/misc/marks26.csv`.

## 7. Out-of-scope

- Changes to `auth_user` table itself (initials live on `Staff`, not `User`).
- Population of `Staff.initials` data — done separately by the operator.
- Update of existing `MarkingPaper.name` values — done separately by the operator.
- API/serializer/admin changes for renamed fields beyond what is needed for the new `RedeemedVoucher` model. Any UI that referenced `submission_date` on grading/feedback or `grade` on feedback will need follow-up updates outside this spec.
