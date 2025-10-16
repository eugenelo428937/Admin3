import requests
import json
import logging
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from cart.models import ActedOrderPayment, Cart, CartItem
from marking_vouchers.models import MarkingVoucher

logger = logging.getLogger(__name__)

class OpayoPaymentService:
    """Service for handling Opayo payment processing"""
    
    def __init__(self):
        self.test_mode = getattr(settings, 'OPAYO_TEST_MODE', True)
        self.vendor_name = getattr(settings, 'OPAYO_VENDOR_NAME', 'sandboxEC')
        self.integration_key = getattr(
            settings, 'OPAYO_INTEGRATION_KEY', 'hJYxsw7HLbj40cB8udES8CDRFLhuJ8G54O6rDpUXvE6hYDrria')
        self.integration_password = getattr(
            settings, 'OPAYO_INTEGRATION_PASSWORD', 'o2iHSrFybYMZpmWOQMuhsXP52V4fBtpuSDshrKDSWsBY1OiN6hwd9Kb12z4j5Us5u')
        
        self.base_url = getattr(
            settings, 'OPAYO_BASE_URL', 'https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages')

    
    def process_card_payment(self, order, card_data, client_ip, user_agent):
        """
        Process a card payment through Opayo
        
        Args:
            order: ActedOrder instance
            card_data: Dict containing card details
            client_ip: Client IP address
            user_agent: User agent string
            
        Returns:
            dict: Payment result with success status and details
        """
        try:
            # Create payment record
            payment = ActedOrderPayment.objects.create(
                order=order,
                payment_method='card',
                amount=order.total_amount,
                currency='GBP',
                client_ip=client_ip,
                user_agent=user_agent,
                status='processing'
            )
            
            # Prepare Opayo request
            opayo_request = {
                "transactionDetails": {
                    "transactionType": "Payment",
                    "vendorName": "abc0000",
                    "vendorTxCode": "Demo.Transaction-99",
                    "amount": 567,
                    "currency": "GBP",
                    "description": "Demo Transaction",
                    "customerFirstName": "Spongebob",
                    "customerLastName": "Squarepants",
                    "customerEmail": "sam.jones@example.com",
                    "customerPhone": "+443069990210",
                    "billingAddress": {
                        "address1": "407 St. John Street",
                        "address2": "string",
                        "address3": "string",
                        "city": "London",
                        "postalCode": "EC1V 4AB",
                        "country": "GB",
                        "state": "st"
                    },
                    "shippingDetails": {
                        "recipientFirstName": "Sam",
                        "recipientLastName": "Jones",
                        "shippingAddress1": "407 St. John Street",
                        "shippingAddress2": "string",
                        "shippingAddress3": "string",
                        "shippingCity": "London",
                        "shippingPostalCode": "EC1V 4AB",
                        "shippingCountry": "GB",
                        "shippingState": "st"
                    },
                    "fiRecipient": {
                        "accountNumber": "1234567890",
                        "surname": "Surname",
                        "postcode": "EC1V 8AB",
                        "dateOfBirth": "19900101"
                    },
                    "referrerId": "f9979593-a390-4069-b126-7914783fc",
                    "settlementReferenceText": "123456GRTY234",
                    "supportedPaymentMethods": {
                        "card": {
                            "enabled": False,
                            "cardToken": "abad1afb-fb41-45cd-a853-36a45e269fb1",
                            "enableSaveCard": False
                        }
                    }
                },
                "customerDataCapture": {
                    "captureAmount": False,
                    "captureBillingAddress": False,
                    "captureShippingAddress": False,
                    "captureFiData": False,
                    "capturePhone": False,
                    "captureEmail": True
                },
                "presentation": {
                    "id": "string",
                    "themeCustomisation": {
                        "primaryColour": "#AABB00",
                        "secondaryColour": "#CCDD00",
                        "submitColour": "#DDEE00"
                    },
                    "componentVisibility": {
                        "displayLanguageSelector": True,
                        "displayCardLogos": False,
                        "displayVendorLogo": False,
                        "displayDescription": True,
                        "displayAmount": True,
                        "displayTerms": False,
                        "displayBasket": False
                    },
                    "language": {
                        "preselectedLanguage": "en",
                        "supportedLanguages": {
                            "property1": {
                                "labels": {
                                    "pay": "Pay now",
                                    "cancelPay": "Cancel"
                                }
                            },
                            "property2": {
                                "labels": {
                                    "pay": "Pay now",
                                    "cancelPay": "Cancel"
                                }
                            }
                        },
                        "supportedLanguageList": "en"
                    },
                    "termsLink": "string",
                    "merchantDomain": "string"
                },
                "outcomeReport": {
                    "redirectUrls": {
                        "cancelUrl": "https://www.example.com/cancel",
                        "failureUrl": "https://www.example.com/fail",
                        "expiryUrl": "https://www.example.com/expired",
                        "successUrl": "https://www.example.com/success"
                    },
                    "postProcessNotification": {
                        "sendVendorEmail": False,
                        "sendCustomerEmail": False
                    }
                }
            }
            
            # Make request to Opayo
            response = requests.post(
                f"{self.base_url}/transactions",
                headers={
                    'Authorization': f'Basic {self._get_auth_header()}',
                    'Content-Type': 'application/json'
                },
                json=opayo_request,
                timeout=30
            )
            
            # Parse response
            response_data = response.json()
            # Update payment record
            payment.opayo_response = response_data
            payment.opayo_status_code = response_data.get('statusCode')
            payment.opayo_status_detail = response_data.get('statusDetail')
            
            if response.status_code == 200 and response_data.get('statusCode') == '0000':
                # Payment successful
                payment.status = 'completed'
                payment.transaction_id = response_data.get('transactionId')
                payment.processed_at = timezone.now()
                payment.save()

                return {
                    'success': True,
                    'payment_id': payment.id,
                    'transaction_id': payment.transaction_id,
                    'message': 'Payment processed successfully'
                }
            else:
                # Payment failed
                payment.status = 'failed'
                payment.error_message = response_data.get('statusDetail', 'Payment failed')
                payment.error_code = response_data.get('statusCode', 'UNKNOWN')
                payment.save()
                
                logger.error(f"Payment failed for order {order.id}: {response_data.get('statusDetail')}")
                
                return {
                    'success': False,
                    'payment_id': payment.id,
                    'error_message': response_data.get('statusDetail', 'Payment failed'),
                    'error_code': response_data.get('statusCode', 'UNKNOWN')
                }
                
        except Exception as e:
            logger.error(f"Error processing payment for order {order.id}: {str(e)}")
            
            # Update payment record with error
            if 'payment' in locals():
                payment.status = 'failed'
                payment.error_message = str(e)
                payment.error_code = 'EXCEPTION'
                payment.save()
            
            return {
                'success': False,
                'error_message': 'Payment processing error',
                'error_code': 'EXCEPTION'
            }
    
    def process_invoice_payment(self, order, client_ip, user_agent):
        """
        Process an invoice payment (no immediate payment required)
        
        Args:
            order: ActedOrder instance
            client_ip: Client IP address
            user_agent: User agent string
            
        Returns:
            dict: Payment result
        """
        try:
            payment = ActedOrderPayment.objects.create(
                order=order,
                payment_method='invoice',
                amount=order.total_amount,
                currency='GBP',
                client_ip=client_ip,
                user_agent=user_agent,
                status='pending'
            )

            return {
                'success': True,
                'payment_id': payment.id,
                'message': 'Invoice payment request created'
            }
            
        except Exception as e:
            logger.error(f"Error creating invoice payment for order {order.id}: {str(e)}")
            return {
                'success': False,
                'error_message': 'Failed to create invoice payment',
                'error_code': 'EXCEPTION'
            }
    
    def _get_merchant_session_key(self):
        """Get merchant session key from Opayo"""
        # This is a simplified implementation
        # In production, you would need to implement proper session key management
        return "test_session_key"
    
    def _get_card_identifier(self, card_data):
        """Get card identifier from Opayo"""
        # This is a simplified implementation
        # In production, you would need to implement proper card tokenization
        return "test_card_identifier"
    
    def _get_auth_header(self):
        """Get authorization header for Opayo API"""
        import base64
        credentials = f"{self.integration_key}:{self.integration_password}"
        return base64.b64encode(credentials.encode()).decode()

