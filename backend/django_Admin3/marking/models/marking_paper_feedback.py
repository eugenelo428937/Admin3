"""MarkingPaperFeedback model — one feedback per grading."""
from django.db import models


class MarkingPaperFeedback(models.Model):
    RATING_CHOICES = [
        ('E', 'Excellent'),
        ('G', 'Good'),
        ('A', 'Average'),
        ('P', 'Poor'),
    ]

    grading = models.OneToOneField(
        'marking.MarkingPaperGrading',
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    rating = models.CharField(
        max_length=1,
        choices=RATING_CHOICES,
        null=True,
        blank=True,
    )
    comments = models.TextField(blank=True, default='')
    feedback_date = models.DateTimeField()
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_feedbacks"'
        verbose_name = 'Marking Paper Feedback'
        verbose_name_plural = 'Marking Paper Feedbacks'

    def __str__(self):
        return f'Feedback({self.grading_id}) rating={self.rating or "—"}'
