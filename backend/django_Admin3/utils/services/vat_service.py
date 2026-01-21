"""
VAT Calculation Service

Provides VAT calculation functionality using database-driven rates
from UtilsCountrys model.
"""
import logging
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)


class VATCalculationService:
    """
    Service class for VAT calculations.

    Uses lookup functions from rules_engine.custom_functions to retrieve
    VAT rates from the database (UtilsCountrys model).
    """

    def calculate_vat(self, country_code, net_amount):
        """
        Calculate VAT for a single net amount.

        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE')
            net_amount: Net amount before VAT (Decimal)

        Returns:
            dict: VAT calculation results with keys:
                - country_code: The country code used
                - vat_rate: The VAT rate applied (decimal, e.g., 0.20)
                - net_amount: The original net amount
                - vat_amount: The calculated VAT amount
                - gross_amount: Net + VAT total
        """
        from rules_engine.custom_functions import lookup_vat_rate, calculate_vat_amount

        net = Decimal(str(net_amount))
        vat_rate = lookup_vat_rate(country_code)
        vat_amount = calculate_vat_amount(net, vat_rate)
        gross_amount = net + vat_amount

        return {
            'country_code': country_code,
            'vat_rate': vat_rate,
            'net_amount': net,
            'vat_amount': vat_amount,
            'gross_amount': gross_amount,
        }

    def calculate_vat_for_cart(self, country_code, cart_items):
        """
        Calculate VAT for a list of cart items.

        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE')
            cart_items: List of dicts with 'net_price' and 'quantity' keys

        Returns:
            dict: VAT calculation results with keys:
                - country_code: The country code used
                - vat_rate: The VAT rate applied (decimal)
                - total_net_amount: Sum of all item net amounts
                - total_vat_amount: Total VAT for all items
                - total_gross_amount: Total including VAT
                - items: List of per-item calculations
        """
        from rules_engine.custom_functions import lookup_vat_rate, calculate_vat_amount

        vat_rate = lookup_vat_rate(country_code)

        total_net = Decimal('0.00')
        total_vat = Decimal('0.00')
        items = []

        for item in cart_items:
            net_price = Decimal(str(item.get('net_price', 0)))
            quantity = int(item.get('quantity', 1))
            item_net = net_price * quantity
            item_vat = calculate_vat_amount(item_net, vat_rate)

            total_net += item_net
            total_vat += item_vat

            items.append({
                'net_price': net_price,
                'quantity': quantity,
                'item_net': item_net,
                'item_vat': item_vat,
                'item_gross': item_net + item_vat,
            })

        return {
            'country_code': country_code,
            'vat_rate': vat_rate,
            'total_net_amount': total_net,
            'total_vat_amount': total_vat,
            'total_gross_amount': total_net + total_vat,
            'items': items,
        }
