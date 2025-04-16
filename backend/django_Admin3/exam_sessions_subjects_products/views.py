from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import ExamSessionSubjectProduct
from .serializers import ExamSessionSubjectProductSerializer, ProductListSerializer
from exam_sessions_subjects.models import ExamSessionSubject
from products.models.products import Product
from products.models import ProductType, ProductSubtype
from subjects.models import Subject
from subjects.serializers import SubjectSerializer

class ExamSessionSubjectProductViewSet(viewsets.ModelViewSet):    
    queryset = ExamSessionSubjectProduct.objects.all()
    serializer_class = ExamSessionSubjectProductSerializer

    # Override get_permissions method to handle permissions for specific actions
    def get_permissions(self):
        if self.action == 'get_available_products':
            return [AllowAny()]
        return super().get_permissions()
    
    @action(detail=False, methods=['post'], url_path='bulk-create')
    @permission_classes([IsAuthenticated])
    def bulk_create(self, request):
        """
        Bulk create exam session subject products.
        Expected format:
        {
            "products": [
                {
                    "exam_session_subject": 1,
                    "product": 1
                },
                ...
            ]
        }
        """
        data = request.data.get('products', [])
        created = []
        errors = []

        for item in data:
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'data': item,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST if errors else status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='add-products')
    @permission_classes([IsAuthenticated])
    def add_products_to_session_subject(self, request):
        """
        Add products to an exam session subject.
        Expected format:
        {
            "exam_session_subject_id": 1,
            "product_codes": ["PROD1", "PROD2", ...]
        }
        """
        exam_session_subject_id = request.data.get('exam_session_subject_id')
        product_codes = request.data.get('product_codes', [])

        if not exam_session_subject_id or not product_codes:
            return Response({
                'error': 'Both exam_session_subject_id and product_codes are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            exam_session_subject = get_object_or_404(
                ExamSessionSubject, id=exam_session_subject_id)
            
            created = []
            errors = []

            for product_code in product_codes:
                try:
                    product = Product.objects.get(code=product_code)
                    
                    # Create association if it doesn't exist
                    obj, created_status = ExamSessionSubjectProduct.objects.get_or_create(
                        exam_session_subject=exam_session_subject,
                        product=product
                    )
                    
                    if created_status:
                        created.append({
                            'exam_session_subject': exam_session_subject.id,
                            'product_code': product_code,
                            'status': 'created'
                        })
                    else:
                        created.append({
                            'exam_session_subject': exam_session_subject.id,
                            'product_code': product_code,
                            'status': 'already exists'
                        })
                        
                except Product.DoesNotExist:
                    errors.append({
                        'product_code': product_code,
                        'error': 'Product not found'
                    })
                except Exception as e:
                    errors.append({
                        'product_code': product_code,
                        'error': str(e)
                    })

            return Response({
                'message': f'Processed {len(created)} products for exam session subject {exam_session_subject_id}',
                'created': created,
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST if errors and not created else status.HTTP_201_CREATED)

        except ExamSessionSubject.DoesNotExist:
            return Response({
                'error': f'Exam session subject with id {exam_session_subject_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @permission_classes([AllowAny])
    @action(detail=False, methods=['get'], url_path='get-available-products')    
    def get_available_products(self, request):
        """
        Get list of all products with their subject details, product type and subtype
        Supports filtering by subject (id, code, name), product type, and product subtype
        """
                
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product',
            'product__product_type',
            'product__product_subtype'
        ).all()

        # Subject filtering - multiple options
        subject_id = request.query_params.get('subject_id', None)
        subject_code = request.query_params.get('subject_code', None)        
        subject = request.query_params.get('subject', None)  # Legacy support

        # Apply subject filters
        if subject_id:
            queryset = queryset.filter(
                exam_session_subject__subject__id=subject_id)
        if subject_code:
            queryset = queryset.filter(
                exam_session_subject__subject__code=subject_code)        
        if subject:  # Legacy support for subject parameter
            queryset = queryset.filter(
                exam_session_subject__subject__code=subject
            )

        # Product type and subtype filtering
        product_type = request.query_params.get('type', None)
        if product_type:
            queryset = queryset.filter(product__product_type__name=product_type)

        product_subtype = request.query_params.get('subtype', None)
        if product_subtype:
            queryset = queryset.filter(
                product__product_subtype__name=product_subtype)

        # Also return all available subjects for filtering dropdown
        subjects = Subject.objects.all().order_by('code')
        subject_serializer = SubjectSerializer(subjects, many=True)

        # Return products with added metadata for dropdowns
        serializer = ProductListSerializer(queryset, many=True)

        # Get unique product types and subtypes for dropdown filters
        product_types = ProductType.objects.all().values_list('name', flat=True)
        product_subtypes = ProductSubtype.objects.all().values_list('name', flat=True)

        return Response({
            'products': serializer.data,
            'filters': {
                'subjects': subject_serializer.data,
                'product_types': list(product_types),
                'product_subtypes': list(product_subtypes)
            }
        })


ExamSessionSubjectProductViewSet.get_available_products.permission_classes = [
    AllowAny]
