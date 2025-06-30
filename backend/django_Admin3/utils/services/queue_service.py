import logging
import hashlib
import json
from typing import Dict, List, Optional, Union
from django.utils import timezone
from django.db import transaction
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from premailer import transform
from mjml import mjml2html

from ..models import EmailTemplate, EmailQueue, EmailLog, EmailAttachment, EmailTemplateAttachment
from ..email_service import EmailService

logger = logging.getLogger(__name__)


def datetime_serializer(obj):
    """Custom JSON serializer for datetime objects."""
    if isinstance(obj, timezone.datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


class EmailQueueService:
    """
    Service for managing email queue operations, processing, and logging.
    """
    
    def __init__(self):
        self.email_service = EmailService()
    
    def queue_email(
        self,
        template_name: str,
        to_emails: Union[str, List[str]],
        context: Dict,
        subject_override: str = None,
        from_email: str = None,
        reply_to_email: str = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        priority: str = 'normal',
        scheduled_at: timezone.datetime = None,
        expires_at: timezone.datetime = None,
        tags: List[str] = None,
        user=None
    ) -> EmailQueue:
        """
        Queue an email for later processing.
        
        Args:
            template_name: Name of the email template
            to_emails: Recipient email address(es)
            context: Template context data
            subject_override: Override template subject
            from_email: Sender email address
            reply_to_email: Reply-to email address
            cc_emails: CC recipients
            bcc_emails: BCC recipients
            priority: Email priority (low, normal, high, urgent)
            scheduled_at: When to send the email
            expires_at: When the email expires
            tags: Tags for categorization
            user: User who initiated the email
            
        Returns:
            EmailQueue: Created queue item
        """
        try:
            # Normalize to_emails to list
            if isinstance(to_emails, str):
                to_emails = [to_emails]
            
            # Get template configuration
            template = None
            try:
                template = EmailTemplate.objects.get(name=template_name, is_active=True)
                logger.info(f"Found template configuration for {template_name}")
            except EmailTemplate.DoesNotExist:
                logger.warning(f"No template configuration found for {template_name}, using defaults")
            
            # Apply template defaults
            if template:
                priority = priority or template.default_priority
                from_email = from_email or template.from_email
                reply_to_email = reply_to_email or template.reply_to_email
                
                # Use template subject if no override provided
                if not subject_override and template.subject_template:
                    try:
                        from django.template import Template, Context
                        subject_template = Template(template.subject_template)
                        subject = subject_template.render(Context(context))
                    except Exception as e:
                        logger.warning(f"Failed to render template subject: {str(e)}")
                        subject = template.subject_template
                else:
                    subject = subject_override or f"Email from {template_name}"
            else:
                subject = subject_override or f"Email from {template_name}"
            
            # Serialize context to ensure JSON compatibility
            try:
                serialized_context = json.loads(json.dumps(context, default=datetime_serializer))
                logger.debug(f"Successfully serialized context for {template_name}")
            except Exception as serialization_error:
                logger.error(f"Failed to serialize context: {str(serialization_error)}")
                # Try to clean the context by removing non-serializable items
                serialized_context = self._clean_context_for_serialization(context)
                logger.info(f"Used cleaned context for {template_name}")
            
            # Create queue item
            with transaction.atomic():
                queue_item = EmailQueue.objects.create(
                    template=template,
                    to_emails=to_emails,
                    cc_emails=cc_emails or [],
                    bcc_emails=bcc_emails or [],
                    from_email=from_email or self.email_service.from_email,
                    reply_to_email=reply_to_email,
                    subject=subject,
                    email_context=serialized_context,
                    priority=priority,
                    scheduled_at=scheduled_at or timezone.now(),
                    expires_at=expires_at,
                    max_attempts=template.max_retry_attempts if template else 3,
                    tags=tags or [],
                    created_by=user
                )
                
                logger.info(f"Queued email {queue_item.queue_id} for {len(to_emails)} recipients")
                return queue_item
                
        except Exception as e:
            logger.error(f"Failed to queue email: {str(e)}")
            raise Exception(f"Failed to queue email: {str(e)}")
    
    def _clean_context_for_serialization(self, context: Dict) -> Dict:
        """Clean context by converting non-serializable objects to string representations."""
        cleaned_context = {}
        
        for key, value in context.items():
            try:
                # Test if the value is JSON serializable
                json.dumps(value, default=datetime_serializer)
                cleaned_context[key] = value
            except (TypeError, ValueError) as e:
                logger.warning(f"Converting non-serializable context item '{key}': {type(value)}")
                
                # Convert common Django objects to serializable format
                if hasattr(value, 'isoformat'):  # datetime objects
                    cleaned_context[key] = value.isoformat()
                elif hasattr(value, '__dict__'):  # Model instances
                    # Convert model instance to dict of basic fields
                    try:
                        if hasattr(value, '_meta'):  # Django model
                            model_dict = {}
                            for field in value._meta.fields:
                                field_value = getattr(value, field.name)
                                if isinstance(field_value, timezone.datetime):
                                    model_dict[field.name] = field_value.isoformat()
                                elif field_value is not None:
                                    try:
                                        json.dumps(field_value)
                                        model_dict[field.name] = field_value
                                    except (TypeError, ValueError):
                                        model_dict[field.name] = str(field_value)
                            cleaned_context[key] = model_dict
                        else:
                            cleaned_context[key] = str(value)
                    except Exception:
                        cleaned_context[key] = str(value)
                elif isinstance(value, list):
                    # Clean list items
                    cleaned_list = []
                    for item in value:
                        try:
                            json.dumps(item, default=datetime_serializer)
                            cleaned_list.append(item)
                        except (TypeError, ValueError):
                            if hasattr(item, '__dict__'):
                                cleaned_list.append(str(item))
                            else:
                                cleaned_list.append(str(item))
                    cleaned_context[key] = cleaned_list
                elif isinstance(value, dict):
                    # Recursively clean nested dict
                    cleaned_context[key] = self._clean_context_for_serialization(value)
                else:
                    # Convert to string as last resort
                    cleaned_context[key] = str(value)
        
        return cleaned_context
    
    def process_queue_item(self, queue_item: EmailQueue) -> bool:
        """
        Process a single queue item and send emails.
        
        Args:
            queue_item: Queue item to process
            
        Returns:
            bool: True if all emails sent successfully
        """
        start_time = timezone.now()
        
        try:
            # Check if queue item can be processed
            if not self._can_process_queue_item(queue_item):
                return False
            
            # Update status to processing
            queue_item.status = 'processing'
            queue_item.attempts += 1
            queue_item.last_attempt_at = start_time
            queue_item.save()
            
            # Process each recipient
            all_success = True
            for to_email in queue_item.to_emails:
                success = self._send_single_email(queue_item, to_email, start_time)
                if not success:
                    all_success = False
            
            # Update queue item status
            if all_success:
                queue_item.status = 'sent'
                queue_item.sent_at = timezone.now()
                logger.info(f"Successfully processed queue item {queue_item.queue_id}")
            else:
                # Schedule retry if possible
                if queue_item.can_retry():
                    delay_minutes = queue_item.template.retry_delay_minutes if queue_item.template else 5
                    queue_item.schedule_retry(delay_minutes)
                    logger.warning(f"Some emails failed, scheduled retry for {queue_item.queue_id}")
                else:
                    queue_item.status = 'failed'
                    queue_item.error_message = "Maximum retry attempts exceeded"
                    logger.error(f"Queue item {queue_item.queue_id} failed after max attempts")
            
            queue_item.save()
            return all_success
            
        except Exception as e:
            logger.error(f"Failed to process queue item {queue_item.queue_id}: {str(e)}")
            queue_item.mark_failed(str(e), {'exception_type': type(e).__name__})
            return False
    
    def _can_process_queue_item(self, queue_item: EmailQueue) -> bool:
        """Check if a queue item can be processed."""
        now = timezone.now()
        
        # Check status
        if queue_item.status not in ['pending', 'retry']:
            return False
        
        # Check if expired
        if queue_item.expires_at and now > queue_item.expires_at:
            queue_item.status = 'cancelled'
            queue_item.error_message = 'Email expired'
            queue_item.save()
            return False
        
        # Check if scheduled time has passed
        if now < queue_item.process_after:
            return False
        
        # Check retry timing
        if queue_item.status == 'retry' and queue_item.next_retry_at and now < queue_item.next_retry_at:
            return False
        
        return True
    
    def _send_single_email(self, queue_item: EmailQueue, to_email: str, start_time: timezone.datetime) -> bool:
        """
        Send email to a single recipient and log the result.
        
        Args:
            queue_item: Queue item being processed
            to_email: Recipient email address
            start_time: Processing start time
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            # Create email log entry
            email_log = self._create_email_log(queue_item, to_email)
            
            # Get attachments for the template
            attachments = self._get_template_attachments(queue_item.template, queue_item.email_context)
            
            # Debug logging for template resolution
            if queue_item.template:
                logger.debug(f"DEBUG: Processing template '{queue_item.template.name}' (ID: {queue_item.template.id})")
                logger.debug(f"DEBUG: Use master template: {queue_item.template.use_master_template}")
                logger.debug(f"DEBUG: Content template name: {queue_item.template.content_template_name}")
            else:
                logger.debug(f"DEBUG: No template configuration found, using default template")
            
            # Initialize response data
            response_data = {
                'success': False,
                'response_code': '500',
                'response_message': 'Email sending failed',
                'esp_response': {},
                'esp_message_id': None,
                'error_details': {}
            }
            
            try:
                if queue_item.template and queue_item.template.use_master_template:
                    # Use master template system
                    logger.debug(f"DEBUG: Using MASTER TEMPLATE system for {queue_item.template.name}")
                    response_data = self._send_with_master_template(
                        queue_item, to_email, attachments
                    )
                else:
                    # Use regular template system
                    template_name = queue_item.template.content_template_name if queue_item.template else 'default'
                    logger.debug(f"DEBUG: Using REGULAR TEMPLATE system with template: {template_name}")
                    response_data = self.email_service._send_mjml_email(
                        template_name=template_name,
                        context=queue_item.email_context,
                        to_emails=[to_email],
                        subject=queue_item.subject,
                        from_email=queue_item.from_email,
                        enhance_outlook_compatibility=queue_item.template.enhance_outlook_compatibility if queue_item.template else True
                    )
                
                # Extract response information
                success = response_data.get('success', False)
                response_code = response_data.get('response_code', '500')
                response_message = response_data.get('response_message', 'Unknown status')
                esp_response = response_data.get('esp_response', {})
                esp_message_id = response_data.get('esp_message_id')
                error_details = response_data.get('error_details', {})
                
                if success:
                    email_log.mark_sent(response_code, response_message, esp_message_id)
                    logger.info(f"Email sent successfully to {to_email}")
                    
                    # Update log with detailed ESP response
                    email_log.esp_response = esp_response
                    email_log.save()
                else:
                    email_log.status = 'failed'
                    email_log.error_message = response_message
                    email_log.esp_response = esp_response
                    email_log.response_code = response_code
                    email_log.response_message = response_message
                    email_log.save()
                    logger.error(f"Failed to send email to {to_email}: {response_message}")
                
            except Exception as send_error:
                # Capture exception details
                error_type = type(send_error).__name__
                error_message = str(send_error)
                
                response_data = {
                    'success': False,
                    'response_code': '500',
                    'response_message': error_message,
                    'esp_response': {
                        'error_type': error_type,
                        'error_message': error_message,
                        'processing_stage': 'email_sending',
                        'template': queue_item.template.name if queue_item.template else 'unknown',
                        'timestamp': timezone.now().isoformat()
                    },
                    'error_details': {
                        'exception_type': error_type,
                        'exception_message': error_message,
                        'processing_stage': 'email_sending'
                    }
                }
                
                email_log.status = 'failed'
                email_log.error_message = error_message
                email_log.esp_response = response_data['esp_response']
                email_log.response_code = '500'
                email_log.response_message = error_message
                email_log.save()
                
                logger.error(f"Exception sending email to {to_email}: {error_message}")
            
            # Update email log with final results and processing time
            processing_time = (timezone.now() - start_time).total_seconds() * 1000
            email_log.processing_time_ms = int(processing_time)
            email_log.processed_by = 'queue_service'
            email_log.save()
            
            return response_data.get('success', False)
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def _send_with_master_template(self, queue_item: EmailQueue, to_email: str, attachments: List) -> Dict:
        """Send email using master template system and return detailed response."""
        try:
            template_map = {
                'order_confirmation': 'order_confirmation_content',
                'password_reset': 'password_reset_content',
                'password_reset_completed': 'password_reset_completed_content',
                'account_activation': 'account_activation_content',
                'email_verification': 'email_verification_content',
                'email_verification': 'email_verification_content'
            }
            
            if queue_item.template.name in template_map:
                content_template = template_map[queue_item.template.name]
                logger.debug(f"DEBUG: Master template mapping: {queue_item.template.name} -> {content_template}")
                
                # Show full template path for debugging
                import os
                from django.conf import settings
                content_template_path = os.path.join(settings.BASE_DIR, 'utils', 'templates', 'emails', 'mjml', f'{content_template}.mjml')
                logger.debug(f"DEBUG: Content template file path: {content_template_path}")
                logger.debug(f"DEBUG: Content template file exists: {os.path.exists(content_template_path)}")
                
                # Render using master template
                mjml_content = self.email_service._render_email_with_master_template(
                    content_template=content_template,
                    context=queue_item.email_context,
                    email_title=queue_item.subject,
                    email_preview=f"Email from {queue_item.template.display_name}"
                )
                
                # Send the email using detailed response method
                return self.email_service._send_mjml_email_from_content(
                    mjml_content=mjml_content,
                    context=queue_item.email_context,
                    to_emails=[to_email],
                    subject=queue_item.subject,
                    from_email=queue_item.from_email,
                    enhance_outlook_compatibility=queue_item.template.enhance_outlook_compatibility,
                    attachments=attachments
                )
            else:
                # Use regular template with detailed response
                logger.debug(f"DEBUG: Template {queue_item.template.name} not in master template map, using regular template")
                return self.email_service._send_mjml_email(
                    template_name=queue_item.template.content_template_name,
                    context=queue_item.email_context,
                    to_emails=[to_email],
                    subject=queue_item.subject,
                    from_email=queue_item.from_email,
                    enhance_outlook_compatibility=queue_item.template.enhance_outlook_compatibility
                )
                
        except Exception as e:
            # Return detailed error response
            error_type = type(e).__name__
            error_message = str(e)
            
            return {
                'success': False,
                'response_code': '500',
                'response_message': f'Master template processing failed: {error_message}',
                'esp_response': {
                    'error_type': error_type,
                    'error_message': error_message,
                    'processing_stage': 'master_template_rendering',
                    'template': queue_item.template.name if queue_item.template else 'unknown',
                    'timestamp': timezone.now().isoformat()
                },
                'error_details': {
                    'exception_type': error_type,
                    'exception_message': error_message,
                    'processing_stage': 'master_template_rendering'
                }
            }
    
    def _create_email_log(self, queue_item: EmailQueue, to_email: str) -> EmailLog:
        """Create an email log entry for tracking."""
        # Generate content hash for deduplication
        content_for_hash = f"{queue_item.subject}{queue_item.html_content or ''}{to_email}"
        content_hash = hashlib.md5(content_for_hash.encode()).hexdigest()
        
        # Calculate total size (estimated from context)
        context_size = len(str(queue_item.email_context))
        total_size = len(queue_item.html_content or '') + context_size
        
        return EmailLog.objects.create(
            queue_item=queue_item,
            template=queue_item.template,
            to_email=to_email,
            from_email=queue_item.from_email,
            subject=queue_item.subject,
            content_hash=content_hash,
            attachment_info=[],  # Will be populated with attachment info
            total_size_bytes=total_size,
            status='queued',
            priority=queue_item.priority,
            email_context=queue_item.email_context,
            metadata={'queue_id': str(queue_item.queue_id)},
            tags=queue_item.tags
        )
    
    def _get_template_attachments(self, template: EmailTemplate, context: Dict) -> List[Dict]:
        """Get attachments for a template based on conditions."""
        if not template:
            return []
        
        attachments = []
        
        try:
            template_attachments = EmailTemplateAttachment.objects.filter(
                template=template
            ).select_related('attachment').order_by('order')
            
            for template_attachment in template_attachments:
                attachment = template_attachment.attachment
                
                # Check if attachment should be included based on conditions
                if self._should_include_attachment(template_attachment, context):
                    attachment_info = {
                        'name': attachment.name,
                        'display_name': attachment.display_name,
                        'type': attachment.attachment_type,
                        'file_path': attachment.file_path,
                        'file_url': attachment.file_url,
                        'mime_type': attachment.mime_type,
                        'size': attachment.file_size,
                        'is_required': template_attachment.is_required
                    }
                    attachments.append(attachment_info)
            
            logger.info(f"Found {len(attachments)} attachments for template {template.name}")
            return attachments
            
        except Exception as e:
            logger.error(f"Failed to get template attachments: {str(e)}")
            return []
    
    def _should_include_attachment(self, template_attachment: EmailTemplateAttachment, context: Dict) -> bool:
        """Check if an attachment should be included based on conditions."""
        # If no conditions, always include
        if not template_attachment.include_condition:
            logger.debug(f"No conditions for attachment {template_attachment.attachment.name}, including by default")
            return True
        
        try:
            conditions = template_attachment.include_condition
            condition_type = conditions.get('type', 'no_condition')
            
            logger.debug(f"Evaluating attachment condition for {template_attachment.attachment.name}: {condition_type}")
            
            # Always include condition
            if condition_type == 'always_include':
                logger.debug(f"Always include condition met for {template_attachment.attachment.name}")
                return True
            
            # Product type-based condition
            elif condition_type == 'product_type_based':
                required_product_types = conditions.get('product_types', [])
                logic = conditions.get('logic', 'any')  # 'any' or 'all'
                
                # Get order items from context
                items = context.get('items', [])
                if not items:
                    logger.debug(f"No items in context for product type condition")
                    return False
                
                # Check product types in order items
                found_types = []
                for item in items:
                    # Check different ways the product type might be stored
                    product_type = None
                    
                    # Method 1: Direct product_type field
                    if hasattr(item, 'product_type'):
                        product_type = getattr(item, 'product_type', None)
                    elif isinstance(item, dict) and 'product_type' in item:
                        product_type = item['product_type']
                    
                    # Method 2: Check if it's a tutorial (for tutorial products)
                    elif hasattr(item, 'is_tutorial') or (isinstance(item, dict) and item.get('is_tutorial')):
                        is_tutorial = getattr(item, 'is_tutorial', None) if hasattr(item, 'is_tutorial') else item.get('is_tutorial')
                        if is_tutorial:
                            product_type = 'tutorial'
                    
                    # Method 3: Check if it's marking (for marking products)
                    elif hasattr(item, 'is_marking') or (isinstance(item, dict) and item.get('is_marking')):
                        is_marking = getattr(item, 'is_marking', None) if hasattr(item, 'is_marking') else item.get('is_marking')
                        if is_marking:
                            product_type = 'marking'
                    
                    # Method 4: Default to materials if not tutorial or marking
                    else:
                        # If we have product info but it's not tutorial/marking, assume materials
                        product_type = 'material'
                    
                    if product_type:
                        found_types.append(product_type.lower())
                        logger.debug(f"Found product type: {product_type} for item")
                
                # Normalize required types to lowercase
                required_product_types = [t.lower() for t in required_product_types]
                
                logger.debug(f"Required types: {required_product_types}, Found types: {found_types}")
                
                # Check logic
                if logic == 'any':
                    # Include if ANY product matches required types
                    include = any(found_type in required_product_types for found_type in found_types)
                else:  # logic == 'all'
                    # Include if ALL required types are found
                    include = all(req_type in found_types for req_type in required_product_types)
                
                logger.info(f"Product type condition for {template_attachment.attachment.name}: {'INCLUDE' if include else 'EXCLUDE'} (Required: {required_product_types}, Found: {found_types}, Logic: {logic})")
                return include
            
            # Simple key-value condition (backward compatibility)
            else:
                for key, expected_value in conditions.items():
                    if key not in context or context[key] != expected_value:
                        logger.debug(f"Simple condition not met: {key}={context.get(key)} != {expected_value}")
                        return False
                
                logger.debug(f"Simple conditions met for {template_attachment.attachment.name}")
                return True
            
        except Exception as e:
            logger.warning(f"Failed to evaluate attachment condition for {template_attachment.attachment.name}: {str(e)}")
            # If condition evaluation fails, include if required, exclude if optional
            return template_attachment.is_required
    
    def process_pending_queue(self, limit: int = 50) -> Dict:
        """
        Process pending queue items.
        
        Args:
            limit: Maximum number of items to process
            
        Returns:
            Dict: Processing results
        """
        now = timezone.now()
        
        # Get pending queue items
        pending_items = EmailQueue.objects.filter(
            status__in=['pending', 'retry'],
            process_after__lte=now
        ).exclude(
            expires_at__lt=now
        ).order_by('priority', 'scheduled_at')[:limit]
        
        results = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        for queue_item in pending_items:
            try:
                success = self.process_queue_item(queue_item)
                results['processed'] += 1
                
                if success:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Queue item {queue_item.queue_id}: {str(e)}")
                logger.error(f"Failed to process queue item {queue_item.queue_id}: {str(e)}")
        
        logger.info(f"Processed {results['processed']} queue items: {results['successful']} successful, {results['failed']} failed")
        return results
    
    def get_queue_stats(self) -> Dict:
        """Get email queue statistics."""
        from django.db.models import Count, Q
        
        stats = EmailQueue.objects.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            processing=Count('id', filter=Q(status='processing')),
            sent=Count('id', filter=Q(status='sent')),
            failed=Count('id', filter=Q(status='failed')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            retry=Count('id', filter=Q(status='retry'))
        )
        
        # Add log statistics
        log_stats = EmailLog.objects.aggregate(
            total_logs=Count('id'),
            sent_logs=Count('id', filter=Q(status='sent')),
            opened_logs=Count('id', filter=Q(status='opened')),
            clicked_logs=Count('id', filter=Q(status='clicked')),
            failed_logs=Count('id', filter=Q(status='failed'))
        )
        
        stats.update(log_stats)
        return stats


# Global queue service instance
email_queue_service = EmailQueueService() 