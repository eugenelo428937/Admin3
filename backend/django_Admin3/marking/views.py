"""
Marking views.

Updated 2026-01-16: Changed imports from exam_sessions_subjects_products to catalog
as part of T087 legacy app cleanup.
"""
from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from marking.models import MarkingPaper
from catalog.models import ExamSessionSubjectProduct
from marking.serializers import MarkingPaperSerializer

class MarkingPaperViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MarkingPaper.objects.all()
    serializer_class = MarkingPaperSerializer


    permission_classes = [AllowAny]
    @action(detail=False, methods=['get'])
    def deadlines(self, request):
        """
        Get marking deadlines for a given exam_session_subject_product id (passed as ?essp_id=)
        """
        essp_id = request.query_params.get('essp_id')
        if not essp_id:
            return Response({'error': 'essp_id is required'}, status=400)
        try:
            essp = ExamSessionSubjectProduct.objects.get(id=essp_id)
        except ExamSessionSubjectProduct.DoesNotExist:
            return Response({'error': 'ExamSessionSubjectProduct not found'}, status=404)
        papers = MarkingPaper.objects.filter(exam_session_subject_product=essp)
        serializer = MarkingPaperSerializer(papers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-deadlines', permission_classes=[AllowAny])
    def bulk_deadlines(self, request):
        """
        Get marking deadlines for a list of exam_session_subject_product ids (POST with {"essp_ids": [id1, id2, ...]})
        Returns a mapping of essp_id to list of deadlines.
        """
        essp_ids = request.data.get('essp_ids', [])
        if not essp_ids or not isinstance(essp_ids, list):
            return Response({'error': 'essp_ids is required and must be a list'}, status=400)
        papers = MarkingPaper.objects.filter(exam_session_subject_product_id__in=essp_ids)
        result = {}
        for paper in papers:
            eid = paper.exam_session_subject_product_id
            if eid not in result:
                result[eid] = []
            result[eid].append(MarkingPaperSerializer(paper).data)
        return Response(result)
