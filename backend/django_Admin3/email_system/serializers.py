from rest_framework import serializers
from email_system.models import (
    EmailSettings, EmailTemplate, EmailAttachment, EmailTemplateAttachment,
    EmailMasterComponent,
    EmailQueue, EmailContentPlaceholder, EmailContentRule, EmailTemplateContentRule,
    ClosingSalutation,
    EmailMjmlElement,
)


# ---------------------------------------------------------------------------
# EmailSettings
# ---------------------------------------------------------------------------

class EmailSettingsSerializer(serializers.ModelSerializer):
    """Serializer for EmailSettings with sensitive value masking."""

    updated_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = EmailSettings
        fields = [
            'id', 'key', 'setting_type', 'display_name', 'description',
            'value', 'default_value', 'is_required', 'is_sensitive',
            'validation_rules', 'is_active', 'created_at', 'updated_at',
            'updated_by',
        ]
        read_only_fields = ['created_at', 'updated_at', 'updated_by']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_sensitive:
            data['value'] = '********'
        return data


# ---------------------------------------------------------------------------
# EmailAttachment
# ---------------------------------------------------------------------------

class EmailAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for EmailAttachment. Excludes binary file_content field."""

    class Meta:
        model = EmailAttachment
        fields = [
            'id', 'name', 'display_name', 'attachment_type',
            'file_path', 'file_url', 'mime_type', 'file_size',
            'is_conditional', 'condition_rules', 'description',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['file_size', 'mime_type', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# EmailTemplateAttachment
# ---------------------------------------------------------------------------

class EmailTemplateAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for the template-attachment association with unique_together validation."""

    class Meta:
        model = EmailTemplateAttachment
        fields = [
            'id', 'template', 'attachment', 'is_required', 'order',
            'include_condition', 'created_at',
        ]
        read_only_fields = ['created_at']

    def validate(self, attrs):
        """Enforce the unique_together constraint on (template, attachment)."""
        template = attrs.get('template', getattr(self.instance, 'template', None))
        attachment = attrs.get('attachment', getattr(self.instance, 'attachment', None))

        if template and attachment:
            qs = EmailTemplateAttachment.objects.filter(
                template=template, attachment=attachment,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    'This attachment is already associated with the selected template.'
                )
        return attrs


# ---------------------------------------------------------------------------
# EmailTemplateContentRule
# ---------------------------------------------------------------------------

class EmailTemplateContentRuleSerializer(serializers.ModelSerializer):
    """Serializer for the template-content-rule association."""

    effective_priority = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplateContentRule
        fields = [
            'id', 'template', 'content_rule', 'is_enabled',
            'priority_override', 'content_override', 'created_at',
            'effective_priority',
        ]
        read_only_fields = ['created_at', 'effective_priority']

    def get_effective_priority(self, obj):
        return obj.effective_priority

    def validate(self, attrs):
        """Enforce the unique_together constraint on (template, content_rule)."""
        template = attrs.get('template', getattr(self.instance, 'template', None))
        content_rule = attrs.get('content_rule', getattr(self.instance, 'content_rule', None))

        if template and content_rule:
            qs = EmailTemplateContentRule.objects.filter(
                template=template, content_rule=content_rule,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    'This content rule is already associated with the selected template.'
                )
        return attrs


# ---------------------------------------------------------------------------
# ClosingSalutation
# ---------------------------------------------------------------------------

class ClosingSalutationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for salutation list views."""

    class Meta:
        model = ClosingSalutation
        fields = [
            'id', 'name', 'display_name', 'sign_off_text', 'job_title',
            'is_active', 'created_at', 'updated_at',
        ]


class ClosingSalutationSerializer(serializers.ModelSerializer):
    """Full serializer for salutation detail, create, and update views."""

    class Meta:
        model = ClosingSalutation
        fields = [
            'id', 'name', 'display_name', 'sign_off_text', 'job_title',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


# ---------------------------------------------------------------------------
# EmailMjmlElement
# ---------------------------------------------------------------------------

class EmailMjmlElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailMjmlElement
        fields = [
            'id', 'element_type', 'display_name', 'description',
            'mjml_template', 'is_active', 'updated_at',
        ]
        read_only_fields = ['id', 'element_type', 'updated_at']


# ---------------------------------------------------------------------------
# EmailTemplate (list / detail)
# ---------------------------------------------------------------------------

class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template list views."""

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'template_type', 'display_name',
            'subject_template', 'default_priority',
            'closing_salutation', 'basic_mode_content',
            'is_active', 'created_at', 'updated_at',
        ]


