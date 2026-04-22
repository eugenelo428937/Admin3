"""marking_vouchers views.

The legacy MarkingVoucher-backed REST endpoints were removed in Task 24
(Release B) when the MarkingVoucher model/table was dropped. All voucher
catalog data now lives in ``store.GenericItem`` (kind='marking_voucher')
and is served by the store API. Voucher issuance tracking lives in
``marking_vouchers.IssuedVoucher`` but is not directly exposed via REST
(it is created by order confirmation and administered via Django admin).
"""
