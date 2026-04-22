"""Retarget MarkingPaperSubmission.marking_voucher FK.

Post-merge (2026-04-22) reconciliation between two feature branches:
  - main added MarkingPaperSubmission with a FK to marking_vouchers.MarkingVoucher
  - this branch (purchasable-unification) drops MarkingVoucher entirely in
    marking_vouchers/0004, replacing it with store.GenericItem (kind='marking_voucher')

This migration AlterFields the FK target to store.GenericItem before
marking_vouchers/0004 drops the MarkingVoucher table. Safe on empty tables
(CI); on environments with pre-existing marking_paper_submissions rows
the old marking_voucher_id values would need to be translated via the
acted._voucher_migration_map temp table — but the feature is brand-new
and has zero rows in all known environments at time of writing.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marking", "0008_add_marking_paper_feedback"),
        # store.GenericItem must exist
        ("store", "0005_create_generic_item"),
    ]

    operations = [
        migrations.AlterField(
            model_name="markingpapersubmission",
            name="marking_voucher",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="submissions",
                to="store.genericitem",
            ),
        ),
    ]
