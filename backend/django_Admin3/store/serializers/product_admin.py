"""Admin serializers for store products.

Provides full related data (catalog product, variation, session) for
admin management views — unlike ProductSerializer which is used for
public-facing and form operations.
"""
from rest_framework import serializers
from store.models import Product
from store.serializers.product import _LazyPPVRelatedField


class StoreProductAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with full related data for store products.

    Surfaces catalog product, variation, and exam session info via
    the ProductProductVariation and ExamSessionSubject FK chains.

    Phase 5 Task 4b: ``product_product_variation`` lives on MaterialProduct
    now. The legacy ``@property`` on Product delegates reads to
    ``materialproduct.product_product_variation``, and the matching
    setter routes writes through to a MaterialProduct row at save().
    PPV-derived display fields are computed via SerializerMethodField so
    they tolerate non-material (tutorial/marking) rows that lack a PPV.
    """
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )
    variation_type = serializers.SerializerMethodField()
    variation_name = serializers.SerializerMethodField()
    variation_code = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    catalog_product_id = serializers.SerializerMethodField()
    catalog_product_code = serializers.SerializerMethodField()
    product_product_variation = _LazyPPVRelatedField(
        allow_null=True,
        required=False,
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

    def _ppv(self, obj):
        return obj.product_product_variation

    def get_variation_type(self, obj):
        ppv = self._ppv(obj)
        return ppv.product_variation.variation_type if ppv else None

    def get_variation_name(self, obj):
        ppv = self._ppv(obj)
        return ppv.product_variation.name if ppv else None

    def get_variation_code(self, obj):
        ppv = self._ppv(obj)
        return ppv.product_variation.code if ppv else None

    def get_product_name(self, obj):
        ppv = self._ppv(obj)
        return ppv.product.fullname if ppv else None

    def get_catalog_product_id(self, obj):
        ppv = self._ppv(obj)
        return ppv.product.id if ppv else None

    def get_catalog_product_code(self, obj):
        ppv = self._ppv(obj)
        return ppv.product.code if ppv else None

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

        # Phase 5 Task 4b: PPV is on MaterialProduct now.
        qs = Product.objects.filter(
            exam_session_subject=ess,
            materialproduct__product_product_variation=ppv,
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
