"""
Bulk-add a price level to every event matching a sitting + lifecycle state.

Flow:
  1. Run `get_events_by_sitting_and_lifecycle` to collect all matching event ids.
  2. Run `get_active_financial_unit` to resolve the financial unit id (uses the
     first active currency returned).
  3. Resolve the priceLevel external id from `adm.pricelevels` by name.
  4. For each event, call the `add_event_price` mutation.

Usage:
  python manage.py bulk_add_event_price \
      --sitting 25S \
      --lifecycle-state published \
      --price-level Standard \
      --amount 250.00 \
      [--dry-run] [--debug] [--page-size 100] [--sleep 0]
"""
import logging
import time
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError

from administrate.models.price_levels import PriceLevel
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.graphql_loader import (
    load_graphql_mutation,
    load_graphql_query,
)

logger = logging.getLogger(__name__)

VALID_LIFECYCLE_STATES = {"published", "draft"}


class Command(BaseCommand):
    help = "Add a price level to every event matching sitting + lifecycle state."

    def add_arguments(self, parser):
        parser.add_argument("--sitting", required=True, type=str,
                            help='Sitting code (matched as "wordlike" against event title), e.g. "25S".')
        parser.add_argument("--lifecycle-state", required=True, type=str,
                            choices=sorted(VALID_LIFECYCLE_STATES),
                            help="Event lifecycleState filter: published or draft.")
        # Exactly one of --price-level (by name) or --price-level-external-id (by external id).
        price_group = parser.add_mutually_exclusive_group(required=True)
        price_group.add_argument("--price-level", type=str,
                                 help='Name of the PriceLevel row in adm.pricelevels (e.g. "Standard").')
        price_group.add_argument("--price-level-external-id", type=str,
                                 help="Administrate priceLevel external id (skips name lookup).")
        parser.add_argument("--amount", required=True, type=str,
                            help="Decimal price amount, e.g. 250.00")
        parser.add_argument("--page-size", type=int, default=100,
                            help="Events per page when fetching (default: 100).")
        parser.add_argument("--sleep", type=float, default=0.0,
                            help="Seconds to sleep between mutation calls (default: 0).")
        parser.add_argument("--dry-run", action="store_true",
                            help="List events that would be updated without calling the mutation.")
        parser.add_argument("--debug", action="store_true",
                            help="Verbose logging.")

    def handle(self, *args, **options):
        if options["debug"]:
            logger.setLevel(logging.DEBUG)

        try:
            amount = Decimal(options["amount"])
        except InvalidOperation:
            raise CommandError(f"Invalid --amount: {options['amount']}")

        sitting = options["sitting"]
        lifecycle_state = options["lifecycle_state"]
        price_level_name = options.get("price_level")
        price_level_id_arg = options.get("price_level_external_id")
        page_size = options["page_size"]
        sleep_secs = options["sleep"]
        dry_run = options["dry_run"]
        debug = options["debug"]

        # ----- Resolve price level FIRST (fail fast before any HTTP) ------------
        # The mutex group guarantees exactly one of these is set.
        if price_level_id_arg:
            price_level_id = price_level_id_arg
        else:
            price_level_id = resolve_price_level_external_id(price_level_name)

        # ----- 1. Fetch all matching events --------------------------------------
        api_service = AdministrateAPIService()
        events = self._fetch_events(api_service, sitting, lifecycle_state, page_size, debug)
        self.stdout.write(f"Fetched {len(events)} event(s) for sitting={sitting} state={lifecycle_state}.")

        # ----- 2. Resolve financial unit -----------------------------------------
        financial_unit_id = self._fetch_active_financial_unit_id(api_service, debug)
        self.stdout.write(f"Using financialUnitId={financial_unit_id}.")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no mutations will be sent."))

        # ----- 4. Apply mutation per event ---------------------------------------
        mutation = load_graphql_mutation("add_event_price")
        succeeded = failed = skipped = 0

        for edge in events:
            node = edge.get("node") or {}
            event_id = node.get("id")
            if not event_id:
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f"  [dry-run] would add price to event {event_id}")
                succeeded += 1
                continue

            ok, err = self._add_price(
                api_service, mutation, event_id, amount,
                financial_unit_id, price_level_id, debug,
            )
            if ok:
                succeeded += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ {event_id}"))
            else:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  ✗ {event_id}: {err}"))

            if sleep_secs:
                time.sleep(sleep_secs)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. succeeded={succeeded} failed={failed} skipped={skipped}"
        ))

    # --------------------------------------------------------------- helpers ----

    def _fetch_events(self, api_service, sitting, lifecycle_state, page_size, debug):
        query = load_graphql_query("get_events_by_sitting_and_lifecycle")
        offset = 0
        collected = []

        while True:
            variables = {
                "current_sitting": sitting,
                "state": lifecycle_state,
                "first": page_size,
                "offset": offset,
            }
            result = api_service.execute_query(query, variables)

            events_payload = (result or {}).get("data", {}).get("events") or {}
            edges = events_payload.get("edges") or []
            page_info = events_payload.get("pageInfo") or {}

            collected.extend(edges)
            if debug:
                self.stdout.write(
                    f"  page offset={offset} got={len(edges)} total={len(collected)}"
                )

            if not page_info.get("hasNextPage") or not edges:
                break
            offset += page_size

        return collected

    def _fetch_active_financial_unit_id(self, api_service, debug):
        query = load_graphql_query("get_active_financial_unit")
        result = api_service.execute_query(query, {})
        edges = ((result or {}).get("data", {}).get("currencies") or {}).get("edges") or []
        if not edges:
            raise CommandError("No active financial unit returned by Administrate.")
        node = edges[0].get("node") or {}
        fu_id = node.get("id")
        if not fu_id:
            raise CommandError("Active financial unit response had no id.")
        if debug:
            self.stdout.write(f"  financial unit: {node.get('code')} ({fu_id})")
        return fu_id

    def _add_price(self, api_service, mutation, event_id, amount,
                   financial_unit_id, price_level_id, debug):
        variables = {
            "amount": str(amount),  # Decimal scalar accepts string form
            "eventId": event_id,
            "financialUnitId": financial_unit_id,
            "priceLevelId": price_level_id,
        }
        try:
            result = api_service.execute_query(mutation, variables)
        except Exception as e:
            if debug:
                logger.exception(e)
            return False, f"transport error: {e}"

        payload = (
            (result or {})
            .get("data", {})
            .get("event", {})
            .get("addPrices")
        ) or {}

        errors = payload.get("errors") or []
        if errors:
            return False, "; ".join(
                f"{e.get('label')}: {e.get('message')}" for e in errors
            )
        if not payload.get("prices"):
            return False, "no prices returned and no errors — unexpected response"
        return True, None