class EmailTemplateSerializer(serializers.ModelSerializer):
    """Full serializer for template detail, create, and update views."""

    created_by = serializers.StringRelatedField(read_only=True)
    attachments = EmailTemplateAttachmentSerializer(many=True, read_only=True)
    template_content_rules = EmailTemplateContentRuleSerializer(many=True, read_only=True)
    closing_salutation_detail = ClosingSalutationListSerializer(
        source='closing_salutation', read_only=True
    )

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'template_type', 'display_name', 'description',
            'subject_template', 'use_master_template',
            'from_email', 'reply_to_email', 'default_priority',
            'enable_tracking', 'enable_queue',
            'mjml_content', 'basic_mode_content',
            'closing_salutation', 'closing_salutation_detail',
            'is_active', 'created_at', 'updated_at', 'created_by',
            'attachments', 'template_content_rules',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']


# ---------------------------------------------------------------------------
# EmailMasterComponent
# ---------------------------------------------------------------------------

class EmailMasterComponentSerializer(serializers.ModelSerializer):
    """Serializer for shared MJML components (banner, footer, styles, etc.)."""

    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = EmailMasterComponent
        fields = [
            'id', 'name', 'component_type', 'display_name', 'description',
            'mjml_content', 'is_active', 'created_at', 'updated_at', 'created_by',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']


# ---------------------------------------------------------------------------
# EmailQueue
# ---------------------------------------------------------------------------

class EmailQueueSerializer(serializers.ModelSerializer):
    """Read-only serializer for queue items."""

    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    duplicated_from = serializers.PrimaryKeyRelatedField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailQueue
        fields = [
            'id', 'queue_id', 'template', 'template_name',
            'to_emails', 'cc_emails', 'bcc_emails',
            'from_email', 'reply_to_email', 'subject',
            'email_context', 'html_content', 'text_content',
            'priority', 'status',
            'scheduled_at', 'process_after', 'expires_at',
            'attempts', 'max_attempts', 'last_attempt_at', 'next_retry_at',
            'sent_at', 'error_message', 'error_details',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'tags', 'duplicated_from',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            user = obj.created_by
            full_name = f"{user.first_name} {user.last_name}".strip()
            return full_name if full_name else user.username
        return None


class EmailQueueDuplicateInputSerializer(serializers.Serializer):
    """Write-only serializer for the queue duplicate action."""

    to_emails = serializers.ListField(child=serializers.EmailField(), required=False)
    cc_emails = serializers.ListField(child=serializers.EmailField(), required=False)
    bcc_emails = serializers.ListField(child=serializers.EmailField(), required=False)
    from_email = serializers.EmailField(required=False, allow_blank=True)
    reply_to_email = serializers.EmailField(required=False, allow_blank=True)
    subject = serializers.CharField(max_length=300, required=False, allow_blank=True)


# ---------------------------------------------------------------------------
# EmailContentPlaceholder
# ---------------------------------------------------------------------------

class EmailContentPlaceholderSerializer(serializers.ModelSerializer):
    """Serializer for email content placeholders."""

    templates = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=EmailTemplate.objects.all(),
        required=False,
    )

    class Meta:
        model = EmailContentPlaceholder
        fields = [
            'id', 'name', 'display_name', 'description',
            'default_content_template', 'content_variables',
            'insert_position', 'templates',
            'is_required', 'allow_multiple_rules', 'content_separator',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


# ---------------------------------------------------------------------------
# EmailContentRule
# ---------------------------------------------------------------------------

class EmailContentRuleSerializer(serializers.ModelSerializer):
    """Serializer for email content rules."""

    placeholder_name = serializers.CharField(source='placeholder.name', read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = EmailContentRule
        fields = [
            'id', 'name', 'description', 'rule_type',
            'placeholder', 'placeholder_name',
            'condition_field', 'condition_operator', 'condition_value',
            'additional_conditions', 'custom_logic',
            'priority', 'is_exclusive',
            'is_active', 'created_at', 'updated_at', 'created_by',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
