# Information Flow in Django Project "Admin3" with React App "admin3"

## Overview

This document explains the detailed information flow from the React form (`UserForm.js`) to the Django backend, and how the data is processed and saved into the PostgreSQL database.

## React App: UserForm.js

### 1. UserForm Component

The `UserForm` component in the React app is responsible for collecting user input and sending it to the Django backend.

```jsx
// src/UserForm.js

import React, { useState } from 'react';
import axios from 'axios';

const UserForm = () => {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:8888/students/create_user/', formData)
      .then(response => {
        alert(response.data.message);
      })
      .catch(error => {
        console.error('There was an error creating the user!', error);
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>First Name:</label>
        <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} required />
      </div>
      <div>
        <label>Last Name:</label>
        <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} required />
      </div>
      <div>
        <label>Password:</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
      </div>
      <button type="submit">Create User</button>
    </form>
  );
};

export default UserForm;
```

1. Data Submission
When the form is submitted, the handleSubmit function is triggered. This function uses Axios to send a POST request to the Django backend at the endpoint <http://localhost:8888/students/create_user/>.

Django Backend

1. URL Configuration
The URL configuration in students/urls.py maps the endpoint /create_user/ to the create_user view.

Python
Run code
Insert code

# students/urls.py

from django.urls import path
from .views import create_user

urlpatterns = [
    path('create_user/', create_user, name='create_user'),
]
2. View Function
The create_user view function in students/views.py handles the POST request from the React app. It processes the incoming JSON data, creates a new Users object, and saves it to the PostgreSQL database.

Python
Run code
Insert code

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

3. Model Definition
The Users model in students/models.py defines the structure of the user data that will be saved in the PostgreSQL database.

Python
Run code
Insert code

# students/models.py

from django.db import models

class Users(models.Model):
    firstname = models.CharField(max_length=100)
    lastname = models.CharField(max_length=100)
    password = models.CharField(max_length=100)
4. Database Configuration
The PostgreSQL database is configured in settings.py.

Python
Run code
Insert code

# settings.py

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
5. Handling CORS
To allow the React app to communicate with the Django backend, CORS is configured using django-cors-headers.

Bash
Insert code

pip install django-cors-headers
Python
Run code
Insert code

# settings.py

INSTALLED_APPS = [
    ...
    'corsheaders',
    ...
]

MIDDLEWARE = [
    ...
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

6. Running the Django Server
Start the Django development server on port 8888.

Bash
Insert code

python manage.py runserver 8888
Summary
UserForm Component: Collects user input and sends it to the Django backend via Axios.
URL Configuration: Maps the endpoint /create_user/ to the create_user view.
View Function: Processes the POST request, creates a new Users object, and saves it to the PostgreSQL database.
Model Definition: Defines the structure of the user data.
Database Configuration: Configures the PostgreSQL database in settings.py.
Handling CORS: Configures CORS to allow communication between the React app and Django backend.
Running the Server: Starts the Django server on port 8888.
By following these steps, the data from the React form is successfully passed through the Django backend and saved into the PostgreSQL database.
