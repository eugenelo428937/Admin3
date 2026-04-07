from django.db import models


class EmailVariable(models.Model):
    """Global catalog of template variables available for email template editing."""

    DATA_TYPES = [
        ('string', 'String'),
        ('int', 'Integer'),
        ('float', 'Float'),
        ('bool', 'Boolean'),
    ]

    display_name = models.CharField(
        max_length=100,
        help_text="Human-readable label shown in the template editor (e.g. 'First Name')",
    )
    variable_path = models.CharField(
        max_length=200,
        unique=True,
        help_text="Dot-notation path used in templates (e.g. 'user.first_name')",
    )
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPES,
        default='string',
        help_text="Expected data type for payload validation",
    )
    default_value = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Default value when payload omits this variable",
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Help text for staff editing templates",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_variables'
        ordering = ['variable_path']
        verbose_name = 'Email Variable'
        verbose_name_plural = 'Email Variables'

    def __str__(self):
        return f"{self.display_name} ({self.variable_path})"
