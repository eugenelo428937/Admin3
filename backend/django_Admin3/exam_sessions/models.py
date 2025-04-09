# exam_sessions/models.py
from django.db import models

class ExamSession(models.Model):
    session_code = models.CharField(max_length=50, null=False)
    start_date = models.DateTimeField(null=False)
    end_date = models.DateTimeField(null=False)
    create_date = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_sessions'
        verbose_name = 'Exam Session'
        verbose_name_plural = 'Exam Sessions'

    def __str__(self):
        return f"{self.session_code} ({self.start_date} - {self.end_date})"
