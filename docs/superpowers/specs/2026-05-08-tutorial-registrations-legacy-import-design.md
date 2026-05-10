# Tutorial Registrations — Legacy CSV Import & Schema Simplification

**Date:** 2026-05-08
**Status:** Design (approved)
**Scope:** Backend only. One-shot legacy bulk import of `docs/misc/tutorial_registrations.csv` into `tutorial_registrations`, plus a schema simplification that removes a redundant FK exposed by the legacy data. UI work is out of scope.
**Amends:** `docs/superpowers/specs/2026-05-01-tutorial-choice-registration-attendance-design.md` (sections 3.2 and 4.3).

## 1. Problem

The 2026-05-01 spec defined `TutorialRegistration` with `order_item` as a NOT NULL FK and a strict choice-resolver that refused to create a registration when no live `TutorialChoice` could be matched on `(student, tutorial_event)`. Both decisions were correct *for new orders flowing through Admin3 checkout*, but they break for the legacy bulk import we now need to perform.

The legacy Administrate system mutated enrolments without writing back to our checkout/cart records — events were cancelled and students were moved between events outside Admin3. As a result, the source CSV (`docs/misc/tutorial_registrations.csv`, 1 row per session, comma-delimited student refs in `ActEd Student Numbers`) contains many `(student, session)` pairs for which:

- the only `TutorialChoice` is on a now-cancelled `OrderItem`, or
- the live `TutorialChoice` points at a *different* event (because the student was moved), or
- no `TutorialChoice` exists at all (legacy direct enrolment that pre-dates the checkout flow).

Either we drop those legacy enrolments or we relax the schema to accept them. We are choosing the latter.

A separate observation: with `tutorial_registrations.tutorial_choice_id` set, the order item is reachable as `registration.tutorial_choice.order_item`. The direct `order_item` FK on the registration was therefore redundant for matched rows, and meaningless for unmatched rows. Removing it is the cleaner fix.

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Drop `tutorial_registrations.order_item`. | Redundant with `tutorial_choice.order_item`. Legacy unmatched rows have no order item linkage either way. |
| D2 | Keep `tutorial_choice` nullable; add `order_item` as a Python property that returns `tutorial_choice.order_item` or `None`. | Preserves the convenience of `registration.order_item` in callers without a stored column. |
| D3 | Choice resolver returns `None` on zero matches *and* on multi-matches; emits a warning only on multi-matches. | "Insert null when ambiguous" was the user's chosen multi-match policy. Operator can patch links later from the warnings. |
| D4 | New importer is **one-shot**. Aborts pre-flight if `TutorialRegistration.objects_all.exists()`. | This is the legacy bulk load, not a recurring sync. Subsequent CSV-based reconciliation is a future feature. |
| D5 | Unmatched rows (no choice match) insert silently — no per-row warning. | Volume of legacy unmatched rows is too high to be useful as warnings; aggregate counters suffice. |

## 3. Schema change

### 3.1 Migration `tutorials/0017_tutorial_registration_drop_order_item`

Single forward operation: `migrations.RemoveField('tutorialregistration', 'order_item')`.

