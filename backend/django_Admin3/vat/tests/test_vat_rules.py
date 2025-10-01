"""
VAT Rule Tests - Epic 3 Phase 6
Test Matrix Stage 2: Rule Tests for per-item VAT calculation

Tests individual VAT rules execution through the rules engine:
- vat_standard_default
- uk_ebook_zero_vat
- row_digital_zero_vat
- sa_special_vat
- live_tutorial_vat_override

Test IDs: RT01-RT10+
"""

import pytest
from decimal import Decimal
from django.test import TestCase
from rules_engine.services.rule_engine import RuleEngine
from rules_engine.models import ActedRule, ActedRulesFields


@pytest.mark.django_db
class TestStandardVATRule:
    """Test vat_standard_default rule (priority 10)."""

    def test_rt01_uk_physical_book_20_percent(self, uk_user, physical_book_product):
        """RT01: UK physical book applies 20% VAT via standard rule."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': physical_book_product.id,
                    'product_code': 'MAT-PRINT-CS2',
                    'net_amount': Decimal('100.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': False,
                        'is_digital': False,
                        'is_material': True,
                        'is_live_tutorial': False,
                        'is_marking': False,
                        'product_type': 'material'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.20')
        assert item_result['vat_amount'] == Decimal('20.00')
        assert item_result['rule_applied'] == 'vat_standard_default:v1'

    def test_uk_marking_product_20_percent(self, uk_user, marking_product):
        """UK marking product applies 20% VAT via standard rule."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': marking_product.id,
                    'product_code': 'MARK-CS2',
                    'net_amount': Decimal('50.00'),
                    'quantity': 1,
                    'classification': {
                        'is_marking': True,
                        'product_type': 'marking'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.20')
        assert item_result['vat_amount'] == Decimal('10.00')
        assert item_result['rule_applied'] == 'vat_standard_default:v1'

    def test_ie_material_23_percent(self, ie_user, physical_book_product):
        """IE material applies 23% VAT via standard rule."""
        context = {
            'user_address': {
                'country': 'IE',
                'region': 'IE',
                'postcode': 'D01'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': physical_book_product.id,
                    'product_code': 'MAT-PRINT-CS2',
                    'net_amount': Decimal('100.00'),
                    'quantity': 1,
                    'classification': {
                        'is_material': True,
                        'product_type': 'material'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.23')
        assert item_result['vat_amount'] == Decimal('23.00')
        assert item_result['rule_applied'] == 'vat_standard_default:v1'


@pytest.mark.django_db
class TestUKEbookZeroVAT:
    """Test uk_ebook_zero_vat rule (priority 20)."""

    def test_rt02_uk_ebook_zero_vat(self, uk_user, ebook_product):
        """RT02: UK ebook applies 0% VAT via ebook rule."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': ebook_product.id,
                    'product_code': 'MAT-EBOOK-CS2',
                    'net_amount': Decimal('50.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': True,
                        'is_digital': True,
                        'is_material': False,
                        'product_type': 'ebook'
                    }
                }]
            },
            'settings': {
                'effective_date': '2025-09-30'
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.00')
        assert item_result['vat_amount'] == Decimal('0.00')
        assert item_result['rule_applied'] == 'uk_ebook_zero_vat:v1'

    def test_uk_ebook_pre_2020_not_applicable(self, uk_user, ebook_product):
        """UK ebook before 2020 does not apply ebook rule."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': ebook_product.id,
                    'product_code': 'MAT-EBOOK-CS2',
                    'net_amount': Decimal('50.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': True,
                        'product_type': 'ebook'
                    }
                }]
            },
            'settings': {
                'effective_date': '2019-12-31'
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        # Should fall through to standard rule (20%)
        assert item_result['vat_rate'] == Decimal('0.20')
        assert item_result['rule_applied'] == 'vat_standard_default:v1'

    def test_non_uk_ebook_not_applicable(self, eu_user, ebook_product):
        """Non-UK ebook does not apply UK ebook rule."""
        context = {
            'user_address': {
                'country': 'DE',
                'region': 'EU',
                'postcode': '10115'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': ebook_product.id,
                    'product_code': 'MAT-EBOOK-CS2',
                    'net_amount': Decimal('50.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': True,
                        'product_type': 'ebook'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        # Should fall through to ROW digital rule or standard
        assert item_result['rule_applied'] != 'uk_ebook_zero_vat:v1'


@pytest.mark.django_db
class TestROWDigitalZeroVAT:
    """Test row_digital_zero_vat rule (priority 15)."""

    def test_rt03_row_digital_zero_vat(self, row_user, digital_product):
        """RT03: ROW digital product applies 0% VAT via ROW digital rule."""
        context = {
            'user_address': {
                'country': 'AU',
                'region': 'ROW',
                'postcode': '2000'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': digital_product.id,
                    'product_code': 'MAT-DIGITAL-CS2',
                    'net_amount': Decimal('80.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': False,
                        'is_digital': True,
                        'is_material': False,
                        'product_type': 'digital'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.00')
        assert item_result['vat_amount'] == Decimal('0.00')
        assert item_result['rule_applied'] == 'row_digital_zero_vat:v1'

    def test_row_material_zero_vat(self, row_user, physical_book_product):
        """ROW material (non-digital) applies 0% VAT."""
        context = {
            'user_address': {
                'country': 'AU',
                'region': 'ROW',
                'postcode': '2000'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': physical_book_product.id,
                    'product_code': 'MAT-PRINT-CS2',
                    'net_amount': Decimal('100.00'),
                    'quantity': 1,
                    'classification': {
                        'is_digital': False,
                        'is_material': True,
                        'product_type': 'material'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.00')
        assert item_result['vat_amount'] == Decimal('0.00')

    def test_eu_digital_zero_vat(self, eu_user, digital_product):
        """EU digital product applies 0% VAT (ROW treatment)."""
        context = {
            'user_address': {
                'country': 'DE',
                'region': 'EU',
                'postcode': '10115'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': digital_product.id,
                    'product_code': 'MAT-DIGITAL-CS2',
                    'net_amount': Decimal('80.00'),
                    'quantity': 1,
                    'classification': {
                        'is_digital': True,
                        'product_type': 'digital'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.00')

    def test_ch_material_zero_vat(self, physical_book_product):
        """Switzerland material applies 0% VAT (treated as ROW)."""
        context = {
            'user_address': {
                'country': 'CH',
                'region': 'CH',
                'postcode': '8000'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': physical_book_product.id,
                    'product_code': 'MAT-PRINT-CS2',
                    'net_amount': Decimal('100.00'),
                    'quantity': 1,
                    'classification': {
                        'is_material': True,
                        'product_type': 'material'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.00')


@pytest.mark.django_db
class TestSASpecialVAT:
    """Test sa_special_vat rule (priority 18)."""

    def test_rt04_sa_tutorial_15_percent(self, sa_user, tutorial_product):
        """RT04: SA tutorial applies 15% VAT via SA special rule."""
        context = {
            'user_address': {
                'country': 'ZA',
                'region': 'SA',
                'postcode': '0001'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': tutorial_product.id,
                    'product_code': 'TUT-LIVE-CS2',
                    'net_amount': Decimal('200.00'),
                    'quantity': 1,
                    'classification': {
                        'is_live_tutorial': True,
                        'product_type': 'live_tutorial'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.15')
        assert item_result['vat_amount'] == Decimal('30.00')
        assert item_result['rule_applied'] == 'sa_special_vat:v1'

    def test_sa_material_15_percent(self, sa_user, physical_book_product):
        """SA material applies 15% VAT via SA special rule."""
        context = {
            'user_address': {
                'country': 'ZA',
                'region': 'SA',
                'postcode': '0001'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': physical_book_product.id,
                    'product_code': 'MAT-PRINT-CS2',
                    'net_amount': Decimal('100.00'),
                    'quantity': 1,
                    'classification': {
                        'is_material': True,
                        'product_type': 'material'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.15')
        assert item_result['vat_amount'] == Decimal('15.00')
        assert item_result['rule_applied'] == 'sa_special_vat:v1'

    def test_sa_digital_15_percent(self, sa_user, digital_product):
        """SA digital product applies 15% VAT via SA special rule."""
        context = {
            'user_address': {
                'country': 'ZA',
                'region': 'SA',
                'postcode': '0001'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': digital_product.id,
                    'product_code': 'MAT-DIGITAL-CS2',
                    'net_amount': Decimal('80.00'),
                    'quantity': 1,
                    'classification': {
                        'is_digital': True,
                        'product_type': 'digital'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.15')
        assert item_result['vat_amount'] == Decimal('12.00')
        assert item_result['rule_applied'] == 'sa_special_vat:v1'


@pytest.mark.django_db
class TestLiveTutorialVATOverride:
    """Test live_tutorial_vat_override rule (priority 25)."""

    def test_rt05_uk_tutorial_region_rate(self, uk_user, tutorial_product):
        """RT05: UK live tutorial applies region rate (20%)."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': tutorial_product.id,
                    'product_code': 'TUT-LIVE-CS2',
                    'net_amount': Decimal('200.00'),
                    'quantity': 1,
                    'classification': {
                        'is_live_tutorial': True,
                        'product_type': 'live_tutorial'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.20')
        assert item_result['vat_amount'] == Decimal('40.00')
        assert item_result['rule_applied'] == 'live_tutorial_vat_override:v1'

    def test_ie_tutorial_region_rate(self, ie_user, tutorial_product):
        """IE live tutorial applies region rate (23%)."""
        context = {
            'user_address': {
                'country': 'IE',
                'region': 'IE',
                'postcode': 'D01'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': tutorial_product.id,
                    'product_code': 'TUT-LIVE-CS2',
                    'net_amount': Decimal('200.00'),
                    'quantity': 1,
                    'classification': {
                        'is_live_tutorial': True,
                        'product_type': 'live_tutorial'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.23')
        assert item_result['vat_amount'] == Decimal('46.00')
        assert item_result['rule_applied'] == 'live_tutorial_vat_override:v1'

    def test_row_tutorial_zero_vat(self, row_user, tutorial_product):
        """ROW live tutorial applies 0% VAT (ROW rate)."""
        context = {
            'user_address': {
                'country': 'AU',
                'region': 'ROW',
                'postcode': '2000'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': tutorial_product.id,
                    'product_code': 'TUT-LIVE-CS2',
                    'net_amount': Decimal('200.00'),
                    'quantity': 1,
                    'classification': {
                        'is_live_tutorial': True,
                        'product_type': 'live_tutorial'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        assert item_result['vat_rate'] == Decimal('0.00')
        assert item_result['vat_amount'] == Decimal('0.00')
        assert item_result['rule_applied'] == 'live_tutorial_vat_override:v1'


@pytest.mark.django_db
class TestRulePriorityAndChaining:
    """Test rule priority and chaining behavior."""

    def test_higher_priority_rule_stops_processing(self, uk_user, ebook_product):
        """Higher priority rule with stop_processing prevents lower rules."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': ebook_product.id,
                    'product_code': 'MAT-EBOOK-CS2',
                    'net_amount': Decimal('50.00'),
                    'quantity': 1,
                    'classification': {
                        'is_ebook': True,
                        'product_type': 'ebook'
                    }
                }]
            },
            'settings': {
                'effective_date': '2025-09-30'
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        # Should only apply uk_ebook_zero_vat, not standard rule
        assert item_result['rule_applied'] == 'uk_ebook_zero_vat:v1'

    def test_multiple_items_independent_evaluation(self, uk_user, ebook_product, physical_book_product):
        """Each cart item evaluated independently with correct rules."""
        context = {
            'user_address': {
                'country': 'GB',
                'region': 'UK',
                'postcode': 'SW1A 1AA'
            },
            'cart': {
                'items': [
                    {
                        'item_id': 1,
                        'product_id': ebook_product.id,
                        'product_code': 'MAT-EBOOK-CS2',
                        'net_amount': Decimal('50.00'),
                        'quantity': 1,
                        'classification': {
                            'is_ebook': True,
                            'product_type': 'ebook'
                        }
                    },
                    {
                        'item_id': 2,
                        'product_id': physical_book_product.id,
                        'product_code': 'MAT-PRINT-CS2',
                        'net_amount': Decimal('100.00'),
                        'quantity': 1,
                        'classification': {
                            'is_material': True,
                            'product_type': 'material'
                        }
                    }
                ]
            },
            'settings': {
                'effective_date': '2025-09-30'
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        assert len(result['effects']) == 2

        # Item 1: ebook with 0% VAT
        item1_result = result['effects'][0]['vat_result']
        assert item1_result['vat_rate'] == Decimal('0.00')
        assert item1_result['rule_applied'] == 'uk_ebook_zero_vat:v1'

        # Item 2: material with 20% VAT
        item2_result = result['effects'][1]['vat_result']
        assert item2_result['vat_rate'] == Decimal('0.20')
        assert item2_result['rule_applied'] == 'vat_standard_default:v1'

    def test_sa_rule_higher_priority_than_row(self, sa_user, digital_product):
        """SA rule (priority 18) takes precedence over ROW digital rule (priority 15)."""
        context = {
            'user_address': {
                'country': 'ZA',
                'region': 'SA',
                'postcode': '0001'
            },
            'cart': {
                'items': [{
                    'item_id': 1,
                    'product_id': digital_product.id,
                    'product_code': 'MAT-DIGITAL-CS2',
                    'net_amount': Decimal('80.00'),
                    'quantity': 1,
                    'classification': {
                        'is_digital': True,
                        'product_type': 'digital'
                    }
                }]
            }
        }

        engine = RuleEngine()
        result = engine.execute('calculate_vat_per_item', context)

        assert result['ok'] is True
        item_result = result['effects'][0]['vat_result']
        # Should apply SA 15% not ROW 0%
        assert item_result['vat_rate'] == Decimal('0.15')
        assert item_result['rule_applied'] == 'sa_special_vat:v1'
