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
    EmailMasterComponent,
    EmailQueue, EmailContentPlaceholder, EmailContentRule, EmailTemplateContentRule,
    ClosingSalutation,
    EmailMjmlElement,
)
from email_system.serializers import (
    EmailSettingsSerializer, EmailTemplateSerializer, EmailTemplateListSerializer,
    EmailAttachmentSerializer, EmailTemplateAttachmentSerializer,
    EmailMasterComponentSerializer,
    EmailQueueSerializer, EmailQueueListSerializer, EmailQueueDuplicateInputSerializer,
    EmailContentPlaceholderSerializer, EmailContentRuleSerializer,
    EmailTemplateContentRuleSerializer,
    ClosingSalutationSerializer, ClosingSalutationListSerializer,
    EmailMjmlElementSerializer,
)


class EmailSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing global email settings."""

    queryset = EmailSettings.objects.all()
    serializer_class = EmailSettingsSerializer
    permission_classes = [IsSuperUser]
    pagination_class = None

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

    def get_queryset(self):
        qs = super().get_queryset()
        template_type = self.request.query_params.get('template_type')
        if template_type:
            qs = qs.filter(template_type=template_type)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return EmailTemplateListSerializer
        return EmailTemplateSerializer

    # Fields whose changes warrant a new template version
    _VERSIONED_FIELDS = {'mjml_content', 'basic_mode_content', 'subject_template', 'closing_salutation'}

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        instance.create_version(user=self.request.user, change_note='Initial version')

    def perform_update(self, serializer):
        instance = serializer.instance
        # Detect content changes before saving
        changed = any(
            field in serializer.validated_data
            and getattr(instance, field if field != 'closing_salutation' else 'closing_salutation_id')
            != serializer.validated_data[field]
            for field in self._VERSIONED_FIELDS
            if field in serializer.validated_data
        )
        instance = serializer.save()
        if changed:
            instance.create_version(user=self.request.user)

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
        """Return the assembled MJML shell derived from the master_template
        with a <!-- CONTENT_PLACEHOLDER --> marker where content goes.
        Frontend caches this and inserts user content for instant preview."""
        import re
        from email_system.models import EmailMasterComponent

        parts = {}
        for part_name in ('master_template', 'banner', 'styles', 'footer'):
            component = EmailMasterComponent.objects.filter(
                name=part_name, is_active=True
            ).first()
            if not component or not component.mjml_content:
                return Response(
                    {'error': f'DB component not found: {part_name}'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            parts[part_name] = component.mjml_content

        # Extract <mj-attributes>...</mj-attributes> from master_template
        attr_match = re.search(
            r'<mj-attributes>(.*?)</mj-attributes>',
            parts['master_template'],
            re.DOTALL,
        )
        attributes_block = attr_match.group(1) if attr_match else ''

        shell = (
            '<mjml>\n'
            '  <mj-head>\n'
            '    <mj-title>Email Preview</mj-title>\n'
            f'    <mj-attributes>{attributes_block}</mj-attributes>\n'
            f'    {parts["styles"]}\n'
            '  </mj-head>\n'
            '  <mj-body background-color="#f3f3f3" width="600px">\n'
            '    <mj-wrapper>\n'
            f'      {parts["banner"]}\n'
            '      <!-- CONTENT_PLACEHOLDER -->\n'
            '      <!-- SIGNATURE_PLACEHOLDER -->\n'
            f'      {parts["footer"]}\n'
            '    </mj-wrapper>\n'
            '  </mj-body>\n'
            '</mjml>'
        )

        return Response({'shell': shell})

    @action(detail=True, methods=['get'], url_path='signature-mjml')
    def signature_mjml(self, request, pk=None):
        """Return the closing salutation fields for this template."""
        instance = self.get_object()
        if instance.closing_salutation:
            sal = instance.closing_salutation
            lines = f'{sal.sign_off_text},<br/>{sal.display_name}'
            if sal.job_title:
                lines += f'<br/>{sal.job_title}'
            signature_mjml = (
                '<mj-section><mj-column>'
                f'<mj-text padding-top="24px" padding-bottom="24px" align="left">{lines}</mj-text>'
                '</mj-column></mj-section>'
            )
            return Response({
                'signature_mjml': signature_mjml,
                'sign_off_text': sal.sign_off_text,
                'display_name': sal.display_name,
                'job_title': sal.job_title,
            })
        return Response({'signature_mjml': '', 'sign_off_text': '', 'display_name': '', 'job_title': ''})



class EmailMasterComponentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing shared MJML components (banner, footer, styles, etc.)."""

    queryset = EmailMasterComponent.objects.all()
    serializer_class = EmailMasterComponentSerializer
    permission_classes = [IsSuperUser]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


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

    queryset = EmailQueue.objects.select_related('template', 'created_by').all()
    serializer_class = EmailQueueSerializer
    permission_classes = [IsSuperUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmailQueueListSerializer
        return EmailQueueSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        to_email = self.request.query_params.get('to_email')
        if to_email:
            qs = qs.filter(to_emails__icontains=to_email)
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
        """Reset a queue item so it will be picked up by the worker."""
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

    @action(detail=True, methods=['get'], url_path='view-email')
    def view_email(self, request, pk=None):
        """Render the email as it was sent, using the versioned template + stored context."""
        item = self.get_object()

        # If we have a snapshot already, return it directly
        if item.html_content:
            return Response({'html': item.html_content})

        # Render on-the-fly from the versioned template
        if not item.template_version:
            return Response(
                {'detail': 'No template version recorded for this queue item.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            from email_system.services.email_service import EmailService
            email_service = EmailService()
            html = email_service.render_version_to_html(
                template_version=item.template_version,
                context=item.email_context,
                subject=item.subject,
            )
            return Response({'html': html})
        except Exception as e:
            return Response(
                {'detail': f'Failed to render email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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

    queryset = ClosingSalutation.objects.all()
    permission_classes = [IsSuperUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return ClosingSalutationListSerializer
        return ClosingSalutationSerializer


class EmailMjmlElementViewSet(viewsets.ModelViewSet):
    """
    MJML element templates — list all and update individual templates.
    No create/delete — elements are seeded via migration.
    """
    queryset = EmailMjmlElement.objects.filter(is_active=True)
    serializer_class = EmailMjmlElementSerializer
    permission_classes = [IsSuperUser]
    http_method_names = ['get', 'put', 'patch', 'head', 'options']
    pagination_class = None  # Always return all elements (max 9)
