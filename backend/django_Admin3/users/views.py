from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import transaction
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.utils import timezone
from .serializers import UserRegistrationSerializer
from students.models import Student
from userprofile.models import UserProfile, UserProfileAddress, UserProfileContactNumber, UserProfileEmail
from email_system.services.email_service import email_service
import logging

logger = logging.getLogger(__name__)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """Create a new user with full registration functionality including account activation email."""
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    user = serializer.save()
                    
                    # Create associated student record
                    student = Student.objects.create(
                        user=user,
                        student_type='S',
                        apprentice_type='none'
                    )
                    
                    # Send account activation email
                    try:
                        # Generate activation URL (placeholder for now - you'll need to implement token generation)
                        activation_url = f"{getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')}/auth/activate?email={user.email}"
                        
                        activation_data = {
                            'user': user,
                            'activation_url': activation_url,
                        }
                        
                        # Send activation email using the email service
                        email_sent = email_service.send_account_activation(
                            user_email=user.email,
                            activation_data=activation_data,
                            use_mjml=True,
                            enhance_outlook=True,
                            use_queue=True,  # Queue for better performance
                            user=user
                        )
                        
                        if email_sent:
                            pass
                        else:
                            logger.warning(f"Failed to send account activation email to {user.email}")
                            
                    except Exception as e:
                        logger.error(f"Error sending activation email: {str(e)}")
                        # Don't fail the registration, just log the error
                    
                    return Response({
                        'status': 'success',
                        'message': 'User created successfully. Please check your email for activation instructions.',
                        'user': serializer.data,
                        'student_ref': student.student_ref
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'status': 'error',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to create user account'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """Get current user's profile data"""
        try:
            user = request.user
            profile = user.userprofile
            
            # Get addresses
            home_address = profile.addresses.filter(address_type='HOME').first()
            work_address = profile.addresses.filter(address_type='WORK').first()
            
            # Get contact numbers with country codes
            contact_numbers = {}
            for contact in profile.contact_numbers.all():
                key_prefix = contact.contact_type.lower()
                contact_numbers[f'{key_prefix}_phone'] = contact.number
                contact_numbers[f'{key_prefix}_phone_country'] = contact.country_code
            
            # Get emails
            emails = {}
            for email in profile.emails.all():
                emails[email.email_type.lower() + '_email'] = email.email
            
            # Prepare address data from JSON format with fallback to old fields
            home_address_data = {}
            if home_address:
                if home_address.address_data:
                    home_address_data = home_address.address_data.copy()
                    home_address_data['country'] = home_address.country
                else:
                    # Fallback to old fields for backward compatibility
                    home_address_data = {
                        'building': home_address.building or '',
                        'street': home_address.street or '',
                        'district': home_address.district or '',
                        'town': home_address.town or '',
                        'county': home_address.county or '',
                        'postcode': home_address.postcode or '',
                        'state': home_address.state or '',
                        'country': home_address.country or '',
                    }
            
            work_address_data = {}
            if work_address:
                if work_address.address_data:
                    work_address_data = work_address.address_data.copy()
                    work_address_data['country'] = work_address.country
                    work_address_data['company'] = work_address.company or ''
                    work_address_data['department'] = work_address.department or ''
                else:
                    # Fallback to old fields for backward compatibility
                    work_address_data = {
                        'company': work_address.company or '',
                        'department': work_address.department or '',
                        'building': work_address.building or '',
                        'street': work_address.street or '',
                        'district': work_address.district or '',
                        'town': work_address.town or '',
                        'county': work_address.county or '',
                        'postcode': work_address.postcode or '',
                        'state': work_address.state or '',
                        'country': work_address.country or '',
                    }
            
            profile_data = {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active,
                },
                'profile': {
                    'title': profile.title or '',
                    'send_invoices_to': profile.send_invoices_to,
                    'send_study_material_to': profile.send_study_material_to,
                    'remarks': profile.remarks or '',
                },
                'home_address': home_address_data,
                'work_address': work_address_data,
                'contact_numbers': contact_numbers,
                'emails': emails
            }
            
            return Response({
                'status': 'success',
                'data': profile_data
            })
            
        except Exception as e:
            logger.error(f"Error fetching user profile: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to fetch profile'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """Update current user's profile"""
        try:
            with transaction.atomic():
                user = request.user
                data = request.data
                
                # Track if email changed for verification
                original_email = user.email
                email_changed = False
                new_email = None
                
                # Update user fields
                user_data = data.get('user', {})
                if 'first_name' in user_data:
                    user.first_name = user_data['first_name']
                if 'last_name' in user_data:
                    user.last_name = user_data['last_name']
                if 'email' in user_data and user_data['email'] != original_email:
                    # Check if email is already in use
                    if User.objects.filter(email=user_data['email']).exclude(pk=user.pk).exists():
                        return Response({
                            'status': 'error',
                            'message': 'Email address is already in use'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    new_email = user_data['email']
                    email_changed = True
                    # Don't update email immediately, wait for verification
                    
                user.save()
                
                # Update profile
                profile = user.userprofile
                profile_data = data.get('profile', {})
                if 'title' in profile_data:
                    profile.title = profile_data['title']
                if 'send_invoices_to' in profile_data:
                    profile.send_invoices_to = profile_data['send_invoices_to']
                if 'send_study_material_to' in profile_data:
                    profile.send_study_material_to = profile_data['send_study_material_to']
                if 'remarks' in profile_data:
                    profile.remarks = profile_data['remarks']
                profile.save()
                
                # Update home address (using JSON format)
                home_address_data = data.get('home_address', {})
                if home_address_data:
                    home_address, created = UserProfileAddress.objects.get_or_create(
                        user_profile=profile,
                        address_type='HOME',
                        defaults={'address_data': {}, 'country': ''}
                    )
                    
                    # Store as JSON, excluding company/department fields
                    address_json = {}
                    for field, value in home_address_data.items():
                        if field not in ['company', 'department'] and value:
                            address_json[field] = value
                    
                    home_address.address_data = address_json
                    home_address.country = home_address_data.get('country', '')
                    
                    # Update old fields for backward compatibility
                    for field in ['building', 'street', 'district', 'town', 'county', 'postcode', 'state']:
                        if field in home_address_data:
                            setattr(home_address, field, home_address_data[field])
                    
                    home_address.save()
                
                # Update work address (using JSON format)
                work_address_data = data.get('work_address', {})
                if work_address_data:
                    work_address, created = UserProfileAddress.objects.get_or_create(
                        user_profile=profile,
                        address_type='WORK',
                        defaults={'address_data': {}, 'country': ''}
                    )
                    
                    # Store as JSON
                    address_json = {}
                    for field, value in work_address_data.items():
                        if value:
                            address_json[field] = value
                    
                    work_address.address_data = address_json
                    work_address.country = work_address_data.get('country', '')
                    work_address.company = work_address_data.get('company', '')
                    work_address.department = work_address_data.get('department', '')
                    
                    # Update old fields for backward compatibility
                    for field in ['building', 'street', 'district', 'town', 'county', 'postcode', 'state']:
                        if field in work_address_data:
                            setattr(work_address, field, work_address_data[field])
                    
                    work_address.save()
                
                # Update contact numbers with country codes
                contact_numbers = data.get('contact_numbers', {})
                for contact_type_key, number in contact_numbers.items():
                    # Skip country code keys - we process them with their phone counterpart
                    if contact_type_key.endswith('_phone_country'):
                        continue
                    if contact_type_key.endswith('_phone'):
                        contact_type = contact_type_key.replace('_phone', '').upper()
                        country_key = f'{contact_type_key}_country'
                        country_code = contact_numbers.get(country_key, '')

                        if contact_type in ['HOME', 'WORK', 'MOBILE'] and number:
                            contact, created = UserProfileContactNumber.objects.get_or_create(
                                user_profile=profile,
                                contact_type=contact_type,
                                defaults={'number': number, 'country_code': country_code}
                            )
                            if not created:
                                contact.number = number
                                contact.country_code = country_code
                                contact.save()
                
                response_data = {
                    'status': 'success',
                    'message': 'Profile updated successfully'
                }
                
                # Handle email change verification
                if email_changed and new_email:
                    try:
                        # Generate verification token
                        token = default_token_generator.make_token(user)
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
                            user_email=new_email,
                            verification_data=verification_data,
                            use_mjml=True,
                            enhance_outlook=True,
                            use_queue=True,
                            user=user
                        )
                        
                        if success:
                            response_data['email_verification_sent'] = True
                            response_data['message'] += f' Verification email sent to {new_email}.'
                        else:
                            response_data['email_verification_sent'] = False
                            response_data['message'] += ' However, email verification failed to send.'
                            logger.error(f"Failed to send email verification to {new_email}")
                            
                    except Exception as e:
                        logger.error(f"Error sending email verification: {str(e)}")
                        response_data['email_verification_sent'] = False
                        response_data['message'] += ' However, email verification failed to send.'
                
                return Response(response_data)
                
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Failed to update profile'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
