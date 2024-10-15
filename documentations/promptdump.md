# Summary

## Overview - 20241015

Today, we worked on setting up a login system in a React application that communicates with a Django backend. We addressed issues related to Cross-Origin Resource Sharing (CORS) and session management to ensure that users do not have to log in again when they revisit the page.

## Steps and Code

### 1. Configure Django for Session Management

Ensure that Django's session framework is properly configured.

### 2. Install and Configure `django-cors-headers`

Install the `django-cors-headers` package to handle CORS issues.

```sh
pip install django-cors-headers
```

Update settings.py to include corsheaders in INSTALLED_APPS and configure the middleware:

```python
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

# Allow requests from your React app's origin
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# Allow credentials (cookies) to be included in requests
CORS_ALLOW_CREDENTIALS = True

# Optionally, specify allowed methods and headers
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

```

1. Update the Login View in Django

Ensure that the login view sets a session cookie upon successful authentication.

```python
# students/views.py

from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({'status': 'success', 'message': 'Login successful'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
```

1. Update the React App to Handle Session Cookies

Ensure that fetch requests in the React app include credentials.

Example Login Component
```reactJS
// src/components/Login.js

import React, { useState } from 'react';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8888/students/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include', // Include credentials (cookies) in the request
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(errorData.message || 'Login failed');
      } else {
        const data = await response.json();
        setMessage(data.message || 'Login successful');
        // Store session information in local storage or cookies
        localStorage.setItem('isAuthenticated', 'true');
        // Redirect to another page or perform other actions
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Login;
```

1. Update the App Component to Check Authentication

Check if the user is authenticated by looking at the local storage or cookies.

```reactJS
// src/App.js

import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import StudentForm from './components/StudentForm';
import Logout from './components/Logout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if the user is authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <div className="App">
      <h1>Student Management System</h1>
      {isAuthenticated ? (
        <>
          <StudentForm />
          <Logout setIsAuthenticated={setIsAuthenticated} />
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
```

1. Handle Logout

Provide a way for users to log out and clear session information.

Create a Logout View in Django

```python
# students/views.py

from django.contrib.auth import logout

@csrf_exempt
def logout_view(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'status': 'success', 'message': 'Logout successful'})
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
```

Add this view to your urls.py:

```python
# students/urls.py

from django.urls import path
from .views import add_student_view, login_view, logout_view

urlpatterns = [
    path('add_student/', add_student_view, name='add_student'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
]

```

1. View Cookies in Chrome

To see the cookies stored in Chrome:

   1. Open Developer Tools: Right-click on the page and select "Inspect" or press Ctrl+Shift+I (Windows/Linux) or Cmd+Opt+I (Mac).
   1. Go to the Application Tab: Click on the "Application" tab in the Developer Tools panel.
   1. Navigate to Cookies: Click on "Cookies" under the "Storage" section in the left sidebar.
   1. View Cookies: Click on the domain (e.g., <http://localhost:8888>) to see the cookies stored for that domain.

By following these steps, we successfully set up a login system with session management and addressed CORS issues to ensure smooth communication between the React frontend and Django backend.
