from django.db import models


class EmailMjmlElement(models.Model):
    """
    Stores MJML templates for each fixed markdown element type.
    Staff can edit the MJML styling via API without code changes.
    """

    ELEMENT_TYPES = [
        ('heading_1', 'Heading 1'),
        ('heading_2', 'Heading 2'),
        ('heading_3', 'Heading 3'),
        ('paragraph', 'Paragraph'),
        ('table', 'Table'),
        ('bold', 'Bold'),
        ('italic', 'Italic'),
        ('link', 'Link'),
        ('horizontal_divider', 'Horizontal Divider'),
    ]

    element_type = models.CharField(
        max_length=50,
        choices=ELEMENT_TYPES,
        unique=True,
    )
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    mjml_template = models.TextField(
        help_text='MJML template with {{content}}, {{url}}, {{headers}}, {{rows}} placeholders'
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_mjml_element'
        ordering = ['element_type']

    def __str__(self):
        return f'{self.display_name} ({self.element_type})'
