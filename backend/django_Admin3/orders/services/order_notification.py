import logging

logger = logging.getLogger(__name__)


def send_order_confirmation(order, user):
    """Send order confirmation email using the email management system.

    Args:
        order: Order instance
        user: User who placed the order
    """
    try:
        from email_system.services.email_service import email_service

        # Get user country for dynamic content rules
        user_country = _get_user_country(user)

        order_data = _build_order_email_data(order, user, user_country)

        email_service.send_order_confirmation(
            to_email=user.email,
            order_data=order_data,
        )
        logger.info(f"Order confirmation email queued for order {order.id}")

    except Exception as e:
        logger.error(f"Failed to send order confirmation for order {order.id}: {str(e)}")
        # Don't re-raise — email failure should not break checkout


def _get_user_country(user) -> str:
    try:
        if hasattr(user, 'userprofile'):
            home_address = user.userprofile.addresses.filter(address_type='HOME').first()
            if home_address:
                return home_address.country
    except Exception as e:
        logger.warning(f"Could not get user country: {str(e)}")
    return "United Kingdom"


def _build_order_email_data(order, user, user_country: str) -> dict:
    order_data = {
        'customer_name': user.get_full_name() or user.username,
        'first_name': user.first_name or user.username,
        'last_name': user.last_name or '',
        'student_number': getattr(user, 'student_number', None) or str(user.id),
        'order_number': f"ORD-{order.id:06d}",
        'total_amount': float(order.total_amount),
        'subtotal': float(order.subtotal),
        'vat_amount': float(order.vat_amount),
        'created_at': order.created_at,
        'user': {
            'country': user_country,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'email': user.email,
        },
        'items': [],
    }

    for item in order.items.all():
        item_data = {
            'quantity': item.quantity,
            'actual_price': float(item.actual_price) if item.actual_price else 0,
            'line_total': float(item.actual_price * item.quantity) if item.actual_price else 0,
            'price_type': item.price_type,
            'metadata': item.metadata or {},
        }

        if item.product:
            item_data.update({
                'name': item.product.product.fullname if hasattr(item.product, 'product') else str(item.product),
                'product_name': item.product.product.fullname if hasattr(item.product, 'product') else str(item.product),
            })
        elif item.item_type == 'fee':
            item_data['name'] = item.metadata.get('fee_name', 'Fee')
        else:
            item_data['name'] = 'Item'

        order_data['items'].append(item_data)

    order_data['item_count'] = len(order_data['items'])
    order_data['total_items'] = sum(i['quantity'] for i in order_data['items'])
    return order_data
