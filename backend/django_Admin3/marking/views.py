"""
Marking views.

Updated 2026-01-27: Changed to use store.Product instead of ESSP
as part of schema migration.

API still accepts essp_id for backward compatibility but queries via store.Product.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from marking.models import MarkingPaper
from marking.serializers import MarkingPaperSerializer
from store.models import Product as StoreProduct


class MarkingPaperViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MarkingPaper.objects.all()
    serializer_class = MarkingPaperSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def deadlines(self, request):
        """
        Get marking deadlines for a store product.

        Accepts either:
        - store_product_id: Direct store product ID (preferred)
        - essp_id: Legacy ESSP ID (backward compatible - maps to store product)
        """
        store_product_id = request.query_params.get('store_product_id')
        essp_id = request.query_params.get('essp_id')

        if store_product_id:
            # Direct store product lookup
            try:
                store_product = StoreProduct.objects.get(id=store_product_id)
            except StoreProduct.DoesNotExist:
                return Response({'error': 'Store product not found'}, status=404)
        elif essp_id:
            # Backward compatibility: Map ESSP to store product
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
            except ExamSessionSubjectProduct.DoesNotExist:
                return Response({'error': 'ExamSessionSubjectProduct not found'}, status=404)
        else:
            return Response({'error': 'store_product_id or essp_id is required'}, status=400)

        papers = MarkingPaper.objects.filter(store_product=store_product)
        serializer = MarkingPaperSerializer(papers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-deadlines', permission_classes=[AllowAny])
    def bulk_deadlines(self, request):
        """
        Get marking deadlines for multiple products.

        Accepts either:
        - store_product_ids: List of store product IDs (preferred)
        - essp_ids: List of legacy ESSP IDs (backward compatible)

        Returns a mapping of product_id to list of deadlines.
        """
        store_product_ids = request.data.get('store_product_ids', [])
        essp_ids = request.data.get('essp_ids', [])

        if store_product_ids and isinstance(store_product_ids, list):
            # Direct store product lookup
            papers = MarkingPaper.objects.filter(store_product_id__in=store_product_ids)
            result = {}
            for paper in papers:
                pid = paper.store_product_id
                if pid not in result:
                    result[pid] = []
                result[pid].append(MarkingPaperSerializer(paper).data)
            return Response(result)
        elif essp_ids and isinstance(essp_ids, list):
            # Backward compatibility: Map ESSP IDs to store products
            # Note: ESSP table may not exist in all environments - use store_product_ids instead
            try:
                from catalog.models import ExamSessionSubjectProduct
                essp_to_store = {}  # Map ESSP ID to store product ID
                for essp in ExamSessionSubjectProduct.objects.filter(id__in=essp_ids):
                    store_product = StoreProduct.objects.filter(
                        exam_session_subject=essp.exam_session_subject,
                        product_product_variation__product=essp.product
                    ).first()
                    if store_product:
                        essp_to_store[essp.id] = store_product.id

                store_ids = list(essp_to_store.values())
                papers = MarkingPaper.objects.filter(store_product_id__in=store_ids)

                # Map back to ESSP IDs for response
                store_to_essp = {v: k for k, v in essp_to_store.items()}
                result = {}
                for paper in papers:
                    essp_id = store_to_essp.get(paper.store_product_id)
                    if essp_id:
                        if essp_id not in result:
                            result[essp_id] = []
                        result[essp_id].append(MarkingPaperSerializer(paper).data)
                return Response(result)
            except Exception as e:
                # ESSP table may not exist - return error with guidance
                return Response({
                    'error': 'ESSP lookup failed. Use store_product_ids instead of essp_ids.',
                    'detail': str(e)
                }, status=400)
        else:
            return Response({'error': 'store_product_ids or essp_ids is required and must be a list'}, status=400)
