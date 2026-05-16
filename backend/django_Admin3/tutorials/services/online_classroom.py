"""Helpers for Online Classroom detection and shared tutorial-choice validation.

Phase 5 Task 4b: TutorialProduct no longer carries a catalog PPV — the
Online Classroom marker lives on the subclass-local ``format`` field
('OC') instead of a deep PPV→variation_type traversal. We keep the
legacy ``ONLINE_CLASSROOM_VARIATION_TYPE`` constant for reference.

Both TutorialChoice.clean() and CartTutorialChoice.clean() delegate to
validate_tutorial_choice_event().
"""
ONLINE_CLASSROOM_VARIATION_TYPE = 'Online Classroom Recording'
ONLINE_CLASSROOM_FORMAT = 'OC'  # TutorialProduct.Format.OC


def is_online_classroom_event(event) -> bool:
    """True if the event's store_product is an Online Classroom tutorial.

    Phase 5 Task 4b: prefer the TutorialProduct.format field; fall back
    to the legacy PPV chain for material rows whose PPV variation_type
    is 'Online Classroom Recording' (legacy data shape).
    """
    store_product = getattr(event, 'store_product', None)
    if store_product is None:
        return False
    # Preferred path: TutorialProduct subclass with format='OC'.
    fmt = getattr(store_product, 'format', None)
    if fmt == ONLINE_CLASSROOM_FORMAT:
        return True
    # Legacy fallback: catalog PPV chain (only resolves for material rows
    # that happen to carry an OC-style variation).
    try:
        ppv = store_product.product_product_variation
        if ppv is None:
            return False
        return ppv.product_variation.variation_type == ONLINE_CLASSROOM_VARIATION_TYPE
    except AttributeError:
        return False


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
