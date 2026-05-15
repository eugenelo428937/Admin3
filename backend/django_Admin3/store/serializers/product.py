"""Product serializers for the store app."""
from rest_framework import serializers
from store.models import Product
from store.models.purchasable import Purchasable


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Product model.

    Provides product data with related ESS and PPV information.
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
    product_name = serializers.CharField(
        source='product_product_variation.product.fullname',
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'product_code',
            'is_active',
            'subject_code',
            'session_code',
            'variation_type',
            'product_name',
            'exam_session_subject',
            'product_product_variation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['product_code', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Reject duplicate (ESS, PPV) for non-addon writes.

        The DB-level unique_together on (ess, ppv) was relaxed in b4940224
        so that addon rows (Purchasable.is_addon=True) can clone a base
        product's PPV. Public/admin writes through this serializer are
        always non-addon, so we keep the (ess, ppv) invariant here.
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

    def create(self, validated_data):
        """Phase 5: dispatch to the appropriate MTI subclass on create.

        Product.save() now raises ValueError if kind is not set. This
        create() method determines the correct subclass from the PPV's
        variation_type and delegates to it so kind is set automatically
        by the subclass's own save().

        Material (eBook, Printed, Hub): MaterialProduct
        Tutorial / Online Classroom Recording: TutorialProduct
        Marking: MarkingProduct
        """
        from store.models import MaterialProduct, TutorialProduct, MarkingProduct
        ppv = validated_data.get('product_product_variation')
        if ppv is not None:
            variation_type = ppv.product_variation.variation_type
            if variation_type in {'eBook', 'Printed', 'Hub'}:
                return MaterialProduct.objects.create(**validated_data)
            if variation_type in {'Tutorial', 'Online Classroom Recording'}:
                return TutorialProduct.objects.create(**validated_data)
            if variation_type == 'Marking':
                return MarkingProduct.objects.create(**validated_data)
        # Fallback: set kind=MATERIAL so Product.save() doesn't raise.
        # This path should not be reached in normal operation.
        validated_data.setdefault('kind', Purchasable.Kind.MATERIAL)
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product lists."""
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )

    class Meta:
        model = Product
        fields = ['id', 'product_code', 'subject_code', 'is_active']


# ──────────────────────────────────────────────────────────────────────
# Phase 3.2: subclass-aware serializers
#
# Each subclass serializer extends the base ProductSerializer to inherit
# all common fields (subject_code, session_code, variation_type,
# product_name, plus the FK ids), and adds the subclass-specific fields
# that live on the corresponding MTI child table.
#
# The factory `serializer_for(product)` picks the right serializer class
# for an instance, falling back to ProductSerializer for any Product row
# that has no subclass child (a Phase-2 invariant violation, but the
# contract is "don't raise on weird data").
# ──────────────────────────────────────────────────────────────────────
from store.models import (
    MaterialProduct,
    TutorialProduct,
    MarkingProduct,
)


class _ProductKindMixin(serializers.Serializer):
    """Adds a read-only `kind` field returning the subclass label
    rather than the raw Purchasable.kind (still 'product' pre-Phase-4e).
    """

    _subclass_kind: str = ''  # set by each subclass below
    kind = serializers.SerializerMethodField()

    def get_kind(self, obj):
        return self._subclass_kind


class MaterialProductSerializer(_ProductKindMixin, ProductSerializer):
    """Serializer for store.MaterialProduct.

    Inherits every field from ProductSerializer. `product_product_variation`
    still lives on the Product parent through Phases 1–4, so no new
    local fields are needed; the value of `kind` ('material') is the
    only differentiator until Phase 5 moves PPV to MaterialProduct.
    """
    _subclass_kind = 'material'

    class Meta(ProductSerializer.Meta):
        model = MaterialProduct
        fields = ProductSerializer.Meta.fields + ['kind']


class TutorialProductSerializer(_ProductKindMixin, ProductSerializer):
    """Serializer for store.TutorialProduct.

    Adds the subclass-local fields: `format`, `tutorial_location`,
    `tutorial_course_template`. Nullable FK fields serialize as their
    PK or null.
    """
    _subclass_kind = 'tutorial'

    class Meta(ProductSerializer.Meta):
        model = TutorialProduct
        fields = ProductSerializer.Meta.fields + [
            'kind',
            'format',
            'tutorial_location',
            'tutorial_course_template',
        ]


class MarkingProductSerializer(_ProductKindMixin, ProductSerializer):
    """Serializer for store.MarkingProduct.

    Adds `marking_template` (PK), `marking_template_code` (display),
    and `paper_count` (optional count of papers in the series).
    """
    _subclass_kind = 'marking'

    marking_template_code = serializers.CharField(
        source='marking_template.code',
        read_only=True,
    )

    class Meta(ProductSerializer.Meta):
        model = MarkingProduct
        fields = ProductSerializer.Meta.fields + [
            'kind',
            'marking_template',
            'marking_template_code',
            'paper_count',
        ]


# Reverse-accessor name → (subclass serializer, DoesNotExist).
# The accessor names are what Django MTI auto-generates: lowercase
# model class name with no separator. The DoesNotExist class is needed
# because accessing a missing OneToOne reverse relation raises the
# *child model's* DoesNotExist, not a generic ObjectDoesNotExist.
_SUBCLASS_DISPATCH = (
    ('materialproduct', MaterialProductSerializer, MaterialProduct.DoesNotExist),
    ('tutorialproduct', TutorialProductSerializer, TutorialProduct.DoesNotExist),
    ('markingproduct',  MarkingProductSerializer,  MarkingProduct.DoesNotExist),
)


def serializer_for(product):
    """Return the serializer class for a store.Product instance.

    Dispatches by MTI subclass:
      - store.MaterialProduct → MaterialProductSerializer
      - store.TutorialProduct → TutorialProductSerializer
      - store.MarkingProduct  → MarkingProductSerializer
      - bare store.Product    → ProductSerializer (fallback)

    After Phase 2's backfill every Product row has exactly one subclass
    child, so the fallback should be unreachable in normal data — it
    exists only as the no-raise contract.
    """
    # Short-circuit if caller already passed a downcast subclass instance.
    for _attr, cls, _exc in _SUBCLASS_DISPATCH:
        if isinstance(product, cls.Meta.model):
            return cls

    # Caller passed a base Product — probe each subclass.
    for attr, cls, exc in _SUBCLASS_DISPATCH:
        try:
            getattr(product, attr)
        except exc:
            continue
        return cls
    return ProductSerializer
