# students/views.py

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Users, Students
import json
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def create_user(data):
    try:
        firstname = data.get('firstname')
        lastname = data.get('lastname')
        password = data.get('password')
        
        new_user = Users(firstname=firstname, lastname=lastname, password=password)
        new_user.save()
        
        return {'message': f"User {new_user.firstname} {new_user.lastname} created with ID {new_user.id}", 'user_id': new_user.id}
    except Exception as e:
        return {'error': str(e)}

@csrf_exempt
def create_student(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Create user first
            user_response = create_user(data)
            
            if 'error' in user_response:
                return JsonResponse({'error': user_response['error']}, status=400)
            
            user_id = user_response['user_id']
            user = Users.objects.get(id=user_id)

            # Create student
            new_student = Students(user=user)
            new_student.save()

            return JsonResponse({'message': f"Student created with reference {new_student.student_ref} for user ID {user_id}"})
        except Users.DoesNotExist:
            return JsonResponse({'error': 'User does not exist'}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=400)
