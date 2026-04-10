"""
Management command to import students from legacy CSV extract.

Usage:
  # Anonymize + import in one go
  python manage.py import_students --csv ../../docs/misc/students.csv --anonymize --batch-size 100

  # Anonymize + import with dry-run (lets you inspect DB, then rolls back)
  python manage.py import_students --csv ../../docs/misc/students.csv --anonymize --dry-run

  # Anonymize only (produces anonymized CSV for review)
  python manage.py import_students --csv ../../docs/misc/students.csv --anonymize-only

  # Import pre-anonymized CSV
  python manage.py import_students --csv ../../docs/misc/students_anonymized.csv --batch-size 100

  # Resume from a specific row offset
  python manage.py import_students --csv ../../docs/misc/students_anonymized.csv --offset 500 --batch-size 100
"""

import csv
import os
import random
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from students.models import Student
from userprofile.hash_utils import compute_search_hash
from userprofile.models import UserProfile
from userprofile.models.address import UserProfileAddress
from userprofile.models.contact_number import UserProfileContactNumber
from userprofile.models.email import UserProfileEmail


class Command(BaseCommand):
    help = "Import students from legacy CSV with anonymization support"

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            required=True,
            help="Path to the source CSV file",
        )
        parser.add_argument(
            "--anonymize",
            action="store_true",
            help="Anonymize the raw CSV before importing",
        )
        parser.add_argument(
            "--anonymize-only",
            action="store_true",
            help="Only produce anonymized CSV, do not import",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of records per transaction batch (default: 100)",
        )
        parser.add_argument(
            "--offset",
            type=int,
            default=0,
            help="Skip first N data rows (for resuming)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Max rows to process (0 = all)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and validate without writing to DB",
        )
        parser.add_argument(
            "--output",
            help="Output path for anonymized CSV (default: <input>_anonymized.csv)",
        )

    def handle(self, *args, **options):
        csv_path = options["csv"]
        if not os.path.isabs(csv_path):
            csv_path = os.path.join(os.getcwd(), csv_path)

        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f"CSV not found: {csv_path}"))
            return

        do_anonymize = options["anonymize"] or options["anonymize_only"]

        # Phase 1: Anonymize (if requested)
        if do_anonymize:
            output_path = options["output"]
            if not output_path:
                p = Path(csv_path)
                output_path = str(p.parent / f"{p.stem}_anonymized{p.suffix}")

            self.stdout.write(f"Phase 1: Anonymizing {csv_path} ...")
            raw_rows = self._read_csv(csv_path)
            anon_rows = self._anonymize(raw_rows)
            self._write_csv(output_path, anon_rows)
            self.stdout.write(
                self.style.SUCCESS(
                    f"  Wrote {len(anon_rows)} anonymized rows to {output_path}"
                )
            )

            if options["anonymize_only"]:
                return

            # Pair raw + anonymised for hash computation during import
            import_rows = anon_rows
            raw_rows_for_hash = raw_rows
        else:
            # Import directly from the CSV (assumed pre-anonymized, no hashing)
            import_rows = self._read_csv(csv_path)
            raw_rows_for_hash = None

        # Phase 2: Import
        self._import_rows(
            import_rows,
            raw_rows=raw_rows_for_hash,
            batch_size=options["batch_size"],
            offset=options["offset"],
            limit=options["limit"],
            dry_run=options["dry_run"],
        )

    # ── CSV I/O ──────────────────────────────────────────────────────

    def _read_csv(self, path):
        """Read CSV with latin-1 encoding, normalize column names."""
        rows = []
        with open(path, "r", encoding="latin-1") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Normalize keys: strip whitespace, lowercase
                normalized = {}
                for k, v in row.items():
                    clean_key = " ".join(k.strip().lower().split())
                    normalized[clean_key] = (v or "").strip()
                rows.append(normalized)
        return rows

    def _write_csv(self, path, rows):
        """Write anonymized rows back to CSV."""
        if not rows:
            return
        fieldnames = list(rows[0].keys())
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    # ── Anonymization ────────────────────────────────────────────────

    def _mask_name(self, name):
        """Preserve first character, replace rest with 'x'.
        'Eugene' → 'Exxxxx', 'Lo' → 'Lx'
        """
        if not name:
            return name
        return name[0] + "x" * (len(name) - 1)

    def _mask_address_part(self, value):
        """Mask building/street: preserve first char of each word."""
        if not value:
            return value
        words = value.split()
        masked = []
        for word in words:
            if len(word) <= 1:
                masked.append(word)
            elif word[0].isdigit():
                # Preserve house numbers as-is (e.g., "25" stays "25")
                masked.append(word)
            else:
                masked.append(word[0] + "x" * (len(word) - 1))
        return " ".join(masked)

    def _mask_email(self, email, ref):
        """Anonymize email: student_{ref}@example.com for missing,
        or preserve first char of local part + mask rest, keep domain."""
        if not email:
            return f"student_{ref}@example.com"
        parts = email.split("@", 1)
        if len(parts) != 2:
            return f"student_{ref}@example.com"
        local = parts[0]
        domain = parts[1]
        masked_local = local[0] + "x" * (len(local) - 1) if local else "x"
        return f"{masked_local}@{domain}"

    def _mask_phone(self, phone):
        """Randomly generate digits but preserve last 3. Remove spaces."""
        if not phone:
            return phone
        # Strip spaces
        cleaned = phone.replace(" ", "")
        if not cleaned or cleaned.upper() == "N/A":
            return ""
        # Preserve last 3 digits, randomize the rest
        if len(cleaned) <= 3:
            return cleaned
        prefix_len = len(cleaned) - 3
        last3 = cleaned[-3:]
        # Preserve leading + or 0 patterns
        new_prefix = ""
        for ch in cleaned[:prefix_len]:
            if ch.isdigit():
                new_prefix += str(random.randint(0, 9))
            else:
                new_prefix += ch  # Preserve +, (, ) etc.
        return new_prefix + last3

    def _anonymize(self, rows):
        """Anonymize all rows, return new list."""
        anon = []
        seen_emails = set()

        for row in rows:
            ref = row.get("ref", "")
            r = dict(row)

            # Names
            r["firstname"] = self._mask_name(r.get("firstname", ""))
            r["lastname"] = self._mask_name(r.get("lastname", ""))

            # Email (dedup)
            email = self._mask_email(r.get("email", ""), ref)
            if email.lower() in seen_emails:
                email = f"student_{ref}@example.com"
            seen_emails.add(email.lower())
            r["email"] = email

            # Address: mask building and street, keep the rest
            r["address building"] = self._mask_address_part(
                r.get("address building", "")
            )
            r["address street"] = self._mask_address_part(
                r.get("address street", "")
            )

            # Phones
            r["home phone"] = self._mask_phone(r.get("home phone", ""))
            r["work phone"] = self._mask_phone(r.get("work phone", ""))
            r["mobile"] = self._mask_phone(r.get("mobile", ""))

            anon.append(r)

        return anon

    # ── Import ───────────────────────────────────────────────────────

    def _import_rows(self, rows, raw_rows, batch_size, offset, limit, dry_run):
        """Import rows in batched transactions.

        Args:
            rows: Anonymised rows to import.
            raw_rows: Original raw rows (same length/order as rows) for
                      computing search hashes. None if no hashing needed.
        """
        # Apply offset and limit
        subset = rows[offset:]
        raw_subset = raw_rows[offset:] if raw_rows else None
        if limit > 0:
            subset = subset[:limit]
            raw_subset = raw_subset[:limit] if raw_subset else None

        total = len(subset)
        self.stdout.write(
            f"Phase 2: Importing {total} rows "
            f"(offset={offset}, batch_size={batch_size}, dry_run={dry_run})"
        )

        if dry_run:
            self._import_rows_dry_run(subset, raw_subset, batch_size, offset)
        else:
            self._import_rows_live(subset, raw_subset, batch_size, offset)

    def _import_rows_live(self, subset, raw_subset, batch_size, offset):
        """Normal import: each batch is its own committed transaction."""
        total = len(subset)
        created = 0
        skipped = 0
        errors = []

        for batch_start in range(0, total, batch_size):
            batch = subset[batch_start : batch_start + batch_size]
            raw_batch = raw_subset[batch_start : batch_start + batch_size] if raw_subset else [None] * len(batch)
            batch_num = (batch_start // batch_size) + 1
            absolute_start = offset + batch_start

            try:
                with transaction.atomic():
                    for i, (row, raw_row) in enumerate(zip(batch, raw_batch)):
                        row_num = absolute_start + i + 1
                        try:
                            with transaction.atomic():
                                result = self._import_single_row(row, raw_row)
                                if result == "created":
                                    created += 1
                                elif result == "skipped":
                                    skipped += 1
                        except Exception as e:
                            errors.append(
                                f"Row {row_num} (ref={row.get('ref', '?')}): {e}"
                            )

            except Exception as e:
                errors.append(f"Batch {batch_num} failed: {e}")

            self.stdout.write(
                f"  Batch {batch_num}: rows {absolute_start + 1}-"
                f"{absolute_start + len(batch)} "
                f"(created={created}, skipped={skipped}, errors={len(errors)})"
            )

        self._print_summary(created, skipped, errors)

        if created > 0:
            self._reset_student_sequence()

    def _import_rows_dry_run(self, subset, raw_subset, batch_size, offset):
        """Dry-run: run the full import inside a transaction, then rollback."""
        total = len(subset)
        created = 0
        skipped = 0
        errors = []

        try:
            with transaction.atomic():
                for batch_start in range(0, total, batch_size):
                    batch = subset[batch_start : batch_start + batch_size]
                    raw_batch = raw_subset[batch_start : batch_start + batch_size] if raw_subset else [None] * len(batch)
                    batch_num = (batch_start // batch_size) + 1
                    absolute_start = offset + batch_start

                    for i, (row, raw_row) in enumerate(zip(batch, raw_batch)):
                        row_num = absolute_start + i + 1
                        try:
                            with transaction.atomic():
                                result = self._import_single_row(row, raw_row)
                                if result == "created":
                                    created += 1
                                elif result == "skipped":
                                    skipped += 1
                        except Exception as e:
                            errors.append(
                                f"Row {row_num} (ref={row.get('ref', '?')}): {e}"
                            )

                    self.stdout.write(
                        f"  Batch {batch_num}: rows {absolute_start + 1}-"
                        f"{absolute_start + len(batch)} "
                        f"(created={created}, skipped={skipped}, errors={len(errors)})"
                    )

                self._print_summary(created, skipped, errors)
                raise DryRunRollback()

        except DryRunRollback:
            self.stdout.write(
                self.style.SUCCESS("Dry-run complete. All changes rolled back.")
            )

    def _print_summary(self, created, skipped, errors):
        """Print import summary."""
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Import summary:"))
        self.stdout.write(f"  Created: {created}")
        self.stdout.write(f"  Skipped: {skipped}")
        self.stdout.write(f"  Errors:  {len(errors)}")

        if errors:
            self.stdout.write(self.style.WARNING("\nErrors:"))
            for err in errors[:50]:  # Show first 50
                self.stdout.write(f"  {err}")
            if len(errors) > 50:
                self.stdout.write(f"  ... and {len(errors) - 50} more")

    def _reset_student_sequence(self):
        """Reset the students PK sequence to max(student_ref) + 1.

        When we explicitly set student_ref (AutoField PK), the PostgreSQL
        sequence is not advanced. Future inserts without an explicit PK
        would collide. This resets the sequence to stay ahead.
        """
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT setval("
                "  pg_get_serial_sequence('acted.students', 'student_ref'),"
                "  COALESCE((SELECT MAX(student_ref) FROM acted.students), 1)"
                ")"
            )
            new_val = cursor.fetchone()[0]
            self.stdout.write(f"  Reset students sequence to {new_val}")

    def _import_single_row(self, row, raw_row=None):
        """Import one student row. Returns 'created' or 'skipped'.

        Args:
            row: The (anonymised) row to import as display data.
            raw_row: The original raw row for computing search hashes.
                     If None, no hashes are stored.
        """
        ref = row.get("ref", "").strip()
        email = row.get("email", "").strip()
        firstname = row.get("firstname", "").strip()
        lastname = row.get("lastname", "").strip()
        title = row.get("title", "").strip()

        if not ref:
            raise ValueError("Missing ref")

        if not email:
            email = f"student_{ref}@example.com"

        # Skip if user with this email already exists
        if User.objects.filter(username=email.lower()).exists():
            return "skipped"

        # 1. Create auth_user (with anonymised names)
        user = User.objects.create_user(
            username=email.lower(),
            email=email.lower(),
            first_name=firstname[:30],  # Django max_length=30 for first_name
            last_name=lastname[:150],  # Django max_length=150 for last_name
            is_superuser=False,
            is_staff=False,
            is_active=False,
        )
        # Set unusable password — these are imported accounts
        user.set_unusable_password()
        user.save(update_fields=["password"])

        # 2. Update UserProfile (auto-created by post_save signal on User)
        delivery_pref = row.get("delivery preference", "").strip().upper() or "HOME"
        invoice_pref = row.get("invoice preference", "").strip().upper() or "HOME"

        profile = user.userprofile
        profile.title = title if title and title != "T" else ""
        profile.send_study_material_to = delivery_pref if delivery_pref in ("HOME", "WORK") else "HOME"
        profile.send_invoices_to = invoice_pref if invoice_pref in ("HOME", "WORK") else "HOME"

        # Store hashes from raw data if available
        if raw_row:
            profile.first_name_hash = compute_search_hash(
                raw_row.get("firstname", "")
            )
            profile.last_name_hash = compute_search_hash(
                raw_row.get("lastname", "")
            )

        profile.save()

        # 3. Create UserProfileAddress (HOME)
        address_data = {}
        building = row.get("address building", "").strip()
        street = row.get("address street", "").strip()
        district = row.get("address district", "").strip()
        town = row.get("address town", "").strip()
        county = row.get("address county", "").strip()
        postcode = row.get("address postcode", "").strip()
        country = row.get("address country", "").strip()

        if building:
            address_data["building"] = building
        if street:
            address_data["street"] = street
        if district:
            address_data["district"] = district
        if town:
            address_data["town"] = town
        if county:
            address_data["county"] = county
        if postcode:
            address_data["postcode"] = postcode

        if address_data or country:
            UserProfileAddress.objects.create(
                user_profile=profile,
                address_type="HOME",
                address_data=address_data,
                country=country or "",
            )

        # 4. Create UserProfileContactNumber(s)
        phone_fields = [
            ("home phone", "HOME"),
            ("work phone", "WORK"),
            ("mobile", "MOBILE"),
        ]
        for csv_field, contact_type in phone_fields:
            number = row.get(csv_field, "").strip()
            if number and number.upper() != "N/A":
                # Hash from raw phone (with spaces stripped)
                raw_number = ""
                if raw_row:
                    raw_val = raw_row.get(csv_field, "").strip()
                    if raw_val and raw_val.upper() != "N/A":
                        raw_number = raw_val.replace(" ", "")

                UserProfileContactNumber.objects.create(
                    user_profile=profile,
                    contact_type=contact_type,
                    number=number,
                    number_hash=compute_search_hash(raw_number) if raw_number else "",
                )

        # 5. Create UserProfileEmail
        raw_email = ""
        if raw_row:
            raw_email = raw_row.get("email", "").strip()

        UserProfileEmail.objects.create(
            user_profile=profile,
            email_type="PERSONAL",
            email=email.lower(),
            email_hash=compute_search_hash(raw_email) if raw_email else "",
        )

        # 6. Create Student with legacy ref as student_ref (primary key)
        Student.objects.create(
            student_ref=int(ref),
            user=user,
            student_type="S",
            apprentice_type="none",
            remarks=f"Imported from legacy system (ref={ref})",
        )

        return "created"


class DryRunRollback(Exception):
    """Raised to trigger transaction rollback during dry runs."""

    pass


