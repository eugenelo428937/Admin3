# students/views.py

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Users
import json

@csrf_exempt
def create_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            firstname = data.get('firstname')
            lastname = data.get('lastname')
            password = data.get('password')
            
            new_user = Users(firstname=firstname, lastname=lastname, password=password)
            new_user.save()
            
            return JsonResponse({'message': f"User {new_user.firstname} {new_user.lastname} created with ID {new_user.id}"})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Invalid request method'}, status=400)
