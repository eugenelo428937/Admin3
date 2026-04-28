"""Admin serializers for store products.

Provides full related data (catalog product, variation, session) for
admin management views — unlike ProductSerializer which is used for
public-facing and form operations.
"""
from rest_framework import serializers
from store.models import Product


class StoreProductAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with full related data for store products.

    Surfaces catalog product, variation, and exam session info via
    the ProductProductVariation and ExamSessionSubject FK chains.
    """
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )
    variation_type = serializers.CharField(
        source='product_product_variation.product_variation.variation_type',
        read_only=True
    )
    variation_name = serializers.CharField(
        source='product_product_variation.product_variation.name',
        read_only=True
    )
    variation_code = serializers.CharField(
        source='product_product_variation.product_variation.code',
        read_only=True
    )
    product_name = serializers.CharField(
        source='product_product_variation.product.fullname',
        read_only=True
    )
    catalog_product_id = serializers.IntegerField(
        source='product_product_variation.product.id',
        read_only=True
    )
    catalog_product_code = serializers.CharField(
        source='product_product_variation.product.code',
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id', 'product_code', 'is_active',
            'subject_code', 'session_code',
            'variation_type', 'variation_name', 'variation_code',
            'product_name', 'catalog_product_id', 'catalog_product_code',
            'exam_session_subject', 'product_product_variation',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['product_code', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Reject duplicate (ESS, PPV) for non-addon admin writes.

        The DB-level unique_together on (ess, ppv) was relaxed in b4940224
        so addon rows (Purchasable.is_addon=True) can clone a base
        product's PPV. The admin endpoint never creates addons (those are
        produced by store.create_addon_products), so we keep the (ess, ppv)
        invariant for non-addon writes here.
        """
        ess = attrs.get('exam_session_subject') or getattr(
            self.instance, 'exam_session_subject', None
        )
        ppv = attrs.get('product_product_variation') or getattr(
            self.instance, 'product_product_variation', None
        )
        if ess is None or ppv is None:
            return attrs

        qs = Product.objects.filter(
            exam_session_subject=ess,
            product_product_variation=ppv,
            is_addon=False,
        )
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'A non-addon product already exists for this exam session '
                'subject and product variation.'
            )
        return attrs
