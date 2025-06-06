from django.db import models
from exam_sessions_subjects_products.models import ExamSessionSubjectProductVariation

class TutorialEvent(models.Model):
    """
    Simplified Tutorial Event model
    """
    code = models.CharField(max_length=100, unique=True)
    venue = models.CharField(max_length=255)
    is_soldout = models.BooleanField(default=False)
    finalisation_date = models.DateField(null=True, blank=True)
    remain_space = models.IntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    exam_session_subject_product_variation = models.ForeignKey(
        ExamSessionSubjectProductVariation,
        on_delete=models.CASCADE,
        related_name='tutorial_events'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = 'acted_tutorial_events'
        ordering = ['start_date', 'code']
        verbose_name = 'Tutorial Event'
        verbose_name_plural = 'Tutorial Events'

    @property
    def subject_code(self):
        """Get subject code through relationship chain"""
        return self.exam_session_subject_product_variation.exam_session_subject_product.exam_session_subject.subject.code

    def __str__(self):
        return f"{self.code} - {self.venue}"
