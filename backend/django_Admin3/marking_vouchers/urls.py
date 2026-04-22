"""marking_vouchers URL patterns.

All legacy voucher endpoints (list, detail, add-to-cart) were removed in
Task 24 (Release B). Voucher catalog data is now served by the store API
(``/api/store/``). This module is kept empty so the legacy include in
``django_Admin3/urls.py`` can be removed in a follow-up pass without
breaking deployments mid-migration.
"""
urlpatterns = []
