"""CartTutorialChoice — the student's preference (1st/2nd/3rd) of a
tutorial event captured per cart_item.

Mirrors TutorialChoice (orders side). Same constraints and validation
rules; uses the shared `validate_tutorial_choice_event` helper. The
parent FK uses CASCADE on both sides — cart and order — matching the
parent line's lifecycle.
"""
from django.db import models

from tutorials.services.online_classroom import (
    validate_tutorial_choice_event,
)


class CartTutorialChoice(models.Model):
    CHOICE_RANKS = [(1, '1st'), (2, '2nd'), (3, '3rd')]

    cart_item = models.ForeignKey(
        'cart.CartItem', on_delete=models.CASCADE,
        related_name='tutorial_choices',
    )
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT,
        related_name='cart_tutorial_choices',
    )
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents', on_delete=models.PROTECT,
        related_name='in_cart_choices',
    )
    choice_rank = models.PositiveSmallIntegerField(choices=CHOICE_RANKS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."cart_tutorial_choices"'
        constraints = [
            models.UniqueConstraint(
                fields=['cart_item', 'choice_rank'],
                name='uniq_cart_choice_rank_per_cart_item',
            ),
            models.UniqueConstraint(
                fields=['cart_item', 'tutorial_event'],
                name='uniq_cart_event_per_cart_item',
            ),
            models.CheckConstraint(
                condition=models.Q(choice_rank__in=[1, 2, 3]),
                name='cart_choice_rank_in_1_2_3',
            ),
        ]
        verbose_name = 'Cart Tutorial Choice'
        verbose_name_plural = 'Cart Tutorial Choices'

    def clean(self):
        super().clean()
        # Skip cross-field validation if either FK is missing — the
        # field-level required errors from clean_fields() will be reported
        # separately. Avoids RelatedObjectDoesNotExist when an unsaved
        # instance has an unset FK.
        if not self.cart_item_id or not self.tutorial_event_id:
            return
        validate_tutorial_choice_event(
            self.tutorial_event, self.cart_item.purchasable,
        )

    def __str__(self):
        return (
            f"{self.student} → {self.tutorial_event} "
            f"(#{self.choice_rank}) [cart]"
        )