def resolve_price_level_external_id(name: str) -> str:
    """
    Resolve the Administrate `external_id` for a PriceLevel given its name.

    Design decisions (operator-facing):
      * Strict, case-sensitive `.get(name=name)` — typos surface as a clear
        "not found" error rather than silently mismatching.
      * Duplicate names fail loudly. `adm.pricelevels` does not enforce a
        unique constraint on `name`, so we surface `MultipleObjectsReturned`
        as a CommandError listing the colliding external_ids — the operator
        must pass `--price-level-external-id` to disambiguate.
      * On miss, list every available name so the operator can self-correct
        without opening psql.
    """
    try:
        return PriceLevel.objects.get(name=name).external_id
    except PriceLevel.DoesNotExist:
        available = list(
            PriceLevel.objects.order_by("name").values_list("name", flat=True)
        )
        names_str = ", ".join(available) if available else "(none)"
        raise CommandError(
            f"Price level '{name}' not found in adm.pricelevels. "
            f"Available names: {names_str}. "
            f"Pass --price-level-external-id <external_id> to skip the name lookup."
        )
    except PriceLevel.MultipleObjectsReturned:
        duplicates = list(
            PriceLevel.objects.filter(name=name)
            .order_by("external_id")
            .values_list("external_id", flat=True)
        )
        raise CommandError(
            f"Multiple price levels share the name '{name}': {duplicates}. "
            f"Re-run with --price-level-external-id <external_id> to disambiguate."
        )
