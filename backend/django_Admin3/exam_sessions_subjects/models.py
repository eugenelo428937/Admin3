from django.db import models
from subjects.models import Subject
from products.models.products import Product
from exam_sessions.models import ExamSession


class ExamSessionSubject(models.Model):
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    products = models.ManyToManyField(
        Product, through='exam_sessions_subjects_products.ExamSessionSubjectProduct')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_session_subjects'
        unique_together = ('exam_session', 'subject')
        verbose_name = 'Exam Session Subject'
        verbose_name_plural = 'Exam Session Subjects'

    def __str__(self):
        return f"{self.exam_session.session_code} - {self.subject.code}"
