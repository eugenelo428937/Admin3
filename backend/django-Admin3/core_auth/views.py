# core_auth/views.py
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET

@require_GET
def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})