class DummyPaymentService:
    """Dummy payment service for local development and testing."""
    def process_card_payment(self, order, card_data, client_ip, user_agent):
        # Simulate a failure if card number ends with '0002', else success
        card_number = card_data.get('card_number', '')
        if card_number.endswith('0002'):
            payment = ActedOrderPayment.objects.create(
                order=order,
                payment_method='card',
                amount=order.total_amount,
                currency='GBP',
                client_ip=client_ip,
                user_agent=user_agent,
                status='failed',
                transaction_id='DUMMYFAIL',
                opayo_response={'dummy': True, 'status': 'failed'},
                error_message='Dummy card declined',
                error_code='DECLINED',
            )
            return {
                'success': False,
                'payment_id': payment.id,
                'error_message': 'Dummy card declined',
                'error_code': 'DECLINED'
            }
        else:
            payment = ActedOrderPayment.objects.create(
                order=order,
                payment_method='card',
                amount=order.total_amount,
                currency='GBP',
                client_ip=client_ip,
                user_agent=user_agent,
                status='completed',
                transaction_id='DUMMY123456',
                opayo_response={'dummy': True, 'status': 'success'},
            )
            return {
                'success': True,
                'payment_id': payment.id,
                'transaction_id': payment.transaction_id,
                'message': 'Dummy payment processed successfully'
            }

    def process_invoice_payment(self, order, client_ip, user_agent):
        payment = ActedOrderPayment.objects.create(
            order=order,
            payment_method='invoice',
            amount=order.total_amount,
            currency='GBP',
            client_ip=client_ip,
            user_agent=user_agent,
            status='pending',
            opayo_response={'dummy': True, 'status': 'invoice'},
        )
        return {
            'success': True,
            'payment_id': payment.id,
            'message': 'Dummy invoice payment created'
        }

