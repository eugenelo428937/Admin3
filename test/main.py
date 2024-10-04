import requests

url = 'http://127.0.0.1:8000/students/register/'
data = {
    'username': 'testuser',
    'password': 'testpassword',
    'student_id': '12345',
    'email': 'testuser@example.com',
    'contact_number': '1234567890'
}

response = requests.post(url, data=data)
print(response.json())
