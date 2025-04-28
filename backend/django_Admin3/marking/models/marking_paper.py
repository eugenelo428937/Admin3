from django.db import models
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

class MarkingPaper(models.Model):
    exam_session_subject_product = models.ForeignKey(
        ExamSessionSubjectProduct, on_delete=models.CASCADE, related_name='marking_papers'
    )
    name = models.CharField(max_length=10)
    deadline = models.DateTimeField()
    recommended_submit_date = models.DateTimeField()

    class Meta:
        db_table = 'acted_marking_paper'

    def __str__(self):
        return f"{self.name} ({self.exam_session_subject_product})"
