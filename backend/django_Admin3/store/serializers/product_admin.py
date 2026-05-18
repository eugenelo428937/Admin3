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

    Phase 6: ``product_product_variation`` lives exclusively on
    MaterialProduct. The parent-level @property + setter on
    ``store.Product`` are gone; reads go through ``get_material_ppv()``
    and the writable PPV input is consumed by ``create()`` / dropped on
    ``update()`` via the base ``ProductSerializer`` overrides.
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
        return obj.get_material_ppv()

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
        ppv = attrs.get('product_product_variation')
        if ppv is None and self.instance is not None:
            ppv = self.instance.get_material_ppv()
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

    def create(self, validated_data):
        """Phase 6: route PPV writes through the correct MTI subclass.

        Mirrors ``ProductSerializer.create()``: a non-null PPV dispatches
        to MaterialProduct (the only subclass that carries a PPV column);
        tutorial/marking writes drop the PPV before delegating.
        """
        from store.models import MaterialProduct, TutorialProduct, MarkingProduct
        from store.models.purchasable import Purchasable
        ppv = validated_data.get('product_product_variation')
        if ppv is not None:
            variation_type = ppv.product_variation.variation_type
            if variation_type in {'eBook', 'Printed', 'Hub'}:
                return MaterialProduct.objects.create(**validated_data)
            validated_data.pop('product_product_variation', None)
            if variation_type in {'Tutorial', 'Online Classroom Recording'}:
                return TutorialProduct.objects.create(**validated_data)
            if variation_type == 'Marking':
                return MarkingProduct.objects.create(**validated_data)
        validated_data.pop('product_product_variation', None)
        validated_data.setdefault('kind', Purchasable.Kind.MATERIAL)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Phase 6: drop PPV input on update — see ProductSerializer.update."""
        validated_data.pop('product_product_variation', None)
        return super().update(instance, validated_data)
