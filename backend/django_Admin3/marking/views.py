"""
Marking views.

Updated 2026-01-27: Changed to use store.Product instead of ESSP
as part of schema migration.

Updated 2026-04-29 (Phase A5): Renamed `store_product_id` /
`store_product_ids` API parameters to `purchasable_id` /
`purchasable_ids`. The MarkingPaper FK now targets
``store.Purchasable`` (the MTI parent of ``store.Product``); existing
purchasable IDs continue to resolve via the shared PK.

The API still accepts essp_id / essp_ids for backward compatibility and
maps them to the linked store product via Purchasable lookup.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from marking.models import MarkingPaper
from marking.serializers import MarkingPaperSerializer
from store.models import Purchasable
from store.models import Product as StoreProduct


class MarkingPaperViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MarkingPaper.objects.all()
    serializer_class = MarkingPaperSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def deadlines(self, request):
        """
        Get marking deadlines for a purchasable.

        Accepts either:
        - purchasable_id: Direct purchasable ID (preferred)
        - essp_id: Legacy ESSP ID (backward compatible - maps to a store product
          which is itself a Purchasable via MTI)
        """
        purchasable_id = request.query_params.get('purchasable_id')
        essp_id = request.query_params.get('essp_id')

        if purchasable_id:
            # Direct purchasable lookup
            try:
                purchasable = Purchasable.objects.get(id=purchasable_id)
            except Purchasable.DoesNotExist:
                return Response({'error': 'Store product not found'}, status=404)
        elif essp_id:
            # Backward compatibility: Map ESSP to store product (which is a Purchasable)
            from catalog.models import ExamSessionSubjectProduct
            try:
                essp = ExamSessionSubjectProduct.objects.get(id=essp_id)
                # Find store product matching the ESSP's exam session subject and product
                store_product = StoreProduct.objects.filter(
                    exam_session_subject=essp.exam_session_subject,
                    product_product_variation__product=essp.product
                ).first()
                if not store_product:
                    return Response({'error': 'No store product found for ESSP'}, status=404)
                purchasable = store_product  # Product IS a Purchasable (MTI)
            except ExamSessionSubjectProduct.DoesNotExist:
                return Response({'error': 'ExamSessionSubjectProduct not found'}, status=404)
        else:
            return Response({'error': 'purchasable_id or essp_id is required'}, status=400)

        papers = MarkingPaper.objects.filter(purchasable=purchasable)
        serializer = MarkingPaperSerializer(papers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-deadlines', permission_classes=[AllowAny])
    def bulk_deadlines(self, request):
        """
        Get marking deadlines for multiple purchasables.

        Accepts either:
        - purchasable_ids: List of purchasable IDs (preferred)
        - essp_ids: List of legacy ESSP IDs (backward compatible)

        Returns a mapping of purchasable_id (or essp_id) to list of deadlines.
        """
        purchasable_ids = request.data.get('purchasable_ids', [])
        essp_ids = request.data.get('essp_ids', [])

        if purchasable_ids and isinstance(purchasable_ids, list):
            # Direct purchasable lookup
            papers = MarkingPaper.objects.filter(purchasable_id__in=purchasable_ids)
            result = {}
            for paper in papers:
                pid = paper.purchasable_id
                if pid not in result:
                    result[pid] = []
                result[pid].append(MarkingPaperSerializer(paper).data)
            return Response(result)
        elif essp_ids and isinstance(essp_ids, list):
            # Backward compatibility: Map ESSP IDs to store products (Purchasables via MTI)
            # Note: ESSP table may not exist in all environments - use purchasable_ids instead
            try:
                from catalog.models import ExamSessionSubjectProduct
                essp_to_purchasable = {}  # Map ESSP ID to purchasable ID
                for essp in ExamSessionSubjectProduct.objects.filter(id__in=essp_ids):
                    store_product = StoreProduct.objects.filter(
                        exam_session_subject=essp.exam_session_subject,
                        product_product_variation__product=essp.product
                    ).first()
                    if store_product:
                        # store_product.pk == purchasable_ptr_id (shared PK)
                        essp_to_purchasable[essp.id] = store_product.pk

                purchasable_ids_resolved = list(essp_to_purchasable.values())
                papers = MarkingPaper.objects.filter(purchasable_id__in=purchasable_ids_resolved)

                # Map back to ESSP IDs for response
                purchasable_to_essp = {v: k for k, v in essp_to_purchasable.items()}
                result = {}
                for paper in papers:
                    essp_id = purchasable_to_essp.get(paper.purchasable_id)
                    if essp_id:
                        if essp_id not in result:
                            result[essp_id] = []
                        result[essp_id].append(MarkingPaperSerializer(paper).data)
                return Response(result)
            except Exception as e:
                # ESSP table may not exist - return error with guidance
                return Response({
                    'error': 'ESSP lookup failed. Use purchasable_ids instead of essp_ids.',
                    'detail': str(e)
                }, status=400)
        else:
            return Response({'error': 'purchasable_ids or essp_ids is required and must be a list'}, status=400)
