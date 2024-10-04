from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.http import JsonResponse
from .models import Student, UserEmail, UserContactNumber

@csrf_exempt
def register_student(request):
    if request.method == 'POST':
        data = request.POST
        student = Student.objects.create(
            username=data['username'],
            password=data['password'],
            student_id=data['student_id']
        )
        UserEmail.objects.create(user=student, email=data['email'])
        UserContactNumber.objects.create(user=student, contact_number=data['contact_number'])
        return JsonResponse({'status': 'success', 'student_id': student.student_id})
    return JsonResponse({'status': 'failed'}, status=400)
