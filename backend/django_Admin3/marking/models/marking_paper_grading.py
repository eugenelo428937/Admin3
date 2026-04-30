"""MarkingPaperGrading model — one grading per submission."""
from django.db import models


class MarkingPaperGrading(models.Model):
    GRADE_CHOICES = [
        ('A', 'A'),
        ('B', 'B'),
        ('C', 'C'),
        ('D', 'D'),
        ('E', 'E'),
    ]

    submission = models.OneToOneField(
        'marking.MarkingPaperSubmission',
        on_delete=models.CASCADE,
        related_name='grading',
    )
    marker = models.ForeignKey(
        'marking.Marker',
        on_delete=models.PROTECT,
        related_name='gradings',
    )
    allocate_date = models.DateTimeField()
    allocate_by = models.ForeignKey(
        'staff.Staff',
        on_delete=models.PROTECT,
        related_name='allocated_gradings',
    )
    graded_date = models.DateTimeField(null=True, blank=True)
    hub_upload_date = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    grade = models.CharField(
        max_length=1,
        choices=GRADE_CHOICES,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_gradings"'
        verbose_name = 'Marking Paper Grading'
        verbose_name_plural = 'Marking Paper Gradings'

    def __str__(self):
        return f'Grading({self.submission_id}) by {self.marker.initial}'
