"""
MarkingPaperFeedback model.

Student feedback on the marking they received. One feedback per grading.
The student is derivable via `feedback.grading.submission.student` — no
separate student FK needed because Submission → Grading → Feedback is 1:1:1.
"""
from django.db import models


class MarkingPaperFeedback(models.Model):
    GRADE_CHOICES = [
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
    grade = models.CharField(
        max_length=1,
        choices=GRADE_CHOICES,
        null=True,
        blank=True,
    )
    comments = models.TextField(blank=True, default='')
    submission_date = models.DateTimeField()
    hub_download_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_feedbacks"'
        verbose_name = 'Marking Paper Feedback'
        verbose_name_plural = 'Marking Paper Feedbacks'

    def __str__(self):
        return f'Feedback({self.grading_id}) grade={self.grade or "—"}'
