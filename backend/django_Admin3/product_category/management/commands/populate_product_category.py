from django.core.management.base import BaseCommand
from product_category.models import ProductCategory

CATEGORIES = [
    {"code": "N", "name": "Course Notes"},
    {"code": "C", "name": "Combined Materials Pack"},
    # Add more categories here as needed
]


class Command(BaseCommand):
    help = "Populate the acted_product_category table with initial categories."

    def handle(self, *args, **options):
        created = 0
        for cat in CATEGORIES:
            obj, was_created = ProductCategory.objects.get_or_create(
                code=cat["code"], defaults={"name": cat["name"]}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f"{created} categories created/added."))
