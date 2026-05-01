"""
Bulk-add a single price level to every course template in Administrate.

Flow:
  1. Page through `get_all_course_templates` to collect every template id.
  2. For each template, call `add_course_template_price` mutation with the
     amount / financialUnitId / regionId supplied via CLI.

Usage:
  python manage.py bulk_add_course_template_price \
      --amount 250.00 \
      --price-level-id <ID> \
      --financial-unit-id <ID> \
      --region-id <ID> \
      [--dry-run] [--debug] [--page-size 100]
"""
import logging
import time
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError

from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import (
    load_graphql_query,
    load_graphql_mutation,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Add a price level to every course template via Administrate GraphQL."

    def add_arguments(self, parser):
        parser.add_argument('--amount', required=True, type=str,
                            help='Decimal price amount, e.g. 250.00')
        parser.add_argument('--price-level-id', required=True, type=str,
                            help='Administrate priceLevel GraphQL ID')
        parser.add_argument('--financial-unit-id', required=True, type=str,
                            help='Administrate financialUnit GraphQL ID')
        parser.add_argument('--region-id', required=True, type=str,
                            help='Administrate region GraphQL ID')
        parser.add_argument('--page-size', type=int, default=100,
                            help='Templates per page when fetching (default: 100)')
        parser.add_argument('--sleep', type=float, default=0.0,
                            help='Seconds to sleep between mutation calls (default: 0)')
        parser.add_argument('--dry-run', action='store_true',
                            help='List templates that would be updated without calling the mutation')
        parser.add_argument('--debug', action='store_true',
                            help='Verbose logging')

    def handle(self, *args, **options):
        debug = options['debug']
        dry_run = options['dry_run']
        page_size = options['page_size']
        sleep_secs = options['sleep']

        if debug:
            logger.setLevel(logging.DEBUG)

        try:
            amount = Decimal(options['amount'])
        except InvalidOperation:
            raise CommandError(f"Invalid --amount: {options['amount']}")

        price_level_id = options['price_level_id']
        financial_unit_id = options['financial_unit_id']
        region_id = options['region_id']

        api_service = AdministrateAPIService()

        # ----- 1. Fetch all course templates -----
        templates = self._fetch_all_templates(api_service, page_size, debug)
        self.stdout.write(f"Fetched {len(templates)} course templates.")

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "DRY RUN — no mutations will be sent."
            ))

        # ----- 2. Apply mutation per template -----
        mutation = load_graphql_mutation('add_course_template_price')

        succeeded = 0
        skipped = 0
        failed = 0

        for edge in templates:
            node = edge.get('node') or {}
            template_id = node.get('id')
            code = node.get('code', '<no-code>')

            if not template_id:
                skipped += 1
                continue

            # ---- DECISION POINT: see should_apply_to_template() below ----
            if not should_apply_to_template(node):
                if debug:
                    self.stdout.write(f"  skip {code} (filtered out)")
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f"  [dry-run] would add price to {code} ({template_id})")
                succeeded += 1
                continue

            ok, err = self._add_price(
                api_service, mutation,
                template_id, amount, price_level_id,
                financial_unit_id, region_id,
                debug,
            )
            if ok:
                succeeded += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ {code}"))
            else:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  ✗ {code}: {err}"))

            if sleep_secs:
                time.sleep(sleep_secs)

        # ----- 3. Summary -----
        self.stdout.write(self.style.SUCCESS(
            f"\nDone. succeeded={succeeded} failed={failed} skipped={skipped}"
        ))

    # ------------------------------------------------------------------ helpers

    def _fetch_all_templates(self, api_service, page_size, debug):
        query = load_graphql_query('get_all_course_templates')
        offset = 0
        collected = []

        while True:
            variables = {"first": page_size, "offset": offset}
            result = api_service.execute_query(query, variables)

            ct_payload = (result or {}).get('data', {}).get('courseTemplates') or {}
            edges = ct_payload.get('edges') or []
            page_info = ct_payload.get('pageInfo') or {}

            collected.extend(edges)
            if debug:
                self.stdout.write(
                    f"  page offset={offset} got={len(edges)} total={len(collected)}"
                )

            if not page_info.get('hasNextPage') or not edges:
                break
            offset += page_size

        return collected

    def _add_price(self, api_service, mutation,
                   template_id, amount, price_level_id,
                   financial_unit_id, region_id, debug):
        variables = {
            "courseTemplateId": template_id,
            "priceLevelId": price_level_id,
            "amount": str(amount),  # Decimal scalar accepts string form
            "financialUnitId": financial_unit_id,
            "regionId": region_id,
        }
        try:
            result = api_service.execute_query(mutation, variables)
        except Exception as e:  # transport-level failure
            if debug:
                logger.exception(e)
            return False, f"transport error: {e}"

        payload = (
            (result or {})
            .get('data', {})
            .get('courseTemplate', {})
            .get('addPublicPrices')
        ) or {}

        errors = payload.get('errors') or []
        if errors:
            return False, "; ".join(
                f"{e.get('label')}: {e.get('message')}" for e in errors
            )

        if not payload.get('prices'):
            return False, "no prices returned and no errors — unexpected response"

        return True, None


def should_apply_to_template(template_node: dict) -> bool:
    # Apply to every template that has a usable id.
    # Narrow this later (by code prefix, learning mode, custom field, etc.)
    # if you need to scope a run to a subset.
    return bool(template_node.get('id'))
