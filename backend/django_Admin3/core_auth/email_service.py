from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Service for handling email notifications"""
    
    @staticmethod
    def send_order_confirmation(order, recipient_email=None):
        """
        Send order confirmation email
        
        Args:
            order: ActedOrder instance
            recipient_email: Override recipient email (for testing)
        """
        try:
            # Use override email for testing, otherwise use user's email
            to_email = recipient_email or order.user.email
            
            # For testing purposes, let's send to a dummy email first
            # You can replace this with your actual email for testing
            test_email = "eugenelo1030@gmail.com"  # Replace with your email for testing
            
            subject = f"Order Confirmation - Order #{order.id}"
            
            # Create email content
            message = f"""
            Dear {order.user.first_name or order.user.username},
            
            Thank you for your order! Your order has been confirmed.
            
            Order Details:
            Order Number: #{order.id}
            Order Date: {order.created_at.strftime('%Y-%m-%d %H:%M:%S')}
            Total Amount: £{order.total_amount}
            
            Order Items:
            """
            
            # Add order items
            for item in order.items.all():
                message += f"""
            - {item.product.product.fullname}
              Subject: {item.product.exam_session_subject.subject.code}
              Session: {item.product.exam_session_subject.exam_session.session_code}
              Quantity: {item.quantity}
              Price: £{item.actual_price}
            """
            
            message += f"""
            
            We will process your order shortly and send you further updates.
            
            Thank you for choosing ActEd!
            
            Best regards,
            The ActEd Team
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[test_email],  # Send to test email for now
                fail_silently=False,
            )
            
            logger.info(f"Order confirmation email sent for order #{order.id} to {test_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send order confirmation email for order #{order.id}: {str(e)}")
            return False
    
    @staticmethod
    def send_test_email(recipient_email):
        """Send a test email"""
        try:
            subject = "Test Email from ActEd Admin3"
            message = """
            This is a test email from the ActEd Admin3 system.
            
            If you receive this email, the email functionality is working correctly!
            
            Test Details:
            - System: ActEd Admin3
            - Module: Order Confirmation
            - Status: Email system operational
            
            Best regards,
            ActEd Development Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
            
            logger.info(f"Test email sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send test email to {recipient_email}: {str(e)}")
            return False 