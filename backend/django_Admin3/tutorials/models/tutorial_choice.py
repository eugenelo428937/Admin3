"""TutorialChoice — the student's preference (1st/2nd/3rd) of tutorial event
captured per order_item.

Decoupled from TutorialRegistration (the actual enrolment, owned by the
registrations CSV sync). Choices are immutable historical record of intent;
registrations are mutable state.
"""
from django.db import models

from tutorials.services.online_classroom import validate_tutorial_choice_event


class TutorialChoice(models.Model):
    CHOICE_RANKS = [(1, '1st'), (2, '2nd'), (3, '3rd')]

    order_item = models.ForeignKey(
        'orders.OrderItem', on_delete=models.CASCADE, related_name='tutorial_choices',
    )
    # Nullable: an authenticated user without a Student profile may
    # still check out (Q1 — checkout requires only auth_user). The cart
    # row's student FK is copied across as-is by OrderBuilder.
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT, related_name='tutorial_choices',
        null=True, blank=True,
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
        # Cart-side passes cart_item.purchasable; order-side passes
        # order_item.purchasable. Both reach a store.Product via the
        # MTI .product attribute.
        validate_tutorial_choice_event(
            self.tutorial_event, self.order_item.purchasable,
        )

    def __str__(self):
        return f"{self.student} → {self.tutorial_event} (#{self.choice_rank})"
