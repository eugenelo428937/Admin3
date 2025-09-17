from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_str, force_bytes
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.contrib import logger
from userprofile.models.user_profile import UserProfile

class ActivationEmailViews:
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
        new_email = request.data.get('email')
        
        if not uid or not token or not new_email:
            return Response(
                {'error': 'UID, token, and email are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
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
                
                logger.info(f"Email updated successfully from {old_email} to {new_email} for user: {user.username}")
                
                return Response({
                    'status': 'success',
                    'message': 'Email address verified and updated successfully'
                })
            else:
                return Response(
                    {'error': 'Invalid or expired verification token'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except (ValueError, User.DoesNotExist):
            return Response(
                {'error': 'Invalid verification link'}, 
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
            
            # Prepare email data
            verification_data = {
                'user': user,
                'verification_email': new_email,
                'verification_url': verification_url,
                'expiry_hours': 24,
                'verification_timestamp': timezone.now()
            }
            
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
                    'message': f'Verification email sent to {new_email}. Please check your inbox.'
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