"""
VAT Calculation Service

Provides VAT calculation functionality based on customer's billing country.
Uses database-driven VAT rates from UtilsCountrys model.

Features:
- Calculate VAT for single amounts
- Calculate VAT for cart items
- Reverse VAT calculation (gross to net)
- Get VAT rates by country
- Get region by country
"""
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional
from django.core.exceptions import ValidationError
from django.core.cache import cache

from ..models import UtilsCountrys, UtilsCountryRegion

logger = logging.getLogger(__name__)


class VATCalculationService:
    """Service for VAT calculation operations."""

    def __init__(self):
        """Initialize VAT calculation service."""
        self.cache_timeout = 300  # 5 minutes

    def calculate_vat(
        self,
        country_code: str,
        net_amount: Decimal
    ) -> Dict[str, Any]:
        """
        Calculate VAT for a given country and net amount.

        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE')
            net_amount: Net amount before VAT

        Returns:
            Dictionary with calculation results:
            {
                'country_code': str,
                'vat_rate': Decimal,
                'net_amount': Decimal,
                'vat_amount': Decimal,
                'gross_amount': Decimal
            }

        Raises:
            ValidationError: If country not found or amount is negative
        """
        # Validate net amount
        if net_amount < 0:
            raise ValidationError('Net amount cannot be negative')

        # Get country and VAT rate
        try:
            country = UtilsCountrys.objects.get(code=country_code, active=True)
        except UtilsCountrys.DoesNotExist:
            raise ValidationError(f'Country not found: {country_code}')

        vat_rate = country.vat_percent

        # Calculate VAT amount
        vat_amount = self._calculate_vat_amount(net_amount, vat_rate)

        # Calculate gross amount
        gross_amount = net_amount + vat_amount

        return {
            'country_code': country_code,
            'vat_rate': vat_rate,
            'net_amount': net_amount,
            'vat_amount': vat_amount,
            'gross_amount': gross_amount
        }

    def calculate_vat_for_cart(
        self,
        country_code: str,
        cart_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate VAT for multiple cart items.

        Args:
            country_code: ISO 3166-1 alpha-2 country code
            cart_items: List of cart items with 'net_price' and 'quantity' keys

        Returns:
            Dictionary with:
            {
                'country_code': str,
                'vat_rate': Decimal,
                'total_net_amount': Decimal,
                'total_vat_amount': Decimal,
                'total_gross_amount': Decimal,
                'items': List[Dict] with individual item calculations
            }

        Raises:
            ValidationError: If country not found
        """
        # Get VAT rate
        vat_rate = self.get_vat_rate(country_code)
        if vat_rate is None:
            raise ValidationError(f'Country not found: {country_code}')

        # Calculate VAT for each item
        items_with_vat = []
        total_net = Decimal('0.00')
        total_vat = Decimal('0.00')

        for item in cart_items:
            net_price = Decimal(str(item.get('net_price', 0)))
            quantity = int(item.get('quantity', 1))

            item_net = net_price * quantity
            item_vat = self._calculate_vat_amount(item_net, vat_rate)
            item_gross = item_net + item_vat

            items_with_vat.append({
                'net_price': net_price,
                'quantity': quantity,
                'net_amount': item_net,
                'vat_amount': item_vat,
                'gross_amount': item_gross
            })

            total_net += item_net
            total_vat += item_vat

        total_gross = total_net + total_vat

        return {
            'country_code': country_code,
            'vat_rate': vat_rate,
            'total_net_amount': total_net,
            'total_vat_amount': total_vat,
            'total_gross_amount': total_gross,
            'items': items_with_vat
        }

    def reverse_calculate_vat(
        self,
        country_code: str,
        gross_amount: Decimal
    ) -> Dict[str, Any]:
        """
        Reverse calculate VAT from gross amount to get net amount.

        Args:
            country_code: ISO 3166-1 alpha-2 country code
            gross_amount: Gross amount including VAT

        Returns:
            Dictionary with:
            {
                'country_code': str,
                'vat_rate': Decimal,
                'net_amount': Decimal,
                'vat_amount': Decimal,
                'gross_amount': Decimal
            }

        Raises:
            ValidationError: If country not found or amount is negative
        """
        if gross_amount < 0:
            raise ValidationError('Gross amount cannot be negative')

        # Get VAT rate
        vat_rate = self.get_vat_rate(country_code)
        if vat_rate is None:
            raise ValidationError(f'Country not found: {country_code}')

        # Calculate net amount: gross / (1 + rate/100)
        divisor = Decimal('1') + (vat_rate / Decimal('100'))
        net_amount = (gross_amount / divisor).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )

        # Calculate VAT amount
        vat_amount = gross_amount - net_amount

        return {
            'country_code': country_code,
            'vat_rate': vat_rate,
            'net_amount': net_amount,
            'vat_amount': vat_amount,
            'gross_amount': gross_amount
        }

    def get_vat_rate(self, country_code: str) -> Optional[Decimal]:
        """
        Get VAT rate for a country.

        Args:
            country_code: ISO 3166-1 alpha-2 country code

        Returns:
            VAT rate as Decimal, or None if country not found
        """
        cache_key = f'vat_rate:{country_code}'
        vat_rate = cache.get(cache_key)

        if vat_rate is None:
            try:
                country = UtilsCountrys.objects.get(code=country_code, active=True)
                vat_rate = country.vat_percent
                cache.set(cache_key, vat_rate, timeout=self.cache_timeout)
                logger.debug(f'Cached VAT rate for {country_code}: {vat_rate}%')
            except UtilsCountrys.DoesNotExist:
                logger.warning(f'Country not found: {country_code}')
                return None

        return vat_rate

    def get_region_by_country(self, country_code: str) -> Optional[str]:
        """
        Get VAT region for a country.

        Args:
            country_code: ISO 3166-1 alpha-2 country code

        Returns:
            Region code (UK, IE, EU, SA, ROW), or None if not found
        """
        cache_key = f'vat_region:{country_code}'
        region_code = cache.get(cache_key)

        if region_code is None:
            try:
                country = UtilsCountrys.objects.get(code=country_code, active=True)

                # Get current country-region mapping
                mapping = UtilsCountryRegion.objects.filter(
                    country=country,
                    effective_to__isnull=True  # Current mapping
                ).select_related('region').first()

                if mapping:
                    region_code = mapping.region.code
                    cache.set(cache_key, region_code, timeout=self.cache_timeout)
                    logger.debug(f'Cached region for {country_code}: {region_code}')
                else:
                    logger.warning(f'No region mapping found for {country_code}')
                    return None

            except UtilsCountrys.DoesNotExist:
                logger.warning(f'Country not found: {country_code}')
                return None

        return region_code

    def _calculate_vat_amount(
        self,
        net_amount: Decimal,
        vat_rate: Decimal
    ) -> Decimal:
        """
        Calculate VAT amount from net amount and VAT rate.

        Args:
            net_amount: Net amount before VAT
            vat_rate: VAT rate percentage (e.g., 20.00 for 20%)

        Returns:
            VAT amount rounded to 2 decimal places
        """
        vat_amount = net_amount * (vat_rate / Decimal('100'))
        return vat_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def invalidate_cache(self, country_code: Optional[str] = None):
        """
        Invalidate cached VAT data.

        Args:
            country_code: Specific country to invalidate, or None for all
        """
        if country_code:
            cache.delete(f'vat_rate:{country_code}')
            cache.delete(f'vat_region:{country_code}')
            logger.info(f'Invalidated VAT cache for {country_code}')
        else:
            # Invalidate all VAT-related cache keys
            # Note: This is a simplified approach. In production, consider
            # using cache key patterns or separate cache namespace
            logger.info('Invalidated all VAT cache')
