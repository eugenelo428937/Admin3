# students/views.py
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.db import transaction
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect, csrf_exempt
from .models import Student
from .serializers import StudentSerializer, UserSerializer
import json

# @api_view(['POST'])
# @permission_classes([AllowAny])
# @csrf_protect
# def login_view(request):
#     """
#     Login view that accepts username and password
#     """
#     try:
#         username = request.data.get('username')
#         password = request.data.get('password')

#         if not username or not password:
#             return Response({
#                 'status': 'error',
#                 'message': 'Please provide both username and password'
#             }, status=status.HTTP_400_BAD_REQUEST)

#         user = authenticate(request, username=username, password=password)

#         if user is not None:
#             login(request, user)
#             try:
#                 student = user.student
#                 return Response({
#                     'status': 'success',
#                     'message': 'Login successful',
#                     'user': {
#                         'id': user.id,
#                         'username': user.username,
#                         'email': user.email,
#                         'first_name': user.first_name,
#                         'last_name': user.last_name,
#                         'student_ref': student.student_ref,
#                         'student_type': student.student_type,
#                         'apprentice_type': student.apprentice_type
#                     }
#                 })
#             except Student.DoesNotExist:
#                 return Response({
#                     'status': 'success',
#                     'message': 'Login successful (non-student user)',
#                     'user': {
#                         'id': user.id,
#                         'username': user.username,
#                         'email': user.email,
#                         'first_name': user.first_name,
#                         'last_name': user.last_name
#                     }
#                 })
#         else:
#             return Response({
#                 'status': 'error',
#                 'message': 'Invalid credentials'
#             }, status=status.HTTP_401_UNAUTHORIZED)

#     except json.JSONDecodeError:
#         return Response({
#             'status': 'error',
#             'message': 'Invalid JSON data'
#         }, status=status.HTTP_400_BAD_REQUEST)
#     except Exception as e:
#         return Response({
#             'status': 'error',
#             'message': str(e)
#         }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @csrf_protect
# def logout_view(request):
#     """
#     Logout view
#     """
#     logout(request)
#     return Response({
#         'status': 'success',
#         'message': 'Successfully logged out'
#     })


# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def get_session_info(request):
#     """
#     Get current session information
#     """
#     try:
#         student = request.user.student
#         return Response({
#             'status': 'success',
#             'authenticated': True,
#             'user': {
#                 'id': request.user.id,
#                 'username': request.user.username,
#                 'email': request.user.email,
#                 'first_name': request.user.first_name,
#                 'last_name': request.user.last_name,
#                 'student_ref': student.student_ref,
#                 'student_type': student.student_type,
#                 'apprentice_type': student.apprentice_type
#             }
#         })
#     except Student.DoesNotExist:
#         return Response({
#             'status': 'success',
#             'authenticated': True,
#             'user': {
#                 'id': request.user.id,
#                 'username': request.user.username,
#                 'email': request.user.email,
#                 'first_name': request.user.first_name,
#                 'last_name': request.user.last_name
#             }
#         })

# class StudentViewSet(viewsets.ModelViewSet):
#     queryset = Student.objects.all()
#     serializer_class = StudentSerializer
#     permission_classes = [IsAuthenticated]

#     def get_queryset(self):
#         """
#         Optionally restricts the returned students,
#         by filtering against query parameters in the URL.
#         """
#         queryset = Student.objects.all()
#         student_type = self.request.query_params.get('student_type', None)
#         if student_type is not None:
#             queryset = queryset.filter(student_type=student_type)
#         return queryset

#     # @csrf_exempt
#     # def login_view(request):
#     #     if request.method == 'POST':
#     #         try:
#     #             data = json.loads(request.body)
#     #             username = data.get('username')
#     #             password = data.get('password')

#     #             user = authenticate(
#     #                 request, username=username, password=password)
#     #             if user is not None:
#     #                 login(request, user)
#     #                 return JsonResponse({'status': 'success', 'message': 'Login successful'})
#     #             else:
#     #                 return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=400)
#     #         except Exception as e:
#     #             return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
#     #     else:
#     #         return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

#     # @csrf_exempt
#     # def logout_view(request):
#     #     if request.method == 'POST':
#     #         logout(request)
#     #         return JsonResponse({'status': 'success', 'message': 'Logout successful'})
#     #     else:
#     #         return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

#     # @api_view(['GET'])
#     # @permission_classes([IsAuthenticated])
#     # def get_student_details_view(request):
#     #     """
#     #     Get details of the currently authenticated user
#     #     """
#     #     serializer = StudentSerializer(request.user)
#     #     return Response(serializer.data)
# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def get_current_student(request):
#     """
#     Get details of the currently authenticated student
#     """
#     try:
#         student = request.user.student
#         serializer = StudentSerializer(student)
#         return Response(serializer.data)
#     except Student.DoesNotExist:
#         return Response(
#             {"detail": "Student profile not found."},
#             status=status.HTTP_404_NOT_FOUND
#         )

# @api_view(['POST'])
# @transaction.atomic
# @permission_classes([AllowAny])
# @csrf_protect
# def register_student(request):
#     """
#     Register a new student with associated user account
#     """
#     try:
#         with transaction.atomic():
#             # Format the data to match the serializer structure
#             data = {
#                 'user': {
#                     'username': request.data.get('email'),
#                     'password': request.data.get('password'),
#                     'email': request.data.get('email'),
#                     'first_name': request.data.get('first_name', ''),
#                     'last_name': request.data.get('last_name', '')
#                 }            
#             }

#             serializer = StudentSerializer(data=data)
#             if serializer.is_valid():
#                 student = serializer.save()
#                 login(request, student.user)
#                 return Response({
#                     'status': 'success',
#                     'message': 'Registration successful',
#                     'user': {
#                         'id': student.user.id,
#                         'username': student.user.username,
#                         'email': student.user.email,
#                         'first_name': student.user.first_name,
#                         'last_name': student.user.last_name
#                     }
#                 }, status=status.HTTP_201_CREATED)
#             else:
#                 return Response({
#                     'status': 'error',
#                     'message': 'Validation failed',
#                     'errors': serializer.errors
#                 }, status=status.HTTP_400_BAD_REQUEST)
#     except Exception as e:
#         return Response({
#             'status': 'error',
#             'message': str(e)
#         }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# # @csrf_exempt
# # def add_student_view(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             username = data.get('username')
#             password = data.get('password')
#             email = data.get('email')
#             # Add other student data as needed
#             student_data = {
#                 'student_type': data.get('student_type'),
#                 'apprentice_type': data.get('apprentice_type'),
#                 'remarks': data.get('remarks'),
#             }

#             print(f"Received data: {data}")  # Debugging log

#             student = add_student(username, password,
#                                     email, **student_data)

#             if student:
#                 return JsonResponse({'status': 'success', 'student_ref': student.student_ref})
#             else:
#                 return JsonResponse({'status': 'error', 'message': 'Failed to add student'})
#         except Exception as e:
#             print(f"An error occurred: {e}")  # Debugging log
#             return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
#     else:
#         return JsonResponse({'status': 'error', 'message': 'Invalid request method'})
    
class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Optionally restricts the returned students,
        by filtering against query parameters in the URL.
        """
        queryset = Student.objects.all()
        student_type = self.request.query_params.get('student_type', None)
        if student_type is not None:
            queryset = queryset.filter(student_type=student_type)
        return queryset
