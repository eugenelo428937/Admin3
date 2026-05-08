"""
Subject views for the catalog API.

Location: catalog/views/subject_views.py
Model: catalog.models.Subject

Features:
- Cached list endpoint (5-minute TTL, key: subjects_list_v2:type=<filter>)
- Optional subject_type filter (UK, SA, CAA, PMS)
- Only returns active subjects in list
- Bulk import action for batch creation
- Permission: AllowAny for reads, IsSuperUser for writes (FR-013)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache

from catalog.models import Subject
from catalog.serializers import SubjectSerializer
from catalog.permissions import IsSuperUser


class SubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Subject model CRUD operations.

    List endpoint is cached for 5 minutes and returns only active subjects.
    The 'name' field is an alias for 'description' for frontend compatibility.

    Permissions:
        - list, retrieve: AllowAny
        - create, update, destroy, bulk_import: IsSuperUser

    Cache:
        - Key: subjects_list_v2:type=<filter> (one entry per subject_type value + "all")
        - TTL: 300 seconds (5 minutes)
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer

    def get_permissions(self):
        """
        Return permissions based on action.

        Read operations (list, retrieve) use AllowAny.
        Write operations (create, update, delete, bulk_import) require IsSuperUser.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        """
        List active subjects with caching, optionally filtered by subject_type.

        OPTIMIZED: Cache subjects list for 5 minutes per filter value.
        Subjects rarely change and are fetched on every navigation menu load.

        Query params:
            subject_type (optional): One of 'UK', 'SA', 'CAA', 'PMS'.

        Returns:
            List of subjects with id, code, description, name, active,
            subject_type, subject_type_display.
        """
        subject_type = request.query_params.get('subject_type')
        cache_key = f'subjects_list_v2:type={subject_type or "all"}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        qs = Subject.objects.filter(active=True)
        if subject_type:
            qs = qs.filter(subject_type=subject_type)

        subjects = qs.order_by('code').values(
            'id', 'code', 'description', 'active', 'subject_type'
        )

        # Build a code->label lookup once per request
        type_label_map = dict(Subject.SubjectType.choices)

        result = [
            {
                'id': s['id'],
                'code': s['code'],
                'description': s['description'],
                'name': s['description'],  # Frontend compatibility alias
                'active': s['active'],
                'subject_type': s['subject_type'],
                'subject_type_display': type_label_map.get(s['subject_type'], ''),
            }
            for s in subjects
        ]

        cache.set(cache_key, result, 300)  # Cache for 5 minutes
        return Response(result)

    @action(detail=False, methods=['POST'], url_path='bulk-import')
    def bulk_import_subjects(self, request):
        """
        Bulk import subjects from a list.

        Request body:
            {
                "subjects": [
                    {"code": "CM2", "description": "Financial Mathematics"},
                    {"code": "SA1", "description": "Health and Care"}
                ]
            }

        Returns:
            - 201 if any subjects were created
            - 400 if no subjects were created (all had errors)
            - Response includes 'created' list and 'errors' list
        """
        try:
            subjects_data = request.data.get('subjects', [])
            created_subjects = []
            errors = []

            for subject_data in subjects_data:
                serializer = SubjectSerializer(data=subject_data)
                if serializer.is_valid():
                    serializer.save()
                    created_subjects.append(serializer.data)
                    # Invalidate cache when new subjects are created.
                    # Multiple entries exist (one per subject_type filter), so
                    # use delete_pattern when available, else delete known keys.
                    if hasattr(cache, 'delete_pattern'):
                        cache.delete_pattern('subjects_list_v2:*')
                    else:
                        cache.delete('subjects_list_v2:type=all')
                        for code, _ in Subject.SubjectType.choices:
                            cache.delete(f'subjects_list_v2:type={code}')
                else:
                    errors.append({
                        'code': subject_data.get('code'),
                        'errors': serializer.errors
                    })

            return Response({
                'message': f'Successfully imported {len(created_subjects)} subjects',
                'created': created_subjects,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created_subjects else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
