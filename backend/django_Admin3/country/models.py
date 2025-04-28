from django.db import models

class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    iso_code = models.CharField(max_length=10, unique=True, help_text="ISO 3166-1 alpha-2 or alpha-3 code")
    phone_code = models.CharField(max_length=10, help_text="International dialing code, e.g. +44")
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.0, help_text="VAT percentage, e.g. 20.00")
    have_postcode = models.BooleanField(default=True, help_text="Does this country use postcodes?")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Countries"
        ordering = ["name"]
