"""Helper: detect whether a TutorialEvent is an Online Classroom variant.

The OC marker lives several joins from a TutorialEvent
(event → store_product → product_product_variation → product_variation
→ variation_type). Rather than encoding this in DB constraints, we keep it
application-side and check it via TutorialChoice.clean() / API serializers.
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