class CartService:
    """Service for handling cart operations"""
    
    def add_marking_voucher(self, cart, voucher_id, quantity=1):
        """
        Add a marking voucher to the cart
        
        Args:
            cart: Cart instance
            voucher_id: ID of the marking voucher
            quantity: Number of vouchers to add
            
        Returns:
            CartItem: The created or updated cart item
        """
        try:
            voucher = MarkingVoucher.objects.get(id=voucher_id, is_active=True)
            
            # Check if voucher is available
            if not voucher.is_available:
                raise ValueError("Voucher is not available")
            
            # Check if voucher is already in cart
            existing_item = CartItem.objects.filter(
                cart=cart,
                marking_voucher=voucher,
                item_type='marking_voucher'
            ).first()
            
            if existing_item:
                # Update quantity
                existing_item.quantity += quantity
                existing_item.save()
                return existing_item
            else:
                # Create new cart item
                cart_item = CartItem.objects.create(
                    cart=cart,
                    marking_voucher=voucher,
                    item_type='marking_voucher',
                    quantity=quantity,
                    actual_price=voucher.price
                )
                return cart_item
                
        except MarkingVoucher.DoesNotExist:
            raise ValueError("Marking voucher not found")
    
    def remove_marking_voucher(self, cart, voucher_id):
        """
        Remove a marking voucher from the cart
        
        Args:
            cart: Cart instance
            voucher_id: ID of the marking voucher to remove
            
        Returns:
            bool: True if item was removed, False if not found
        """
        try:
            cart_item = CartItem.objects.get(
                cart=cart,
                marking_voucher_id=voucher_id,
                item_type='marking_voucher'
            )
            cart_item.delete()
            return True
        except CartItem.DoesNotExist:
            return False
    
    def update_marking_voucher_quantity(self, cart, voucher_id, quantity):
        """
        Update the quantity of a marking voucher in the cart
        
        Args:
            cart: Cart instance
            voucher_id: ID of the marking voucher
            quantity: New quantity
            
        Returns:
            CartItem: Updated cart item
        """
        try:
            cart_item = CartItem.objects.get(
                cart=cart,
                marking_voucher_id=voucher_id,
                item_type='marking_voucher'
            )
            
            if quantity <= 0:
                cart_item.delete()
                return None
            
            # Check if voucher is still available
            if not cart_item.marking_voucher.is_available:
                raise ValueError("Voucher is no longer available")
            
            cart_item.quantity = quantity
            cart_item.save()
            return cart_item
            
        except CartItem.DoesNotExist:
            raise ValueError("Marking voucher not found in cart")
    
    def get_cart_total(self, cart):
        """
        Calculate the total cost of items in the cart

        Args:
            cart: Cart instance

        Returns:
            dict: Cart totals with breakdown
        """
        from vat.service import calculate_vat_for_cart

        items = cart.items.all()

        product_subtotal = Decimal('0.00')
        voucher_subtotal = Decimal('0.00')

        for item in items:
            item_total = item.actual_price * item.quantity

            if item.item_type == 'marking_voucher':
                voucher_subtotal += item_total
            else:
                product_subtotal += item_total

        subtotal = product_subtotal + voucher_subtotal

        # Calculate VAT using new VAT service (replaces hardcoded 20% VAT)
        vat_result = calculate_vat_for_cart(cart.user, cart)
        totals = vat_result.get('vat_calculations', {}).get('totals', {})

        # Convert string values back to Decimal for consistency
        vat_amount = Decimal(totals.get('total_vat', '0.00'))
        total = Decimal(totals.get('total_gross', str(subtotal)))

        # Calculate effective VAT rate for backward compatibility
        vat_rate = (vat_amount / subtotal).quantize(Decimal('0.01')) if subtotal > 0 else Decimal('0.00')

        return {
            'product_subtotal': product_subtotal,
            'voucher_subtotal': voucher_subtotal,
            'subtotal': subtotal,
            'vat_rate': vat_rate,
            'vat_amount': vat_amount,
            'total': total
        }


# Select payment service based on settings
if getattr(settings, 'USE_DUMMY_PAYMENT_GATEWAY', False):
    payment_service = DummyPaymentService()
else:
    payment_service = OpayoPaymentService() 