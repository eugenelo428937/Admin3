"""
Management command to create Phase 3 composite VAT calculation rules.

Creates 18 VAT rules:
- 1 master rule (calculate_vat) - Priority 100
- 5 regional rules (UK, IE, EU, SA, ROW) - Priority 90
- 12 product-specific rules (UK product types including Marking, generic regional) - Priority 80-95

Rules are stored in ActedRule model as JSONB and execute at cart_calculate_vat entry point.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal

from rules_engine.models import ActedRulesFields, ActedRule


class Command(BaseCommand):
    help = 'Create Phase 3 composite VAT calculation rules (18 rules total)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview rules without creating them in database',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing rules (updates if rule_id exists)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each rule creation',
        )

    def handle(self, *args, **options):
        """
        Create all 18 composite VAT rules following Phase 3 specification.

        Execution order:
        1. Master rule (calculate_vat) - Priority 100
        2. Regional rules (UK, IE, EU, SA, ROW) - Priority 90
        3. Product rules (UK Digital, Printed, Marking, etc.) - Priority 80-95
        """
        dry_run = options.get('dry_run', False)
        force_update = options.get('force', False)
        verbose = options.get('verbose', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN MODE - No database changes]\n'))

        if verbose:
            self.stdout.write('Creating VAT composite rules...')

        with transaction.atomic():
            # T022: Create context schema
            schema = self.create_context_schema(verbose, dry_run)

            if not dry_run and verbose:
                self.stdout.write(self.style.SUCCESS(f'✓ Created context schema: {schema.fields_code}'))

            # T023: Create master rule
            master_rule = self.create_master_rule(schema, verbose, dry_run)

            if not dry_run and verbose:
                self.stdout.write(self.style.SUCCESS(f'✓ Created master rule: {master_rule.rule_code}'))

            # T025: Create 5 regional rules
            regional_rules = self.create_regional_rules(schema, verbose, dry_run)

            if not dry_run and verbose:
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(regional_rules)} regional rules'))
                for rule in regional_rules:
                    self.stdout.write(f'  - {rule.rule_code}')

            # T027-T028: Create 9 product-specific rules (including Marking)
            product_rules = self.create_product_rules(schema, verbose, dry_run)

            if not dry_run and verbose:
                self.stdout.write(self.style.SUCCESS(f'✓ Created {len(product_rules)} product rules'))
                for rule in product_rules:
                    self.stdout.write(f'  - {rule.rule_code}')

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✅ All 18 VAT composite rules created successfully!'))
        self.stdout.write(f'  - 1 master rule (priority 100)')
        self.stdout.write(f'  - 5 regional rules (priority 90)')
        self.stdout.write(f'  - {len(product_rules) if not dry_run else "9"} product rules (priority 80-95)')
        self.stdout.write('='*60)

    def create_context_schema(self, verbose=False, dry_run=False):
        """
        T022: Create context schema for VAT calculation rules.

        Returns the ActedRulesFields object for cart_vat_context_schema.
        """
        schema_code = 'cart_vat_context_schema'
        schema_name = 'Cart VAT Calculation Context'

        # JSON Schema definition from data-model.md lines 264-291
        schema = {
            "type": "object",
            "properties": {
                "cart_item": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "product_type": {
                            "type": "string",
                            "enum": ["Digital", "Printed", "FlashCard", "PBOR", "Tutorial", "Marking"]
                        },
                        "net_amount": {"type": "number"},
                        "vat_amount": {"type": "number"},
                        "gross_amount": {"type": "number"}
                    },
                    "required": ["id", "product_type", "net_amount"]
                },
                "user": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "country_code": {
                            "type": "string",
                            "pattern": "^[A-Z]{2}$"
                        }
                    },
                    "required": ["id", "country_code"]
                },
                "vat": {"type": "object"}
            },
            "required": ["cart_item", "user"]
        }

        if verbose:
            self.stdout.write(f'  Creating schema: {schema_code}')

        if dry_run:
            self.stdout.write(self.style.WARNING(f'  [DRY RUN] Would create schema: {schema_code}'))
            # Return a mock object for dry run
            class MockSchema:
                fields_code = schema_code
            return MockSchema()

        # Use update_or_create for idempotency
        schema_obj, created = ActedRulesFields.objects.update_or_create(
            fields_code=schema_code,
            defaults={
                'name': schema_name,
                'schema': schema,
                'is_active': True
            }
        )

        if verbose:
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} schema: {schema_code}')

        return schema_obj

    def create_master_rule(self, schema, verbose=False, dry_run=False):
        """
        T023: Create master VAT calculation rule.

        Returns the ActedRule object for calculate_vat master rule.
        """
        rule_code = 'calculate_vat'
        rule_name = 'Master VAT Calculation Rule'

        # Master rule schema from data-model.md lines 18-36
        rule_data = {
            'rule_code': rule_code,
            'name': rule_name,
            'description': 'Master entry point for VAT calculations - determines region and delegates',
            'entry_point': 'cart_calculate_vat',
            'priority': 100,  # Highest priority
            'active': True,
            'version': 1,
            'rules_fields_code': schema.fields_code if not dry_run else 'cart_vat_context_schema',
            'condition': {"!=": [{"var": "user.country_code"}, None]},
            'actions': [
                {
                    "type": "call_function",
                    "function": "lookup_region",
                    "args": [{"var": "user.country_code"}],
                    "store_result_in": "vat.region"
                }
            ],
            'stop_processing': False,  # Allow regional rules to execute
            'metadata': {
                'phase': 'phase_3',
                'created_by': 'setup_vat_composite_rules',
                'rule_type': 'master'
            }
        }

        if verbose:
            self.stdout.write(f'  Creating master rule: {rule_code}')

        if dry_run:
            self.stdout.write(self.style.WARNING(f'  [DRY RUN] Would create rule: {rule_code}'))
            # Return mock object for dry run
            class MockRule:
                rule_code = rule_code
            return MockRule()

        # Use update_or_create for idempotency
        rule_obj, created = ActedRule.objects.update_or_create(
            rule_code=rule_code,
            defaults=rule_data
        )

        if verbose:
            action = 'Created' if created else 'Updated'
            self.stdout.write(f'  {action} master rule: {rule_code} (priority {rule_data["priority"]})')

        return rule_obj

    def create_regional_rules(self, schema, verbose=False, dry_run=False):
        """
        T025: Create 5 regional VAT calculation rules.

        Returns list of ActedRule objects for regional rules.
        """
        regional_rules = []

        # Regional rule definitions
        regional_configs = [
            {
                'rule_code': 'calculate_vat_uk',
                'name': 'UK VAT Calculation',
                'region': 'UK',
                'country_arg': 'GB'
            },
            {
                'rule_code': 'calculate_vat_ie',
                'name': 'Ireland VAT Calculation',
                'region': 'IE',
                'country_arg': 'IE'
            },
            {
                'rule_code': 'calculate_vat_eu',
                'name': 'EU VAT Calculation',
                'region': 'EU',
                'country_arg': {"var": "user.country_code"}  # Use actual country code
            },
            {
                'rule_code': 'calculate_vat_sa',
                'name': 'South Africa VAT Calculation',
                'region': 'SA',
                'country_arg': 'ZA'
            },
            {
                'rule_code': 'calculate_vat_row',
                'name': 'Rest of World VAT Calculation',
                'region': 'ROW',
                'country_arg': 'XX'  # Unknown country code - will return 0.00
            }
        ]

        for config in regional_configs:
            rule_code = config['rule_code']
            rule_name = config['name']
            region = config['region']
            country_arg = config['country_arg']

            # Build args for lookup_vat_rate call
            # All regional rules pass a country code to lookup_vat_rate
            # For ROW, we pass 'XX' which doesn't exist and returns 0.00
            args = [country_arg]

            rule_data = {
                'rule_code': rule_code,
                'name': rule_name,
                'description': f'Regional VAT calculation for {region}',
                'entry_point': 'cart_calculate_vat',
                'priority': 90,  # Regional rules all have priority 90
                'active': True,
                'version': 1,
                'rules_fields_code': schema.fields_code if not dry_run else 'cart_vat_context_schema',
                'condition': {"==": [{"var": "vat.region"}, region]},
                'actions': [
                    {
                        "type": "call_function",
                        "function": "lookup_vat_rate",
                        "args": args,
                        "store_result_in": "vat.rate"
                    }
                ],
                'stop_processing': False,  # Allow product rules to execute
                'metadata': {
                    'phase': 'phase_3',
                    'created_by': 'setup_vat_composite_rules',
                    'rule_type': 'regional',
                    'region': region
                }
            }

            if verbose:
                self.stdout.write(f'  Creating regional rule: {rule_code}')

            if dry_run:
                self.stdout.write(self.style.WARNING(f'  [DRY RUN] Would create rule: {rule_code}'))
                # Return mock object for dry run
                class MockRule:
                    def __init__(self, code):
                        self.rule_code = code
                regional_rules.append(MockRule(rule_code))
            else:
                # Use update_or_create for idempotency
                rule_obj, created = ActedRule.objects.update_or_create(
                    rule_code=rule_code,
                    defaults=rule_data
                )

                if verbose:
                    action = 'Created' if created else 'Updated'
                    self.stdout.write(f'  {action} regional rule: {rule_code} (priority {rule_data["priority"]})')

                regional_rules.append(rule_obj)

        return regional_rules

    def create_product_rules(self, schema, verbose=False, dry_run=False):
        """
        T027-T028: Create 9 product-specific VAT calculation rules.

        Returns list of ActedRule objects for product rules.
        """
        product_rules = []

        # Product rule definitions
        # vat_rate_override: Set to override the regional VAT rate for specific product types
        # - None means use the regional rate (set by calculate_vat_uk, etc.)
        # - 0.00 means zero-rated (printed materials in UK)
        product_configs = [
            # UK-specific product rules (5 rules)
            {
                'rule_code': 'calculate_vat_uk_digital_product',
                'name': 'UK Digital Product VAT',
                'region': 'UK',
                'product_type': 'Digital',
                'priority': 85,  # Lower than regional rules (90)
                'vat_rate_override': None  # Use regional rate (20%)
            },
            {
                'rule_code': 'calculate_vat_uk_printed_product',
                'name': 'UK Printed Product VAT (Zero-Rated)',
                'region': 'UK',
                'product_type': 'Printed',
                'priority': 85,
                'vat_rate_override': 0.00  # Zero-rated for printed materials
            },
            {
                'rule_code': 'calculate_vat_uk_flash_card',
                'name': 'UK FlashCard Product VAT (Zero-Rated)',
                'region': 'UK',
                'product_type': 'FlashCard',
                'priority': 80,
                'vat_rate_override': 0.00  # Zero-rated for printed materials
            },
            {
                'rule_code': 'calculate_vat_uk_pbor',
                'name': 'UK PBOR Product VAT (Zero-Rated)',
                'region': 'UK',
                'product_type': 'PBOR',
                'priority': 80,
                'vat_rate_override': 0.00  # Zero-rated for printed materials
            },
            {
                'rule_code': 'calculate_vat_uk_marking',
                'name': 'UK Marking Service VAT',
                'region': 'UK',
                'product_type': 'Marking',
                'priority': 85,
                'vat_rate_override': None  # Use regional rate (20% for services)
            },
            # Generic regional product rules (4 rules) - handle all product types
            {
                'rule_code': 'calculate_vat_ie_product',
                'name': 'Ireland Product VAT',
                'region': 'IE',
                'product_type': None,  # All product types
                'priority': 85,
                'vat_rate_override': None  # Use regional rate
            },
            {
                'rule_code': 'calculate_vat_eu_product',
                'name': 'EU Product VAT',
                'region': 'EU',
                'product_type': None,  # All product types
                'priority': 85,
                'vat_rate_override': None  # Use regional rate
            },
            {
                'rule_code': 'calculate_vat_sa_product',
                'name': 'SA Product VAT',
                'region': 'SA',
                'product_type': None,  # All product types
                'priority': 85,
                'vat_rate_override': None  # Use regional rate
            },
            {
                'rule_code': 'calculate_vat_row_product',
                'name': 'ROW Product VAT',
                'region': 'ROW',
                'product_type': None,  # All product types
                'priority': 85,
                'vat_rate_override': None  # Use regional rate
            }
        ]

        for config in product_configs:
            rule_code = config['rule_code']
            rule_name = config['name']
            region = config['region']
            product_type = config['product_type']
            priority = config['priority']
            vat_rate_override = config.get('vat_rate_override')

            # Build condition based on whether product_type is specified
            if product_type:
                # Specific product type (e.g., UK Digital)
                condition = {
                    "and": [
                        {"==": [{"var": "vat.region"}, region]},
                        {"==": [{"var": "cart_item.product_type"}, product_type]}
                    ]
                }
            else:
                # All product types (e.g., IE, EU, SA, ROW)
                condition = {"==": [{"var": "vat.region"}, region]}

            # Actions: Calculate VAT and update context
            # Product rules:
            # 1. (Optional) Override VAT rate if product has different rate
            # 2. Calculate VAT amount
            # 3. Calculate gross amount (net + VAT)
            actions = []

            # Step 0: Override VAT rate if specified (e.g., 0% for UK printed materials)
            if vat_rate_override is not None:
                actions.append({
                    "type": "update",
                    "target": "vat.rate",
                    "operation": "set",
                    "value": vat_rate_override,
                    "description": f"Override VAT rate to {vat_rate_override * 100:.0f}% for {product_type or 'all'} products"
                })

            # Step 1: Calculate VAT amount and store in vat.amount
            actions.append({
                "type": "call_function",
                "function": "calculate_vat_amount",
                "args": [
                    {"var": "cart_item.net_amount"},
                    {"var": "vat.rate"}
                ],
                "store_result_in": "vat.amount"
            })

            # Step 2: Store VAT amount in cart_item.vat_amount
            actions.append({
                "type": "call_function",
                "function": "calculate_vat_amount",
                "args": [
                    {"var": "cart_item.net_amount"},
                    {"var": "vat.rate"}
                ],
                "store_result_in": "cart_item.vat_amount"
            })

            # Step 3: Calculate gross_amount = net_amount + vat_amount
            actions.append({
                "type": "call_function",
                "function": "add_decimals",
                "args": [
                    {"var": "cart_item.net_amount"},
                    {"var": "cart_item.vat_amount"}
                ],
                "store_result_in": "cart_item.gross_amount"
            })

            rule_data = {
                'rule_code': rule_code,
                'name': rule_name,
                'description': f'Product VAT calculation for {region} {product_type or "all products"}',
                'entry_point': 'cart_calculate_vat',
                'priority': priority,
                'active': True,
                'version': 1,
                'rules_fields_code': schema.fields_code if not dry_run else 'cart_vat_context_schema',
                'condition': condition,
                'actions': actions,
                'stop_processing': True,  # Stop after VAT calculated
                'metadata': {
                    'phase': 'phase_3',
                    'created_by': 'setup_vat_composite_rules',
                    'rule_type': 'product',
                    'region': region,
                    'product_type': product_type
                }
            }

            if verbose:
                self.stdout.write(f'  Creating product rule: {rule_code}')

            if dry_run:
                self.stdout.write(self.style.WARNING(f'  [DRY RUN] Would create rule: {rule_code}'))
                class MockRule:
                    def __init__(self, code):
                        self.rule_code = code
                product_rules.append(MockRule(rule_code))
            else:
                # Use update_or_create for idempotency
                rule_obj, created = ActedRule.objects.update_or_create(
                    rule_code=rule_code,
                    defaults=rule_data
                )

                if verbose:
                    action = 'Created' if created else 'Updated'
                    self.stdout.write(f'  {action} product rule: {rule_code} (priority {priority})')

                product_rules.append(rule_obj)

        return product_rules
