from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0015_grade_add_e_choice'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='markingpapersubmission',
            name='uq_submission_student_paper',
        ),
        migrations.AddConstraint(
            model_name='markingpapersubmission',
            constraint=models.UniqueConstraint(
                fields=['student', 'marking_paper'],
                condition=models.Q(redeemed_voucher__isnull=True),
                name='uq_submission_student_paper_no_voucher',
            ),
        ),
        migrations.AddConstraint(
            model_name='markingpapersubmission',
            constraint=models.UniqueConstraint(
                fields=['student', 'marking_paper', 'redeemed_voucher'],
                condition=models.Q(redeemed_voucher__isnull=False),
                name='uq_submission_student_paper_voucher',
            ),
        ),
    ]