Reverse op recreates the FK as nullable (data cannot be reconstructed; this is acknowledged in the migration's docstring).

The partial unique index `uniq_active_reg_per_student_session` is **not** affected.

### 3.2 Updated model

```python
# tutorials/models/tutorial_registration.py
class TutorialRegistration(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.PROTECT, ...)
    tutorial_session = models.ForeignKey('tutorials.TutorialSessions', on_delete=models.PROTECT, ...)
    tutorial_choice = models.ForeignKey(
        'tutorials.TutorialChoice', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    is_active = models.BooleanField(default=True)
    import_batch = models.ForeignKey(
        'tutorials.TutorialEnrolmentImport', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def order_item(self):
        """Convenience accessor — derived from tutorial_choice.

        Returns None when the registration could not be matched to a
        TutorialChoice (legacy import). Callers that need to write must
        go through tutorial_choice directly.
        """
        return self.tutorial_choice.order_item if self.tutorial_choice_id else None
```

The `objects` / `objects_all` managers and the `Meta.constraints` are unchanged.

### 3.3 Callers to audit and update

- `tutorials/services/choice_resolver.py` — see §4.
- `tutorials/admin_serializers.py`, `tutorials/admin_views.py` — replace any `registration.order_item_id` field references with the property (read-only) or with `registration.tutorial_choice.order_item_id`.
- `tutorials/tests/test_tutorial_registration.py`, `test_choice_resolver.py`, `test_tutorial_attendance.py`, `test_admin_attendance.py`, `test_admin_event_list.py` — update any factory calls and assertions that touch the removed field.

## 4. Choice resolver — behavior change

`tutorials/services/choice_resolver.py` is simplified:

```python
@dataclass
class ChoiceResolution:
    choice: Optional[TutorialChoice] = None
    warning: str = ''

def resolve_choice_for_registration(student, session) -> ChoiceResolution:
    qs = (
        TutorialChoice.objects
        .filter(
            student=student,
            tutorial_event=session.tutorial_event,
            order_item__is_cancelled=False,
        )
        .order_by('choice_rank', 'created_at')
    )
    matches = list(qs[:2])  # only need to know "0 / 1 / >=2"
    if not matches:
        return ChoiceResolution()
    if len(matches) >= 2:
        return ChoiceResolution(
            choice=None,
            warning=(
                f"multiple matching choices for student={student.student_ref} "
                f"event={session.tutorial_event.code}; left unlinked"
            ),
        )
    return ChoiceResolution(choice=matches[0])
```

### 4.1 Existing test changes

| Test | Change |
|---|---|
| `test_returns_none_when_no_choice_exists` | Drop `result.order_item is None` assertion. |
| `test_returns_single_match` | Drop `result.order_item == oi` assertion; keep `result.choice == choice`. |
| `test_picks_lowest_rank_when_multiple_matches_and_warns` | **Replace** with `test_returns_none_when_multiple_matches_and_warns`: assert `result.choice is None`, `'multiple' in result.warning.lower()`. |
| `test_skips_cancelled_order_items` | Drop `result.order_item is None`. |
| `test_ignores_choices_for_other_events` | Drop `result.order_item is None`. |

## 5. Importer service

New file: `tutorials/services/registrations_importer.py`.

### 5.1 Public API

```python
@dataclass
class ImportResult:
    batch_id: int
    total_csv_rows: int
    created: int
    linked_to_choice: int
    unlinked: int
    multi_match_warnings: int
    skipped_cancelled: int
    skipped_unknown_session: int
    skipped_unknown_student: int
    skipped_paren_suffix: int
    skipped_empty: int
    skipped_duplicate_in_db: int
    warnings: list[str]

def import_registrations_csv(
    file_obj, *, uploaded_by, filename, dry_run=False, strict=False,
) -> ImportResult: ...
```

### 5.2 Algorithm

1. **Pre-flight.** If `TutorialRegistration.objects_all.exists()`, raise `RuntimeError("tutorial_registrations is non-empty; this importer is one-shot only")`. No DB writes have occurred yet.
2. **Parse** via the existing `parse_registrations_csv(file_obj)`. This already reports `skipped_cancelled / skipped_unknown_session / skipped_unknown_student / skipped_paren_suffix / skipped_empty`.
3. **Open transaction.** Create a `TutorialEnrolmentImport` row with `status=PENDING`, `filename`, `uploaded_by`.
4. **For each `ParsedRegistrationRow`:**
   - Resolve the `TutorialSessions` and the `Student` queryset in bulk (one query per row using `student_ref__in=...`).
   - For each `(student, session)` pair, call `resolve_choice_for_registration(student, session)`:
     - `result.warning` non-empty → append to `report['warnings']`, increment `multi_match_warnings`.
     - Create `TutorialRegistration(student=…, tutorial_session=…, tutorial_choice=result.choice, import_batch=batch)`.
     - Increment `created`; increment `linked_to_choice` if `result.choice` else `unlinked`.
   - **Per-row error handling:** wrap each `(student, session)` insert in `try / except IntegrityError`. On unique-constraint hit (a duplicate `(student, session)` already created earlier in this batch), increment `skipped_duplicate_in_db` and continue. If `strict=True`, re-raise to abort the whole transaction.
5. **Finalise the batch.** Populate counters on the `TutorialEnrolmentImport` (`total_rows / created_count / unmatched_count` map to the obvious `ImportResult` fields; `report` JSON gets the full structured payload including `warnings`).
6. **Commit / rollback.**
   - If `dry_run`, call `transaction.set_rollback(True)`. The `TutorialEnrolmentImport` row created in step 3 is rolled back along with the registrations; `ImportResult.batch_id` is therefore returned as `None` in dry-run mode (the caller never sees a persisted batch). The full report is still printed to stdout / returned in `ImportResult` so the operator can inspect the dry-run outcome.
   - Otherwise update the batch row with `status=COMMITTED`, `committed_at=now()`, and the populated counters / `report` JSON, then commit.

### 5.3 Counters mapping (importer → `TutorialEnrolmentImport` fields)

| `TutorialEnrolmentImport` field | Importer source |
|---|---|
| `total_rows` | `result.total_csv_rows` (CSV row count) |
| `created_count` | `result.created` |
| `reactivated_count` | `0` (reactivation is out of scope for the one-shot import) |
| `deactivated_count` | `0` (full-sync reconciliation is out of scope) |
| `unmatched_count` | `result.skipped_unknown_session + result.skipped_unknown_student + result.skipped_paren_suffix + result.skipped_empty + result.skipped_duplicate_in_db` |
| `report` (JSON) | full `ImportResult` serialised + `warnings` list + `unmatched` list from the parser |

Note: `unlinked` (registrations created with `tutorial_choice=null`) is **not** counted as "unmatched" — those are successfully imported registrations, just without choice linkage.

## 6. Management command

`backend/django_Admin3/tutorials/management/commands/import_tutorial_registrations.py`

```bash
python manage.py import_tutorial_registrations \
    --file docs/misc/tutorial_registrations.csv \
    --user <username> \
    [--dry-run] [--strict]
```

- `--file` (required) — path to the CSV file. The command opens it with `encoding='utf-8-sig'` to tolerate the BOM seen in the source file.
- `--user` (required) — username for `TutorialEnrolmentImport.uploaded_by`. Resolved via `User.objects.get(username=...)`; raises `CommandError` if not found.
- `--dry-run` — run the importer with `dry_run=True`. Prints the report and rolls back.
- `--strict` — re-raise per-row `IntegrityError` instead of skipping the duplicate.

Stdout output: human-readable summary (one line per counter) followed by the multi-match warnings list. Exit code 0 on success, non-zero on `RuntimeError` / `CommandError`.

## 7. Test plan (TDD, written first)

### 7.1 New: `tutorials/tests/test_registrations_importer.py`

Each test uses the existing `tutorials.tests.factories` plus a small CSV fixture string built inline (`io.StringIO`).

| Test | Asserts |
|---|---|
| `test_aborts_when_table_not_empty` | One pre-existing `TutorialRegistration` → `RuntimeError`; no `TutorialEnrolmentImport` row created. |
| `test_creates_registration_with_matched_choice` | Student has one live `TutorialChoice` for the session's event → row created with `tutorial_choice` set; `linked_to_choice == 1`. |
| `test_creates_registration_with_null_choice_when_no_match` | No `TutorialChoice` exists → row created with `tutorial_choice IS NULL`; `unlinked == 1`; `warnings` empty. |
| `test_creates_registration_with_null_choice_on_multi_match_and_warns` | Two `TutorialChoice` rows on different order items → row created with `tutorial_choice IS NULL`; `multi_match_warnings == 1`; warning text contains `'multiple'`. |
| `test_skips_cancelled_csv_rows` | CSV row with `Is Cancelled=True` → no registration created; `skipped_cancelled == 1`. |
| `test_skips_unknown_students_and_records_unmatched` | Refs that don't exist as `Student` → counter increments; valid refs in same row still imported. |
| `test_dry_run_rolls_back_everything` | After `dry_run=True`: `TutorialRegistration.objects.count() == 0`, `TutorialEnrolmentImport.objects.count() == 0`, returned `ImportResult.batch_id is None`, but `ImportResult.created`, `linked_to_choice`, `unlinked`, etc. reflect what *would* have been written. |
| `test_links_import_batch_on_every_created_row` | Every created `TutorialRegistration` has `import_batch_id == result.batch_id`. |
| `test_strict_aborts_on_duplicate_in_csv` | CSV with two rows that produce the same `(student, session)` and `--strict` → all writes rolled back. |
| `test_non_strict_skips_duplicate_and_continues` | Same input without `--strict` → first wins; `skipped_duplicate_in_db == 1`. |

### 7.2 Updated: `tutorials/tests/test_choice_resolver.py`

Replace `test_picks_lowest_rank_when_multiple_matches_and_warns` with `test_returns_none_when_multiple_matches_and_warns`. Drop every assertion touching `result.order_item`.

### 7.3 Updated: `tutorials/tests/test_tutorial_registration.py` and others

- Drop direct `order_item=` kwargs in factory calls; pass `tutorial_choice=` instead (or omit entirely for null).
- Replace direct field access (`registration.order_item_id`) with the property where the test still wants to assert the derived value.

### 7.4 Migration test

`tutorials/tests/test_migrations.py` (or a fresh file) — exercise `0017` via Django's migration testing helpers and assert that:

- the `order_item_id` column no longer exists on `acted.tutorial_registrations`;
- the partial unique index `uniq_active_reg_per_student_session` still exists;
- existing rows (none expected in production at migration time, but a synthetic row inserted in the test) survive the migration.

## 8. Risks & out-of-scope

### 8.1 Risks

- **Unknown student volume.** If `skipped_unknown_student` is high, the legacy CSV references students who no longer exist in our `students` table. We accept this; the importer reports the count and the operator decides whether to backfill students before re-running.
- **Wide-cast multi-match.** Re-buys (a student has both a 2024A and a 2024B order with overlapping events) may trigger many multi-match warnings. The "leave null + warn" policy is conservative but produces follow-up work for the operator. Acceptable for a one-shot legacy load.
- **Property masking.** `registration.order_item` becoming a Python property could surprise callers expecting a queryable field (e.g. `.filter(order_item=oi)`). Such callers must rewrite to `.filter(tutorial_choice__order_item=oi)`. The migration audit list in §3.3 catches the known callers; a project-wide grep for `\border_item\b` on registration querysets is part of the implementation plan.

### 8.2 Out of scope

- Recurring CSV full-sync reconciliation (soft-deactivation of rows missing from a later CSV, reactivation of soft-deleted rows). Will be addressed in a follow-up spec once the legacy bulk load is in place.
- Backfilling `tutorial_choice` on already-imported `null` rows after the fact.
- Any UI work — there is no admin screen for triggering this importer; it is a management command only.

### 8.3 Recovery path (re-running after a bad live load)

The importer's one-shot guard (`TutorialRegistration.objects_all.exists()` → `RuntimeError`) blocks re-runs *including the case where the operator commits a load, discovers a problem (e.g. high `skipped_unknown_session` count due to missing parent records), and wants to redo it*.

To redo the load:

1. From a Django shell on the target DB:
   ```python
   from tutorials.models import TutorialRegistration, TutorialEnrolmentImport
   TutorialRegistration.objects_all.all().delete()   # also wipes attendance via CASCADE
   TutorialEnrolmentImport.objects.all().delete()    # optional: keeps the table clean
   ```
2. Re-run `python manage.py import_tutorial_registrations --file ... --user ...`.

`TutorialAttendance` rows are deleted by the `on_delete=CASCADE` on `TutorialAttendance.registration`. There is no other downstream FK on `TutorialRegistration`. The legacy CSV is the source of truth, so a re-import fully reconstructs state.

Operators should always do a `--dry-run` first to validate the skip-counter ratios before re-committing.

## 9. Verification before declaring done

1. `python manage.py test tutorials.tests.test_registrations_importer` — all green.
2. `python manage.py test tutorials.tests.test_choice_resolver tutorials.tests.test_tutorial_registration` — all green after updates.
3. `python manage.py migrate tutorials` on a clean dev DB — no errors.
4. `python manage.py import_tutorial_registrations --file docs/misc/tutorial_registrations.csv --user <admin> --dry-run` — non-zero `created`, summary printed, no rows persisted.
5. Same command without `--dry-run` — rows persisted; `TutorialEnrolmentImport` status `COMMITTED`; `TutorialRegistration.objects.count() == result.created`.
6. `python manage.py verify_schema_placement` — `tutorial_registrations` still in the `acted` schema.
