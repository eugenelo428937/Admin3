import re
from django.db import transaction
from django.template import Template, Context
from django.utils import timezone
from email_system.models import EmailBatch, EmailQueue, EmailTemplate, ExternalApiKey
from email_system.models.settings import EmailSettings


EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


class EmailBatchService:

    def send_batch(self, template_id, requested_by, notify_email, items, api_key, max_items=None):
        """Create a batch of emails and queue them for sending."""
        # Validate template
        try:
            template = EmailTemplate.objects.get(id=template_id, is_active=True)
        except EmailTemplate.DoesNotExist:
            raise ValueError(f'Template with id {template_id} not found or inactive.')

        # Validate batch size
        if max_items is None:
            max_items = EmailSettings.get_setting('batch_max_items', 500)
            if isinstance(max_items, str):
                max_items = int(max_items)
        if len(items) > max_items:
            raise ValueError(f'Batch size {len(items)} exceeds maximum of {max_items}.')

        result_items = []

        with transaction.atomic():
            batch = EmailBatch.objects.create(
                template=template,
                requested_by=requested_by,
                notify_email=notify_email,
                total_items=0,
                api_key=api_key,
                status='pending',
            )

            for item in items:
                to_email = item['to_email']
                cc_email = item.get('cc_email', [])
                subject_override = item.get('subject_override')
                payload = item.get('payload', {})

                # Validate email
                if not EMAIL_REGEX.match(to_email):
                    result_items.append({
                        'to_email': to_email,
                        'queue_id': None,
                        'is_success': False,
                        'error_response': {'error': f'Invalid email address: {to_email}'},
                    })
                    continue

                # Resolve subject
                if subject_override:
                    try:
                        subject = Template(subject_override).render(Context(payload))
                    except Exception:
                        subject = subject_override
                else:
                    try:
                        subject = Template(template.subject_template).render(Context(payload))
                    except Exception:
                        subject = template.subject_template

                # Create queue entry
                queue_item = EmailQueue.objects.create(
                    to_emails=[to_email],
                    cc_emails=cc_email if cc_email else [],
                    subject=subject,
                    email_context=payload,
                    template=template,
                    batch=batch,
                    priority=template.default_priority or 'normal',
                )

                result_items.append({
                    'to_email': to_email,
                    'queue_id': str(queue_item.queue_id),
                    'is_success': True,
                    'error_response': {},
                })

            # Update batch
            success_count = sum(1 for r in result_items if r['is_success'])
            batch.total_items = success_count
            batch.status = 'processing'
            batch.save(update_fields=['total_items', 'status'])

        return {
            'batch_id': str(batch.batch_id),
            'status': batch.status,
            'total_items': batch.total_items,
            'items': result_items,
        }

    def query_batch(self, batch_id, api_key):
        """Query the status of a batch."""
        try:
            batch = EmailBatch.objects.get(batch_id=batch_id, api_key=api_key)
        except EmailBatch.DoesNotExist:
            return None

        queue_items = batch.queue_items.all()

        sent_items = [
            qi.to_emails[0]
            for qi in queue_items
            if qi.status == 'sent' and qi.to_emails
        ]

        error_items = []
        for qi in queue_items:
            if qi.status in ('failed', 'cancelled'):
                error_items.append({
                    'to_email': qi.to_emails[0] if qi.to_emails else '',
                    'cc_email': qi.cc_emails or [],
                    'attempts': qi.attempts,
                    'error_response': qi.error_details or {'error_message': qi.error_message or ''},
                })

        is_success = batch.status == 'completed'

        return {
            'batch_id': str(batch.batch_id),
            'status': batch.status,
            'is_success': is_success,
            'total_items': batch.total_items,
            'sent_count': batch.sent_count,
            'error_count': batch.error_count,
            'sent_items': sent_items,
            'error_items': error_items,
        }


email_batch_service = EmailBatchService()
