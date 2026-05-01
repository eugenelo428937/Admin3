"""TutorialChoice — the student's preference (1st/2nd/3rd) of tutorial event
captured per order_item.

Decoupled from TutorialRegistration (the actual enrolment, owned by the
registrations CSV sync). Choices are immutable historical record of intent;
registrations are mutable state.
"""
from django.core.exceptions import ValidationError
from django.db import models

from tutorials.services.online_classroom import is_online_classroom_event


class TutorialChoice(models.Model):
    CHOICE_RANKS = [(1, '1st'), (2, '2nd'), (3, '3rd')]

    order_item = models.ForeignKey(
        'orders.OrderItem', on_delete=models.CASCADE, related_name='tutorial_choices',
    )
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT, related_name='tutorial_choices',
    )
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents', on_delete=models.PROTECT, related_name='chosen_by',
    )
    choice_rank = models.PositiveSmallIntegerField(choices=CHOICE_RANKS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_choices"'
        constraints = [
            models.UniqueConstraint(
                fields=['order_item', 'choice_rank'],
                name='uniq_choice_rank_per_order_item',
            ),
            models.UniqueConstraint(
                fields=['order_item', 'tutorial_event'],
                name='uniq_event_per_order_item',
            ),
            models.CheckConstraint(
                condition=models.Q(choice_rank__in=[1, 2, 3]),
                name='choice_rank_in_1_2_3',
            ),
        ]
        verbose_name = 'Tutorial Choice'
        verbose_name_plural = 'Tutorial Choices'

    def clean(self):
        super().clean()
        if is_online_classroom_event(self.tutorial_event):
            raise ValidationError({
                'tutorial_event': 'Online Classroom events cannot be chosen — '
                                  'students are auto-enrolled in OC products.'
            })
        try:
            event_subject = self.tutorial_event.store_product.exam_session_subject.subject_id
            order_subject = (
                self.order_item.purchasable.product.exam_session_subject.subject_id
            )
        except AttributeError:
            return
        if event_subject != order_subject:
            raise ValidationError({
                'tutorial_event': "Event subject does not match the order item's subject.",
            })

    def __str__(self):
        return f"{self.student} → {self.tutorial_event} (#{self.choice_rank})"
