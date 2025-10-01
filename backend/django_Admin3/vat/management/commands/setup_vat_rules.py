"""
Management command to set up VAT calculation rules in Rules Engine.
Creates the complete VAT rule hierarchy for Epic 3.

Usage:
    python manage.py setup_vat_rules
    python manage.py setup_vat_rules --dry-run
    python manage.py setup_vat_rules --force  # Recreate existing rules
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from rules_engine.models import ActedRulesFields, ActedRule


class Command(BaseCommand):
    help = 'Set up VAT calculation rules for Rules Engine (Epic 3)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Recreate rules even if they already exist',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        try:
            with transaction.atomic():
                # Step 1: Create RulesFields schema
                self.stdout.write('\n=== Step 1: Creating RulesFields Schema ===')
                schema_created = self.create_rules_fields_schema(dry_run, force)

                # Step 2: Create all VAT rules
                self.stdout.write('\n=== Step 2: Creating VAT Rules ===')
                rules_created = self.create_vat_rules(dry_run, force)

                if dry_run:
                    self.stdout.write(self.style.WARNING('\nDRY RUN - Rolling back transaction'))
                    raise Exception("Dry run - rollback")

                self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully created {schema_created} schemas and {rules_created} rules'))

        except Exception as e:
            if "Dry run" in str(e):
                self.stdout.write(self.style.WARNING('Dry run completed - no changes made'))
            else:
                self.stdout.write(self.style.ERROR(f'\n✗ Error: {str(e)}'))
                raise

    def create_rules_fields_schema(self, dry_run, force):
        """Create RulesFields schema for VAT context validation."""
        schema_code = 'rf_vat_calculation_context'

        # Check if schema exists
        existing = ActedRulesFields.objects.filter(fields_code=schema_code).first()
        if existing and not force:
            self.stdout.write(self.style.WARNING(f'  Schema {schema_code} already exists (use --force to recreate)'))
            return 0

        if existing and force:
            self.stdout.write(self.style.WARNING(f'  Deleting existing schema {schema_code}'))
            if not dry_run:
                existing.delete()

        schema_definition = {
            "type": "object",
            "properties": {
                "user_address": {
                    "type": "object",
                    "properties": {
                        "country": {"type": "string"},
                        "region": {"type": "string"},
                        "postcode": {"type": "string"}
                    },
                    "required": ["country"]
                },
                "cart": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "item_id": {"type": "integer"},
                                    "product_code": {"type": "string"},
                                    "net_amount": {"type": "string"},
                                    "classification": {"type": "object"}
                                }
                            }
                        },
                        "total_net": {"type": "string"},
                        "total_vat": {"type": "string"}
                    },
                    "required": ["id", "items"]
                },
                "settings": {
                    "type": "object",
                    "properties": {
                        "effective_date": {"type": "string"},
                        "context_version": {"type": "string"}
                    }
                }
            },
            "required": ["user_address", "cart", "settings"]
        }

        self.stdout.write(f'  Creating schema: {schema_code}')
        if not dry_run:
            ActedRulesFields.objects.create(
                fields_code=schema_code,
                name='VAT Calculation Context Schema',
                description='JSON Schema for VAT calculation context validation (Epic 3)',
                schema=schema_definition,
                version=1,
                is_active=True
            )

        return 1

    def create_vat_rules(self, dry_run, force):
        """Create all VAT calculation rules."""
        rules = [
            self.get_master_vat_rule(),
            self.get_determine_region_rule(),
            self.get_per_item_orchestrator_rule(),
            self.get_standard_default_rule(),
            self.get_uk_ebook_zero_rule(),
            self.get_row_digital_zero_rule(),
            self.get_sa_special_rule(),
            self.get_live_tutorial_override_rule(),
        ]

        created_count = 0
        for rule_data in rules:
            created = self.create_rule(rule_data, dry_run, force)
            if created:
                created_count += 1

        return created_count

    def create_rule(self, rule_data, dry_run, force):
        """Create a single rule."""
        rule_code = rule_data['rule_code']

        # Check if rule exists
        existing = ActedRule.objects.filter(rule_code=rule_code).first()
        if existing and not force:
            self.stdout.write(self.style.WARNING(f'  Rule {rule_code} already exists (use --force to recreate)'))
            return False

        if existing and force:
            self.stdout.write(self.style.WARNING(f'  Deleting existing rule {rule_code}'))
            if not dry_run:
                existing.delete()

        self.stdout.write(f'  Creating rule: {rule_code} (priority {rule_data["priority"]})')
        if not dry_run:
            ActedRule.objects.create(**rule_data)

        return True

    def get_master_vat_rule(self):
        """Master VAT calculation orchestrator rule."""
        return {
            'rule_code': 'calculate_vat_master',
            'name': 'Master VAT Calculation Rule',
            'description': 'Orchestrates complete VAT calculation flow: region determination, per-item calculation, aggregation, and result storage',
            'entry_point': 'checkout_start',
            'priority': 100,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {'==': [1, 1]},  # Always run
            'actions': [
                {
                    'type': 'call_rule',
                    'rule_code': 'determine_vat_region',
                    'pass_context': True
                },
                {
                    'type': 'call_rule',
                    'rule_code': 'calculate_vat_per_item',
                    'pass_context': True
                },
                {
                    'type': 'update',
                    'target': 'cart.total_vat',
                    'operation': 'calculate_sum',
                    'source': 'cart.items[].vat_amount'
                },
                {
                    'type': 'update',
                    'target': 'cart.vat_result',
                    'operation': 'set',
                    'value': {
                        'items': {'var': 'cart.items'},
                        'totals': {
                            'total_net': {'var': 'cart.total_net'},
                            'total_vat': {'var': 'cart.total_vat'},
                            'total_gross': {'+': [{'var': 'cart.total_net'}, {'var': 'cart.total_vat'}]}
                        },
                        'region_info': {
                            'country': {'var': 'user_address.country'},
                            'region': {'var': 'user_address.region'},
                            'vat_treatment': 'standard'
                        }
                    }
                }
            ],
            'stop_processing': False,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5',
                'created_by': 'setup_vat_rules command'
            }
        }

    def get_determine_region_rule(self):
        """Region determination rule."""
        return {
            'rule_code': 'determine_vat_region',
            'name': 'Determine VAT Region',
            'description': 'Maps country code to VAT region using map_country_to_region function',
            'entry_point': 'checkout_start',
            'priority': 90,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {'==': [1, 1]},
            'actions': [
                {
                    'type': 'update',
                    'target': 'user_address.region',
                    'operation': 'set',
                    'value': {
                        'function': 'map_country_to_region',
                        'params': {'country': {'var': 'user_address.country'}}
                    }
                }
            ],
            'stop_processing': False,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5'
            }
        }

    def get_per_item_orchestrator_rule(self):
        """Per-item VAT calculation orchestrator."""
        return {
            'rule_code': 'calculate_vat_per_item',
            'name': 'Calculate VAT Per Item',
            'description': 'Orchestrator that calls all item-level VAT rules in priority order',
            'entry_point': 'calculate_vat_per_item',
            'priority': 50,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {'==': [1, 1]},
            'actions': [
                {'type': 'call_rule', 'rule_code': 'vat_standard_default', 'pass_context': True},
                {'type': 'call_rule', 'rule_code': 'uk_ebook_zero_vat', 'pass_context': True},
                {'type': 'call_rule', 'rule_code': 'row_digital_zero_vat', 'pass_context': True},
                {'type': 'call_rule', 'rule_code': 'sa_special_vat', 'pass_context': True},
                {'type': 'call_rule', 'rule_code': 'live_tutorial_vat_override', 'pass_context': True}
            ],
            'stop_processing': False,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5'
            }
        }

    def get_standard_default_rule(self):
        """Standard default VAT rates rule."""
        return {
            'rule_code': 'vat_standard_default',
            'name': 'Standard Default VAT Rates',
            'description': 'Applies standard VAT rates by region (UK: 20%, EU: 0%, ROW: 0%, SA: 15%)',
            'entry_point': 'calculate_vat_per_item',
            'priority': 10,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {'==': [1, 1]},
            'actions': [
                {
                    'type': 'update',
                    'target': 'item.vat_rate',
                    'operation': 'set',
                    'value': {
                        'function': 'get_vat_rate',
                        'params': {
                            'region': {'var': 'user_address.region'},
                            'classification': {'var': 'item.classification'}
                        }
                    }
                },
                {
                    'type': 'update',
                    'target': 'item.vat_amount',
                    'operation': 'set',
                    'value': {
                        'function': 'calculate_vat_amount',
                        'params': {
                            'net_amount': {'var': 'item.net_amount'},
                            'vat_rate': {'var': 'item.vat_rate'}
                        }
                    }
                },
                {
                    'type': 'update',
                    'target': 'item.vat_rule_applied',
                    'operation': 'set',
                    'value': 'vat_standard_default:v1'
                }
            ],
            'stop_processing': False,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5'
            }
        }

    def get_uk_ebook_zero_rule(self):
        """UK eBook zero VAT rule (post-2020)."""
        return {
            'rule_code': 'uk_ebook_zero_vat',
            'name': 'UK eBook Zero VAT (Post-2020)',
            'description': 'Zero-rates UK eBooks for sales after May 1, 2020',
            'entry_point': 'calculate_vat_per_item',
            'priority': 20,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {
                'and': [
                    {'==': [{'var': 'user_address.region'}, 'UK']},
                    {'==': [{'var': 'item.classification.is_ebook'}, True]},
                    {'>=': [{'var': 'settings.effective_date'}, '2020-05-01']}
                ]
            },
            'actions': [
                {'type': 'update', 'target': 'item.vat_rate', 'operation': 'set', 'value': '0.00'},
                {'type': 'update', 'target': 'item.vat_amount', 'operation': 'set', 'value': '0.00'},
                {'type': 'update', 'target': 'item.vat_rule_applied', 'operation': 'set', 'value': 'uk_ebook_zero_vat:v1'},
                {'type': 'update', 'target': 'item.exemption_reason', 'operation': 'set', 'value': 'UK eBook post-2020'}
            ],
            'stop_processing': True,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5',
                'regulation': 'UK VAT Notice 700/1 (May 2020)'
            }
        }

    def get_row_digital_zero_rule(self):
        """ROW digital products zero VAT rule."""
        return {
            'rule_code': 'row_digital_zero_vat',
            'name': 'ROW Digital Products Zero VAT',
            'description': 'Zero-rates digital products for Rest of World customers',
            'entry_point': 'calculate_vat_per_item',
            'priority': 15,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {
                'and': [
                    {'==': [{'var': 'user_address.region'}, 'ROW']},
                    {'==': [{'var': 'item.classification.is_digital'}, True]}
                ]
            },
            'actions': [
                {'type': 'update', 'target': 'item.vat_rate', 'operation': 'set', 'value': '0.00'},
                {'type': 'update', 'target': 'item.vat_amount', 'operation': 'set', 'value': '0.00'},
                {'type': 'update', 'target': 'item.vat_rule_applied', 'operation': 'set', 'value': 'row_digital_zero_vat:v1'},
                {'type': 'update', 'target': 'item.exemption_reason', 'operation': 'set', 'value': 'ROW digital products'}
            ],
            'stop_processing': True,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5'
            }
        }

    def get_sa_special_rule(self):
        """South Africa 15% VAT rule."""
        return {
            'rule_code': 'sa_special_vat',
            'name': 'South Africa 15% VAT',
            'description': 'Applies 15% VAT for South African customers',
            'entry_point': 'calculate_vat_per_item',
            'priority': 18,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {'==': [{'var': 'user_address.region'}, 'SA']},
            'actions': [
                {'type': 'update', 'target': 'item.vat_rate', 'operation': 'set', 'value': '0.15'},
                {
                    'type': 'update',
                    'target': 'item.vat_amount',
                    'operation': 'set',
                    'value': {
                        'function': 'calculate_vat_amount',
                        'params': {
                            'net_amount': {'var': 'item.net_amount'},
                            'vat_rate': '0.15'
                        }
                    }
                },
                {'type': 'update', 'target': 'item.vat_rule_applied', 'operation': 'set', 'value': 'sa_special_vat:v1'}
            ],
            'stop_processing': True,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5'
            }
        }

    def get_live_tutorial_override_rule(self):
        """Live tutorial VAT override rule."""
        return {
            'rule_code': 'live_tutorial_vat_override',
            'name': 'Live Tutorial VAT Override',
            'description': 'Special VAT handling for live tutorial products',
            'entry_point': 'calculate_vat_per_item',
            'priority': 25,
            'active': True,
            'version': 1,
            'rules_fields_code': 'rf_vat_calculation_context',
            'condition': {'==': [{'var': 'item.classification.is_live_tutorial'}, True]},
            'actions': [
                {
                    'type': 'update',
                    'target': 'item.vat_rate',
                    'operation': 'set',
                    'value': {
                        'function': 'get_vat_rate',
                        'params': {
                            'region': {'var': 'user_address.region'},
                            'classification': {'var': 'item.classification'}
                        }
                    }
                },
                {
                    'type': 'update',
                    'target': 'item.vat_amount',
                    'operation': 'set',
                    'value': {
                        'function': 'calculate_vat_amount',
                        'params': {
                            'net_amount': {'var': 'item.net_amount'},
                            'vat_rate': {'var': 'item.vat_rate'}
                        }
                    }
                },
                {'type': 'update', 'target': 'item.vat_rule_applied', 'operation': 'set', 'value': 'live_tutorial_vat_override:v1'}
            ],
            'stop_processing': True,
            'metadata': {
                'epic': 'Epic 3 - Dynamic VAT Calculation',
                'phase': 'Phase 5'
            }
        }
