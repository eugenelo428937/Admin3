from django.db import models
from exam_sessions_subjects.models import ExamSessionSubject
from products.models.products import Product

class ExamSessionSubjectProduct(models.Model):
    exam_session_subject = models.ForeignKey(
        ExamSessionSubject, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_session_subject_products'
        unique_together = ('exam_session_subject', 'product')
        verbose_name = 'Exam Session Subject Product'
        verbose_name_plural = 'Exam Session Subject Products'

    def __str__(self):
        return f"{self.exam_session_subject} - {self.product.code}"
