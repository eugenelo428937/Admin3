# backend/django_Admin3/core_auth/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from users.serializers import UserRegistrationSerializer
from cart.views import CartViewSet
from utils.email_service import email_service
from utils.recaptcha_utils import verify_recaptcha_v3, is_recaptcha_enabled, get_client_ip
# Token configuration - now using Django settings directly
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging
from students.models import Student
from django.db import transaction
logger = logging.getLogger(__name__)

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def csrf(self, request):
        """
        Get CSRF token for the current session
        Ensures session is properly established and persisted
        """
        # Ensure session is created if it doesn't exist
        if not request.session.session_key:
            request.session.create()
        
        # Get the CSRF token for this session
        csrf_token = get_token(request)
        
        # Log session info for debugging (development only)
        if settings.DEBUG:
            logger.debug(f"CSRF token generated for session: {request.session.session_key}")
        
        return Response({
            'csrfToken': csrf_token,
            'sessionKey': request.session.session_key  # For debugging purposes
        })

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login user and return JWT tokens
        """
        email = request.data.get('username')
        password = request.data.get('password')

        try:
            # First try to find user by email
            user = User.objects.get(email=email)
            # Then authenticate with their username and password
            user = authenticate(username=user.username, password=password)
            if user:
                # Merge guest cart into user cart after successful login
                CartViewSet().merge_guest_cart(request, user)
                refresh = RefreshToken.for_user(user)
                serializer = UserRegistrationSerializer(user)
                return Response({
                    'token': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': serializer.data
                })
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        Register a new user, create student record, send activation email, and return JWT tokens
        """
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()  # This will now properly handle password hashing
                    
                    # Create associated student record
                    student = Student.objects.create(
                        user=user,
                        student_type='S',
                        apprentice_type='none'
                    )
                
                # Send account activation email
                try:
                    # Generate activation token using Django's built-in token generator
                    token = default_token_generator.make_token(user)
                    
                    # Create URL-safe user ID
                    uid = urlsafe_base64_encode(force_bytes(user.pk))
                    
                    # Create activation URL
                    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')
                    activation_url = f"{frontend_url}/auth/activate?uid={uid}&token={token}"
                    
                    # Prepare activation email data
                    activation_data = {
                        'user': user,
                        'activation_url': activation_url
                    }
                    
                    # Send activation email using existing email service
                    email_success = email_service.send_account_activation(
                        user_email=user.email,
                        activation_data=activation_data,
                        use_mjml=True,
                        enhance_outlook=True,
                        use_queue=True,  # Use queue for better performance
                        user=user
                    )
                    
                    if email_success:
                        logger.info(f"Account activation email sent successfully to {user.email} for user {user.username}")
                    else:
                        logger.warning(f"Account activation email failed to send to {user.email} for user {user.username}")
                        
                except Exception as e:
                    # Log the error but don't fail the registration
                    logger.error(f"Failed to send account activation email for user {user.username}: {str(e)}")
                
                refresh = RefreshToken.for_user(user)
                
                # Include student_ref in response for frontend compatibility
                response_data = serializer.data.copy()
                response_data['student_ref'] = student.student_ref
                
                return Response({
                    'status': 'success',
                    'message': 'Account created successfully! Please check your email for account activation instructions.',
                    'token': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': response_data
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Failed to create user account: {str(e)}")
                return Response(
                    {'status': 'error', 'message': 'Failed to create account. Please try again.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            {'status': 'error', 'errors': serializer.errors}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        """
        Refresh JWT token
        """
        try:
            refresh = RefreshToken(request.data.get('refresh'))
            return Response({
                'token': str(refresh.access_token)
            })
        except Exception as e:
            return Response(
                {'error': 'Invalid refresh token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Logout user and blacklist refresh token
        """
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'status': 'success'})
        except Exception:
            return Response({'status': 'success'})

    @action(detail=False, methods=['post'])
    def password_reset_request(self, request):
        """
        Request password reset - send email with reset link
        Includes reCAPTCHA v3 verification for security
        """
        email = request.data.get('email')
        recaptcha_token = request.data.get('recaptcha_token')
        
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify reCAPTCHA v3 if enabled
        if is_recaptcha_enabled():
            if not recaptcha_token:
                return Response(
                    {'error': 'reCAPTCHA verification is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            client_ip = get_client_ip(request)
            min_score = getattr(settings, 'RECAPTCHA_DEFAULT_MIN_SCORE', 0.5)
            
            verification_result = verify_recaptcha_v3(
                recaptcha_response=recaptcha_token,
                expected_action='password_reset',
                min_score=min_score,
                user_ip=client_ip
            )
            
            if not verification_result['success']:
                logger.warning(f"reCAPTCHA verification failed for password reset: {verification_result.get('error', 'Unknown error')}")
                return Response(
                    {'error': 'reCAPTCHA verification failed. Please try again.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            user = User.objects.get(email=email)
            
            # Generate reset token using Django's built-in token generator (secure)
            token = default_token_generator.make_token(user)
            
            # Create URL-safe user ID
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Create reset URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')
            reset_url = f"{frontend_url}/auth/reset-password?uid={uid}&token={token}"
            
            # Set expiry time with proper priority: Database setting > Django setting > Default
            try:
                from utils.models import EmailSettings
                expiry_hours = EmailSettings.get_setting('password_reset_timeout_hours') or getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 24)
            except Exception:
                # Fallback if database is not available or models not accessible
                expiry_hours = getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 24)
            
            # Prepare email data
            reset_data = {
                'user': user,
                'reset_url': reset_url,
                'expiry_hours': expiry_hours
            }
            
            # Send password reset email using existing email service
            success = email_service.send_password_reset(
                user_email=user.email,
                reset_data=reset_data,
                use_mjml=True,
                enhance_outlook=True,
                use_queue=True,  # Queue for better performance
                user=user
            )
            
            if success:
                logger.info(f"Password reset email queued successfully for user {user.email}")
                return Response({
                    'success': True,
                    'message': f'Password reset instructions have been sent to {email}. The link will expire in {expiry_hours} hours.',
                    'expiry_hours': expiry_hours
                })
            else:
                logger.error(f"Failed to queue password reset email for user {user.email}")
                return Response(
                    {'error': 'Failed to send password reset email. Please try again later.'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except User.DoesNotExist:
            # For security, don't reveal if email exists or not
            # Return success message anyway
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return Response({
                'success': True,
                'message': f'If an account with email {email} exists, password reset instructions have been sent.',
                'expiry_hours': 24  # Default expiry
            })
        except Exception as e:
            logger.error(f"Error during password reset request: {str(e)}")
            return Response(
                {'error': 'An error occurred. Please try again later.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def password_reset_confirm(self, request):
        """
        Confirm password reset with token and set new password
        """
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not all([uid, token, new_password]):
            return Response(
                {'error': 'UID, token, and new password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Verify token using Django's built-in token generator
            if default_token_generator.check_token(user, token):
                # Token is valid, set new password
                user.set_password(new_password)
                user.save()
                
                logger.info(f"Password successfully reset for user {user.email}")
                
                # Send password reset completion email
                try:
                    from django.utils import timezone
                    from utils.email_service import email_service
                    
                    completion_data = {
                        'user': user,
                        'reset_timestamp': timezone.now()
                    }
                    
                    # Send password reset completion email using the email service
                    email_success = email_service.send_password_reset_completed(
                        user_email=user.email,
                        completion_data=completion_data,
                        use_mjml=True,
                        enhance_outlook=True,
                        use_queue=True,  # Queue for better performance
                        user=user
                    )
                    
                    if email_success:
                        logger.info(f"Password reset completion email queued successfully for user {user.email}")
                    else:
                        logger.warning(f"Failed to queue password reset completion email for user {user.email}")
                        
                except Exception as email_error:
                    # Log the email error but don't fail the password reset
                    logger.error(f"Error sending password reset completion email to {user.email}: {str(email_error)}")
                
                return Response({
                    'success': True,
                    'message': 'Password has been reset successfully. You can now login with your new password.'
                })
            else:
                logger.warning(f"Invalid or expired token used for password reset: user {user.email}")
                return Response(
                    {'error': 'Invalid or expired reset token. Please request a new password reset.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            logger.warning(f"Invalid password reset attempt with uid: {uid}")
            return Response(
                {'error': 'Invalid reset link. Please request a new password reset.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error during password reset confirmation: {str(e)}")
            return Response(
                {'error': 'An error occurred. Please try again later.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def account_activation(self, request):
        """
        Activate user account using token sent via email
        """
        uid = request.data.get('uid')
        token = request.data.get('token')
        
        if not uid or not token:
            return Response(
                {'error': 'UID and token are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Verify token
            if default_token_generator.check_token(user, token):
                # Activate user account (assuming is_active field tracks activation)
                if not user.is_active:
                    user.is_active = True
                    user.save()
                    
                    logger.info(f"Account activated successfully for user: {user.email}")
                    
                    return Response({
                        'status': 'success',
                        'message': 'Account activated successfully. You can now log in.'
                    })
                else:
                    return Response({
                        'status': 'info',
                        'message': 'Account is already activated.'
                    })
            else:
                return Response(
                    {'error': 'Invalid or expired activation token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Invalid activation link'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Account activation failed: {str(e)}")
            return Response(
                {'error': 'Account activation failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def send_account_activation(self, request):
        """
        Send account activation email to user
        """
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Only send activation email if account is not already active
            if user.is_active:
                return Response({
                    'status': 'info',
                    'message': 'Account is already activated.'
                })
            
            # Generate activation token
            token = default_token_generator.make_token(user)
            
            # Create URL-safe user ID
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Create activation URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')
            activation_url = f"{frontend_url}/auth/activate?uid={uid}&token={token}"
            
            # Prepare email data
            activation_data = {
                'user': user,
                'activation_url': activation_url
            }
            
            # Send account activation email
            success = email_service.send_account_activation(
                user_email=user.email,
                activation_data=activation_data,
                use_mjml=True,
                enhance_outlook=True,
                use_queue=True,
                user=user
            )
            
            if success:
                logger.info(f"Account activation email sent successfully to: {user.email}")
                return Response({
                    'status': 'success',
                    'message': 'Activation email sent successfully'
                })
            else:
                logger.error(f"Failed to send account activation email to: {user.email}")
                return Response(
                    {'error': 'Failed to send activation email'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except User.DoesNotExist:
            # For security, don't reveal whether email exists
            return Response({
                'status': 'success',
                'message': 'If the email exists, an activation link will be sent'
            })
        except Exception as e:
            logger.error(f"Send account activation failed: {str(e)}")
            return Response(
                {'error': 'Failed to send activation email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def verify_email(self, request):
        """
        Verify new email address using token sent via email
        """
        uid = request.data.get('uid')
        token = request.data.get('token')
        # Accept both 'email' and 'new_email' for flexibility
        new_email = request.data.get('email') or request.data.get('new_email')
        
        if not uid or not token or not new_email:
            return Response(
                {'error': 'UID, token, and email are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            logger.info(f"Email verification attempt - User: {user.username}, Token: {token[:10]}..., New Email: {new_email}")
            
            # Check if email is already in use by another user
            if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                logger.warning(f"Email verification failed - {new_email} already in use")
                return Response(
                    {'error': 'Email address is already in use by another account'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify token (we can reuse the same token generator for simplicity)
            if default_token_generator.check_token(user, token):
                # Update user's email
                old_email = user.email
                user.email = new_email
                user.save()
                
                # Update UserProfile email if it exists
                try:
                    from userprofile.models.user_profile import UserProfile
                    profile = UserProfile.objects.get(user=user)
                    # Update primary email or add new email record as needed
                    # This depends on your specific UserProfile email structure
                except UserProfile.DoesNotExist:
                    pass
                except Exception as profile_error:
                    logger.warning(f"Could not update UserProfile for {user.username}: {str(profile_error)}")
                
                logger.info(f"Email updated successfully from {old_email} to {new_email} for user: {user.username}")
                
                return Response({
                    'status': 'success',
                    'message': 'Email address verified and updated successfully'
                })
            else:
                logger.warning(f"Token validation failed for user {user.username} with token {token[:10]}...")
                
                # Check if this might be a timing issue - tokens are only valid for a limited time
                from django.conf import settings
                timeout_hours = getattr(settings, 'PASSWORD_RESET_TIMEOUT_HOURS', 24)
                
                return Response(
                    {
                        'error': f'Invalid or expired verification token. Please request a new verification email. Tokens expire after {timeout_hours} hours.'
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            logger.warning(f"Invalid verification link with uid: {uid}")
            return Response(
                {'error': 'Invalid verification link. Please request a new verification email.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Email verification failed: {str(e)}")
            return Response(
                {'error': 'Email verification failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def send_email_verification(self, request):
        """
        Send email verification when user updates their email in profile
        """
        new_email = request.data.get('new_email')
        
        if not new_email:
            return Response(
                {'error': 'New email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if email is already in use
        if User.objects.filter(email=new_email).exclude(pk=request.user.pk).exists():
            return Response(
                {'error': 'Email address is already in use'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = request.user
            
            # Generate verification token
            token = default_token_generator.make_token(user)
            
            # Create URL-safe user ID
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Create verification URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')
            verification_url = f"{frontend_url}/auth/verify-email?uid={uid}&token={token}&email={new_email}"
            
            # Get expiry hours from settings
            try:
                from utils.models import EmailSettings
                expiry_hours = EmailSettings.get_setting('email_verification_timeout_hours') or getattr(settings, 'EMAIL_VERIFICATION_TIMEOUT_HOURS', 24)
            except Exception:
                expiry_hours = getattr(settings, 'EMAIL_VERIFICATION_TIMEOUT_HOURS', 24)
            
            # Prepare email data
            verification_data = {
                'user': user,
                'verification_email': new_email,
                'verification_url': verification_url,
                'expiry_hours': expiry_hours,
                'verification_timestamp': timezone.now()
            }
            
            logger.info(f"Generating email verification for user {user.username} - Token: {token[:10]}..., New Email: {new_email}")
            
            # Send email verification to the NEW email address
            success = email_service.send_email_verification(
                user_email=new_email,  # Send to new email address
                verification_data=verification_data,
                use_mjml=True,
                enhance_outlook=True,
                use_queue=True,
                user=user
            )
            
            if success:
                logger.info(f"Email verification sent successfully to: {new_email} for user: {user.email}")
                return Response({
                    'status': 'success',
                    'message': f'Verification email sent to {new_email}. Please check your inbox. The link will expire in {expiry_hours} hours.',
                    'expiry_hours': expiry_hours
                })
            else:
                logger.error(f"Failed to send email verification to: {new_email} for user: {user.email}")
                return Response(
                    {'error': 'Failed to send verification email'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except Exception as e:
            logger.error(f"Send email verification failed: {str(e)}")
            return Response(
                {'error': 'Failed to send verification email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_email(request):
    """Test endpoint to send a test email"""
    try:
        recipient_email = request.data.get('email', 'eugenelo1030@gmail.com')
        # Send a test order confirmation email
        test_order_data = {
            'customer_name': 'Test User',
            'order_number': 'TEST-001',
            'total_amount': 99.99,
            'created_at': '2024-01-01',
            'items': [{
                'product_name': 'Test Product',
                'subject_code': 'TEST',
                'session_code': 'DEC24',
                'quantity': 1,
                'actual_price': 99.99,
                'line_total': 99.99,
            }]
        }
        success = email_service.send_order_confirmation(recipient_email, test_order_data)
        
        if success:
            return Response({
                'message': f'Test email sent successfully to {recipient_email}',
                'success': True
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'message': 'Failed to send test email',
                'success': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'message': f'Error: {str(e)}',
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Token configuration helper function
def get_token_expiry_hours(token_type):
    """Get token expiry time in hours for the specified token type from Django settings."""
    setting_name = f"TOKEN_EXPIRY_{token_type.upper()}_HOURS"
    return getattr(settings, setting_name, 24)  # Default 24 hours
