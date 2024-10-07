# myapp/views.py

from django.http import HttpResponse
from Admin3App.models import Users


def create_user(request):
    new_user = Users(firstname='Eugene', lastname='Lo',
                     password='securepassword123')
    new_user.save()
    return HttpResponse(f"User {new_user.firstname} {new_user.lastname} created with ID {new_user.id}")
