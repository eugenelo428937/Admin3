from datetime import datetime
from zoneinfo import ZoneInfo
from django.test import TestCase

from marking.services.csv_imports.date_parsing import parse_date


class ParseDateTests(TestCase):
    def test_parse_valid_date(self):
        result = parse_date('10/04/2026')
        self.assertEqual(result, datetime(2026, 4, 10, tzinfo=ZoneInfo('Europe/London')))

    def test_parse_empty_returns_none(self):
        for empty in ['', ' ', '/  /', '   ']:
            self.assertIsNone(parse_date(empty), f'expected None for {empty!r}')

    def test_parse_none_input(self):
        self.assertIsNone(parse_date(None))

    def test_parse_invalid_format_raises(self):
        with self.assertRaises(ValueError):
            parse_date('2026-04-10')

    def test_dst_summer(self):
        result = parse_date('15/07/2026')
        self.assertEqual(result.tzinfo, ZoneInfo('Europe/London'))
        self.assertEqual(result.hour, 0)
