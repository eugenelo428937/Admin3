"""Pre-load lookup dicts for the marks26 import.

Eager-loads every Student, Marker, Staff, Product, MarkingPaper,
IssuedVoucher, and OrderItem we will reference. This avoids per-row
queries during the (~19,800 row) import pass.
"""
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

from marking.models import Marker, MarkingPaper
from marking_vouchers.models import IssuedVoucher
from orders.models.order_item import OrderItem
from staff.models import Staff
from store.models import Product as StoreProduct, Purchasable
from students.models import Student


@dataclass
class Marks26Lookups:
    students: Dict[int, Student] = field(default_factory=dict)
    markers: Dict[str, Marker] = field(default_factory=dict)
    staff: Dict[str, Staff] = field(default_factory=dict)
    products: Dict[str, StoreProduct] = field(default_factory=dict)
    papers: Dict[Tuple[str, str, int], MarkingPaper] = field(default_factory=dict)
    issued_vouchers: Dict[str, IssuedVoucher] = field(default_factory=dict)
    order_items: Dict[Tuple[str, str], OrderItem] = field(default_factory=dict)
    mv_purchasable: Optional[Purchasable] = None


def build_lookups() -> Marks26Lookups:
    lookups = Marks26Lookups()

    lookups.students = {
        s.student_ref: s for s in Student.objects.all().select_related('user')
    }
    lookups.markers = {
        m.initial: m for m in Marker.objects.all() if m.initial
    }
    lookups.staff = {
        s.initials: s for s in Staff.objects.all() if s.initials
    }
    lookups.products = {
        p.product_code: p
        for p in StoreProduct.objects.all().select_related(
            'exam_session_subject__subject'
        )
        if p.product_code
    }
    lookups.papers = {
        (
            p.purchasable.product.exam_session_subject.subject.code,
            p.name,
            p.sequences,
        ): p
        for p in MarkingPaper.objects.filter(is_active=True).select_related(
            'purchasable__product__exam_session_subject__subject'
        )
        if hasattr(p.purchasable, 'product') and p.sequences is not None
    }
    lookups.issued_vouchers = {
        iv.voucher_code: iv for iv in IssuedVoucher.objects.all()
    }
    lookups.order_items = {
        (str(oi.metadata.get('orderno', '')), oi.purchasable.code): oi
        for oi in OrderItem.objects.all().select_related('order', 'purchasable')
        if oi.metadata and oi.metadata.get('orderno')
    }
    lookups.mv_purchasable = Purchasable.objects.filter(code='MV').first()

    return lookups
