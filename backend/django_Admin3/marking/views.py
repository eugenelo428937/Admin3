from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from marking.models import MarkingPaper
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from marking.serializers import MarkingPaperSerializer

# Create your views here.

class MarkingPaperViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MarkingPaper.objects.all()
    serializer_class = MarkingPaperSerializer

    @action(detail=False, methods=['get'])
    def by_product(self, request):
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
