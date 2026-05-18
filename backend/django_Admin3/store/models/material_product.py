"""MaterialProduct — MTI subclass of store.Product for material items.

Materials (eBook, Printed, Hub) are the only product family that uses
the `catalog_products` template + variation structure. Tutorial and
Marking products have their own subclasses that bypass the catalog.

**Phase 5 Task 4 (final state):**
``product_product_variation`` lives here, on the subclass that actually
uses it. The parent ``Product`` exposes a backward-compat ``@property``
of the same name that delegates to this field for Material rows and
returns ``None`` for Tutorial/Marking. Material code generation also
lives here now, since it depends on the PPV value.

Migration 0024 finalises the move:
  * drops the transitional trigger ``material_products_sync_ppv_from_parent``
    (installed in migration 0023 to copy PPV from parent to subclass on
    every ORM insert);
  * removes the ``product_product_variation_id`` column from the parent
    ``products`` table;
  * registers the existing ``material_products.product_product_variation_id``
    DB column with Django's model state (state-only ``AddField``).

Table: acted.material_products
"""
from django.db import models

from store.models.product import Product


class MaterialProduct(Product):
    """ESS-based material product (eBook/Printed/Hub).

    The ``product_product_variation`` FK lives exclusively on this
    subclass after Phase 5 Task 4. Materials are the only store product
    family that links into ``catalog_products`` (template + variation);
    Tutorial and Marking subclasses bypass the catalog entirely.
    """

    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='material_products',
        help_text='The product variation (template + variation combination) '
                  'this material maps to in the catalog.'
    )

    class Meta:
        db_table = '"acted"."material_products"'
        verbose_name = 'Material Product'
        verbose_name_plural = 'Material Products'

    def save(self, *args, **kwargs):
        """Phase 5: MaterialProduct sets kind='material' and generates
        its product_code from the (now-local) ``product_product_variation``.

        Code format: {subject}/{variation_code}{cat_product_code}/{exam_session}
        """
        if not self.kind:
            self.kind = self.Kind.MATERIAL  # 'material'
        if not self.product_code:
            ppv_id = getattr(self, 'product_product_variation_id', None)
            if ppv_id:
                self.product_code = self._generate_material_code()
                self.code = self.product_code
        super().save(*args, **kwargs)

    def _generate_material_code(self):
        """Material product code: ``{subject}/{variation_code}{product_code}/{exam_session}``.

        Reads from the local ``product_product_variation`` FK (added in
        migration 0024) and the inherited ``exam_session_subject`` on the
        parent ``Product``.
        """
        ess = self.exam_session_subject
        ppv = self.product_product_variation
        subject_code = ess.subject.code
        exam_code = ess.exam_session.session_code
        cat_product_code = ppv.product.code
        variation_code = ppv.product_variation.code or ''
        return f"{subject_code}/{variation_code}{cat_product_code}/{exam_code}"
