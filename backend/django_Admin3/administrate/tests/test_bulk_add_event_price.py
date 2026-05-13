"""
Tests for the bulk_add_event_price management command.

The command:
  1. Fetches events by sitting + lifecycle state.
  2. Looks up the active financial unit ID.
  3. Resolves the price level external_id from adm.pricelevels by name.
  4. For each event, calls the addEventPriceLevel mutation.
"""
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from administrate.models.price_levels import PriceLevel


class BulkAddEventPriceCommandTest(TestCase):
    def setUp(self):
        self.price_level = PriceLevel.objects.create(
            external_id="PL-EXT-123",
            name="Standard",
            description="Standard price level",
        )

    def _events_payload(self, ids):
        return {
            "data": {
                "events": {
                    "pageInfo": {"totalRecords": len(ids), "hasNextPage": False},
                    "edges": [{"node": {"id": eid}} for eid in ids],
                }
            }
        }

    def _financial_unit_payload(self, fu_id):
        return {
            "data": {
                "currencies": {
                    "edges": [
                        {
                            "node": {
                                "id": fu_id,
                                "name": "GBP",
                                "code": "GBP",
                                "isActive": True,
                            }
                        }
                    ]
                }
            }
        }

    def _add_price_payload(self, price_id="PRICE-1", errors=None):
        return {
            "data": {
                "event": {
                    "addPrices": {
                        "prices": [{"id": price_id}],
                        "errors": errors or [],
                    }
                }
            }
        }

    @patch("administrate.management.commands.bulk_add_event_price.AdministrateAPIService")
    def test_calls_add_event_price_for_each_event(self, mock_service_cls):
        api = mock_service_cls.return_value
        api.execute_query.side_effect = [
            self._events_payload(["E1", "E2", "E3"]),
            self._financial_unit_payload("FU-1"),
            self._add_price_payload("P1"),
            self._add_price_payload("P2"),
            self._add_price_payload("P3"),
        ]

        out = StringIO()
        call_command(
            "bulk_add_event_price",
            "--sitting", "25S",
            "--lifecycle-state", "published",
            "--price-level", "Standard",
            "--amount", "250.00",
            stdout=out,
        )

        # 1 events query + 1 financial unit query + 3 mutations
        self.assertEqual(api.execute_query.call_count, 5)

        mutation_calls = api.execute_query.call_args_list[2:]
        for call_obj, expected_event in zip(mutation_calls, ["E1", "E2", "E3"]):
            _, variables = call_obj.args
            self.assertEqual(variables["eventId"], expected_event)
            self.assertEqual(variables["financialUnitId"], "FU-1")
            self.assertEqual(variables["priceLevelId"], "PL-EXT-123")
            self.assertEqual(variables["amount"], "250.00")

        output = out.getvalue()
        self.assertIn("succeeded=3", output)
        self.assertIn("failed=0", output)

    @patch("administrate.management.commands.bulk_add_event_price.AdministrateAPIService")
    def test_raises_when_price_level_name_not_found(self, mock_service_cls):
        # Add a couple more rows so the error message has something to surface.
        PriceLevel.objects.create(external_id="PL-EXT-456", name="Retaker")
        PriceLevel.objects.create(external_id="PL-EXT-789", name="Reduced")

        with self.assertRaises(CommandError) as ctx:
            call_command(
                "bulk_add_event_price",
                "--sitting", "25S",
                "--lifecycle-state", "published",
                "--price-level", "NonExistent",
                "--amount", "250.00",
            )
        msg = str(ctx.exception)
        self.assertIn("price level", msg.lower())
        # Available names should be surfaced to help the operator.
        self.assertIn("Standard", msg)
        self.assertIn("Retaker", msg)
        self.assertIn("Reduced", msg)
        # No GraphQL calls should be made if we can't resolve the price level.
        mock_service_cls.return_value.execute_query.assert_not_called()

    @patch("administrate.management.commands.bulk_add_event_price.AdministrateAPIService")
    def test_raises_loudly_on_duplicate_price_level_names(self, mock_service_cls):
        # Two rows share the same name — the user explicitly chose to fail loudly.
        PriceLevel.objects.create(external_id="PL-EXT-DUP", name="Standard")

        with self.assertRaises(CommandError) as ctx:
            call_command(
                "bulk_add_event_price",
                "--sitting", "25S",
                "--lifecycle-state", "published",
                "--price-level", "Standard",
                "--amount", "250.00",
            )
        msg = str(ctx.exception).lower()
        self.assertIn("multiple", msg)
        self.assertIn("standard", msg)
        mock_service_cls.return_value.execute_query.assert_not_called()

    @patch("administrate.management.commands.bulk_add_event_price.AdministrateAPIService")
    def test_accepts_price_level_id_directly(self, mock_service_cls):
        api = mock_service_cls.return_value
        api.execute_query.side_effect = [
            self._events_payload(["E1"]),
            self._financial_unit_payload("FU-1"),
            self._add_price_payload("P1"),
        ]

        out = StringIO()
        call_command(
            "bulk_add_event_price",
            "--sitting", "25S",
            "--lifecycle-state", "published",
            "--price-level-external-id", "PL-DIRECT-999",
            "--amount", "100.00",
            stdout=out,
        )

        # The mutation should receive the externally supplied id verbatim.
        _, variables = api.execute_query.call_args_list[2].args
        self.assertEqual(variables["priceLevelId"], "PL-DIRECT-999")
        self.assertIn("succeeded=1", out.getvalue())

    def test_requires_either_price_level_or_id(self):
        with self.assertRaises(CommandError):
            call_command(
                "bulk_add_event_price",
                "--sitting", "25S",
                "--lifecycle-state", "published",
                "--amount", "100.00",
            )

    @patch("administrate.management.commands.bulk_add_event_price.AdministrateAPIService")
    def test_dry_run_skips_mutations(self, mock_service_cls):
        api = mock_service_cls.return_value
        api.execute_query.side_effect = [
            self._events_payload(["E1", "E2"]),
            self._financial_unit_payload("FU-1"),
        ]

        out = StringIO()
        call_command(
            "bulk_add_event_price",
            "--sitting", "25S",
            "--lifecycle-state", "published",
            "--price-level", "Standard",
            "--amount", "100.00",
            "--dry-run",
            stdout=out,
        )

        # Only the two read queries should have run.
        self.assertEqual(api.execute_query.call_count, 2)
        self.assertIn("DRY RUN", out.getvalue())

    @patch("administrate.management.commands.bulk_add_event_price.AdministrateAPIService")
    def test_reports_mutation_errors(self, mock_service_cls):
        api = mock_service_cls.return_value
        api.execute_query.side_effect = [
            self._events_payload(["E1", "E2"]),
            self._financial_unit_payload("FU-1"),
            self._add_price_payload("P1"),
            self._add_price_payload(
                errors=[{"label": "amount", "message": "invalid", "value": "x"}]
            ),
        ]

        out = StringIO()
        call_command(
            "bulk_add_event_price",
            "--sitting", "25S",
            "--lifecycle-state", "published",
            "--price-level", "Standard",
            "--amount", "100.00",
            stdout=out,
        )
        output = out.getvalue()
        self.assertIn("succeeded=1", output)
        self.assertIn("failed=1", output)
