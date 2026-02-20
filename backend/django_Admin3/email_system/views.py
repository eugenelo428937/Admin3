import os
import mimetypes
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from catalog.permissions import IsSuperUser

from email_system.models import (
    EmailSettings, EmailTemplate, EmailAttachment, EmailTemplateAttachment,
    EmailQueue, EmailContentPlaceholder, EmailContentRule, EmailTemplateContentRule,
    ClosingSalutation, ClosingSalutationStaff,
)
from email_system.serializers import (
    EmailSettingsSerializer, EmailTemplateSerializer, EmailTemplateListSerializer,
    EmailAttachmentSerializer, EmailTemplateAttachmentSerializer,
    EmailQueueSerializer, EmailQueueDuplicateInputSerializer,
    EmailContentPlaceholderSerializer, EmailContentRuleSerializer,
    EmailTemplateContentRuleSerializer,
    ClosingSalutationSerializer, ClosingSalutationListSerializer,
)


class EmailSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing global email settings."""

    queryset = EmailSettings.objects.all()
    serializer_class = EmailSettingsSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = super().get_queryset()
        setting_type = self.request.query_params.get('setting_type')
        if setting_type:
            qs = qs.filter(setting_type=setting_type)
        return qs

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email templates with MJML preview and import."""

    queryset = EmailTemplate.objects.all()
    permission_classes = [IsSuperUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmailTemplateListSerializer
        return EmailTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Convert MJML content to HTML for preview."""
        instance = self.get_object()
        mjml_content = request.data.get('mjml_content', instance.mjml_content)

        if not mjml_content:
            return Response(
                {'error': 'No MJML content provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from mjml import mjml2html
            result = mjml2html(mjml_content)
            return Response({'html': result})
        except Exception as e:
            return Response(
                {'error': f'MJML conversion failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['get'], url_path='mjml-shell')
    def mjml_shell(self, request):
        """Return the assembled MJML shell (master + banner + styles + footer)
        with a <!-- CONTENT_PLACEHOLDER --> marker where content goes.
        Frontend caches this and inserts user content for instant preview."""
        mjml_dir = os.path.join(
            settings.BASE_DIR, 'utils', 'templates', 'emails', 'mjml',
        )

        parts = {}
        for part_name in ('banner', 'styles', 'footer'):
            part_path = os.path.join(mjml_dir, f'{part_name}.mjml')
            if not os.path.isfile(part_path):
                return Response(
                    {'error': f'MJML part not found: {part_name}.mjml'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            with open(part_path, 'r', encoding='utf-8') as f:
                parts[part_name] = f.read()

        shell = (
            '<mjml>\n'
            '  <mj-head>\n'
            '    <mj-title>Email Preview</mj-title>\n'
            '    <mj-attributes>\n'
            '      <mj-all font-family="\'Poppins\', Helvetica, Arial, sans-serif" />\n'
            '      <mj-text font-size="16px" line-height="20px" color="#555555" />\n'
            '      <mj-section padding="0" />\n'
            '      <mj-column padding="0" />\n'
            '    </mj-attributes>\n'
            f'    {parts["styles"]}\n'
            '  </mj-head>\n'
            '  <mj-body background-color="#f3f3f3" width="600px">\n'
            '    <mj-wrapper>\n'
            f'      {parts["banner"]}\n'
            '      <!-- CONTENT_PLACEHOLDER -->\n'
            f'      {parts["footer"]}\n'
            '    </mj-wrapper>\n'
            '  </mj-body>\n'
            '</mjml>'
        )

        return Response({'shell': shell})

    @action(detail=True, methods=['get'], url_path='signature-mjml')
    def signature_mjml(self, request, pk=None):
        """Return the MJML snippet for this template's closing salutation."""
        instance = self.get_object()
        if instance.closing_salutation:
            mjml = instance.closing_salutation.render_mjml()
        else:
            mjml = ''
        return Response({'signature_mjml': mjml})

    @action(detail=True, methods=['post'], url_path='import-mjml')
    def import_mjml(self, request, pk=None):
        """Import MJML content from the corresponding file on disk."""
        instance = self.get_object()
        mjml_path = os.path.join(
            settings.BASE_DIR,
            'utils', 'templates', 'emails', 'mjml',
            f'{instance.content_template_name}.mjml',
        )

        if not os.path.isfile(mjml_path):
            return Response(
                {'error': f'MJML file not found: {mjml_path}'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            with open(mjml_path, 'r', encoding='utf-8') as f:
                instance.mjml_content = f.read()
            instance.mjml_last_synced = timezone.now()
            instance.save()

            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Failed to import MJML file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmailAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email attachments with file upload support."""

    queryset = EmailAttachment.objects.all()
    serializer_class = EmailAttachmentSerializer
    permission_classes = [IsSuperUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        instance = serializer.save()
        uploaded_file = self.request.FILES.get('file')

        if uploaded_file:
            upload_dir = getattr(
                settings, 'EMAIL_ATTACHMENT_UPLOAD_PATH', 'static/documents'
            )
            os.makedirs(upload_dir, exist_ok=True)

            file_path = os.path.join(upload_dir, uploaded_file.name)
            with open(file_path, 'wb+') as dest:
                for chunk in uploaded_file.chunks():
                    dest.write(chunk)

            instance.file_path = file_path
            instance.mime_type = (
                mimetypes.guess_type(uploaded_file.name)[0] or 'application/octet-stream'
            )
            instance.file_size = uploaded_file.size
            instance.save()


class EmailTemplateAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing template-attachment associations."""

    queryset = EmailTemplateAttachment.objects.all()
    serializer_class = EmailTemplateAttachmentSerializer
    permission_classes = [IsSuperUser]


class EmailQueueViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only ViewSet for the email queue with filtering, duplicate, and resend actions."""

    queryset = EmailQueue.objects.select_related('template').all()
    serializer_class = EmailQueueSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Create a duplicate of an existing queue item with optional field overrides."""
        original = self.get_object()
        input_serializer = EmailQueueDuplicateInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        overrides = input_serializer.validated_data

        new_item = EmailQueue.objects.create(
            template=original.template,
            to_emails=overrides.get('to_emails', original.to_emails),
            cc_emails=overrides.get('cc_emails', original.cc_emails),
            bcc_emails=overrides.get('bcc_emails', original.bcc_emails),
            from_email=overrides.get('from_email', original.from_email),
            reply_to_email=overrides.get('reply_to_email', original.reply_to_email),
            subject=overrides.get('subject', original.subject),
            email_context=original.email_context,
            html_content=original.html_content,
            text_content=original.text_content,
            priority=original.priority,
            tags=original.tags,
            duplicated_from=original,
            status='pending',
            attempts=0,
            scheduled_at=timezone.now(),
        )

        serializer = self.get_serializer(new_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Reset a queue item so it will be processed again."""
        item = self.get_object()
        item.status = 'pending'
        item.scheduled_at = timezone.now()
        item.attempts = 0
        item.last_attempt_at = None
        item.next_retry_at = None
        item.error_message = ''
        item.error_details = {}
        item.save()

        serializer = self.get_serializer(item)
        return Response(serializer.data)


class EmailContentPlaceholderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email content placeholders."""

    queryset = EmailContentPlaceholder.objects.all()
    serializer_class = EmailContentPlaceholderSerializer
    permission_classes = [IsSuperUser]


class EmailContentRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email content rules."""

    queryset = EmailContentRule.objects.select_related('placeholder').all()
    serializer_class = EmailContentRuleSerializer
    permission_classes = [IsSuperUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EmailTemplateContentRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing template-content-rule associations."""

    queryset = EmailTemplateContentRule.objects.select_related('template', 'content_rule').all()
    serializer_class = EmailTemplateContentRuleSerializer
    permission_classes = [IsSuperUser]


class ClosingSalutationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing closing salutations."""

    queryset = ClosingSalutation.objects.prefetch_related(
        'staff_members__staff__user'
    ).all()
    permission_classes = [IsSuperUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return ClosingSalutationListSerializer
        return ClosingSalutationSerializer
