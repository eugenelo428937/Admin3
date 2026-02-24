from django.db import models
from django.utils.html import escape


class ClosingSalutation(models.Model):
    """Reusable closing salutation block for email templates."""

    SIGNATURE_TYPE_CHOICES = [
        ('team', 'Team'),
        ('staff', 'Staff'),
    ]

    STAFF_NAME_FORMAT_CHOICES = [
        ('full_name', 'Full Name'),
        ('first_name', 'First Name Only'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="Salutation identifier")
    display_name = models.CharField(max_length=200, help_text="Human-readable name")
    sign_off_text = models.CharField(max_length=200, default='Kind Regards', help_text="Sign-off line, e.g. 'Kind Regards'")
    signature_type = models.CharField(max_length=10, choices=SIGNATURE_TYPE_CHOICES, default='team')
    team_signature = models.CharField(max_length=200, blank=True, help_text="Team name when signature_type is 'team'")
    staff_name_format = models.CharField(max_length=20, choices=STAFF_NAME_FORMAT_CHOICES, default='full_name', help_text="How staff names are displayed")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_closing_salutation'
        ordering = ['name']
        verbose_name = 'Closing Salutation'
        verbose_name_plural = 'Closing Salutations'

    def __str__(self):
        return f"{self.display_name} ({self.signature_type})"

    def render_mjml(self):
        """Generate the MJML snippet for this closing salutation."""
        if self.signature_type == 'team':
            name_lines = f'<b>{escape(self.team_signature)}</b><br/>' if self.team_signature else ''
        else:
            staff_entries = self.staff_members.select_related('staff__user').order_by('display_order')
            lines = []
            for entry in staff_entries:
                user = entry.staff.user
                if self.staff_name_format == 'first_name':
                    name = escape(user.first_name)
                else:
                    name = escape(user.get_full_name() or user.username)
                lines.append(f'<b>{name}</b><br/>')
            name_lines = '\n      '.join(lines)

        return (
            '<mj-section background-color="#ffffff">\n'
            '  <mj-column width="100%" padding="0" background-color="#ffffff">\n'
            '    <mj-text align="left" css-class="signature-section" padding="12px 24px">\n'
            f'      {escape(self.sign_off_text)},<br/>\n'
            f'      {name_lines}\n'
            '    </mj-text>\n'
            '  </mj-column>\n'
            '</mj-section>'
        )


class ClosingSalutationStaff(models.Model):
    """Ordered staff members for a closing salutation."""

    closing_salutation = models.ForeignKey(
        ClosingSalutation,
        on_delete=models.CASCADE,
        related_name='staff_members',
    )
    staff = models.ForeignKey(
        'tutorials.Staff',
        on_delete=models.CASCADE,
        related_name='closing_salutations',
    )
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'utils_email_closing_salutation_staff'
        unique_together = ['closing_salutation', 'staff']
        ordering = ['display_order']
        verbose_name = 'Closing Salutation Staff'
        verbose_name_plural = 'Closing Salutation Staff'

    def __str__(self):
        return f"{self.closing_salutation.name} - {self.staff}"
