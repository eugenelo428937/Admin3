from django.db import models


class ClosingSalutation(models.Model):
    """Reusable closing salutation block for email templates.

    Provides three template variables for the closing component:
      {{ salutation }}  — sign_off_text (e.g. "Kind Regards")
      {{ signature }}   — display_name (e.g. "Eugene" or "The ActEd Team")
      {{ job_title }}   — job_title (e.g. "Senior Tutor", optional)
    """

    name = models.CharField(max_length=100, unique=True, help_text="Salutation identifier")
    display_name = models.CharField(max_length=200, help_text="Signature name shown in the email")
    sign_off_text = models.CharField(
        max_length=200,
        blank=True,
        default='Kind Regards',
        help_text="Sign-off line (e.g. 'Kind Regards', 'Best Wishes')",
    )
    job_title = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Job title shown below the signature (optional)",
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_closing_salutation'
        ordering = ['name']
        verbose_name = 'Closing Salutation'
        verbose_name_plural = 'Closing Salutations'

    def __str__(self):
        return self.display_name
