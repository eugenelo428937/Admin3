"""Helpers for Online Classroom detection and shared tutorial-choice validation.

The OC marker lives several joins from a TutorialEvent
(event → store_product → product_product_variation → product_variation
→ variation_type). Rather than encoding this in DB constraints, we keep it
application-side. Both TutorialChoice.clean() and CartTutorialChoice.clean()
will delegate to validate_tutorial_choice_event().
"""
ONLINE_CLASSROOM_VARIATION_TYPE = 'Online Classroom Recording'


def is_online_classroom_event(event) -> bool:
    """True if the event's store_product variation type is Online Classroom."""
    try:
        variation_type = (
            event.store_product
            .product_product_variation
            .product_variation
            .variation_type
        )
    except AttributeError:
        return False
    return variation_type == ONLINE_CLASSROOM_VARIATION_TYPE


def validate_tutorial_choice_event(tutorial_event, line_purchasable):
    """Shared validation rule for cart/order tutorial choice rows.

    Rejects Online Classroom events (auto-enrolment lives elsewhere)
    and rejects subject mismatches between the chosen event and the
    line's purchasable. Raises ``django.core.exceptions.ValidationError``
    on either failure.

    ``line_purchasable`` is whichever ``store.Purchasable`` is on the
    line — for cart it's ``cart_item.purchasable``, for orders it's
    ``order_item.purchasable``. Both reach a ``store.Product`` via
    ``.product`` on the MTI subclass.
    """
    from django.core.exceptions import ValidationError

    if is_online_classroom_event(tutorial_event):
        raise ValidationError({
            'tutorial_event': (
                'Online Classroom events cannot be chosen — '
                'students are auto-enrolled in OC products.'
            )
        })
    try:
        event_subject = (
            tutorial_event.store_product
            .exam_session_subject.subject_id
        )
        line_subject = (
            line_purchasable.product
            .exam_session_subject.subject_id
        )
    except AttributeError:
        return
    if event_subject != line_subject:
        raise ValidationError({
            'tutorial_event': (
                "Event subject does not match the order item's subject."
            ),
        })
