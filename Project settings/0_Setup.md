# Setup for Admin3 Developement

Setting Up Local Development Environment for Admin3 System
This guide will walk you through setting up a local development environment for the Admin3 system using Visual Studio Code (VSCode) as the Integrated Development Environment (IDE). The setup includes getting the source code from a GitHub repository, installing necessary extensions, setting up a Python environment, and configuring Django and React applications.

## Prerequisites

1. Ensure you have Git installed on your machine. You can download it from [https://git-scm.com/downloads](https://git-scm.com/downloads).
1. Ensure you have Python installed on your machine. You can download it from [https://www.python.org/downloads/](https://www.python.org/downloads/).
1. Ensure you have VSCode installed on your machine. You can download it from [https://code.visualstudio.com/download](https://code.visualstudio.com/download).
1. Ensure PostgreSQL and PgAdmin 4 is installed on your machine. You can download it from [here](https://www.postgresql.org/download/).
1. Ensure Node.js and npm installed on your machine. You can download it from [here](https://nodejs.org/en/download/package-manager).

## 1. Github

1. Clone the GitHub Repository

   1. Open a terminal window.
   1. Clone the Admin3 repository using the following command:

```bash
git clone https://github.com/yourusername/Admin3.git
```

### GitHub Checkpoint

```bash
cd Admin3
ls
```

Navigate to the project directory and verify that the repository has been cloned by listing the files in the directory.

## 2. Install Necessary VSCode Extensions

1. Open VSCode.
1. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing Ctrl+Shift+X.
1. Search for and install the following extensions:
   - Prettier - Code formatter
   - Python
   - PostgreSQL

## 3: Set Up Python Environment

1. Open a terminal in VSCode by going to View > Terminal or pressing Ctrl+ `.
1. navigate to the project directory and create a virtual environment using the following command:

```bash
python -m venv venv # Create a virtual environment named 'venv'
.\venv\Scripts\activate # activate the virtual environment 
python -m ensurepip --upgrade # Ensure pip is upgraded
pip install --upgrade pip # Upgrade pip
```

### Python Checkpoint

1. Verify that the virtua environment is activated by checking the terminal prompt (it should start with (venv)).
1. Check the Python version:

```bash
python --version
```

## 4: Install Project Dependencies

With the virtual environment activated, install the required Python packages:

```bash
pip install -r ./Project-Setting/requirements.txt
```

### Python Checkpoint 2

Verify that the packages are installed by listing the installed packages:

```bash
pip list
```

## 5: Set Up Django Application

1. Navigate to the Django project directory:

```bash
cd ./Admin3/backend/django-Admin3
```

1. Apply database migrations:

```bash
python manage.py makemigrations
python manage.py migrate
```

1. Create a superuser for the Django admin:

```bash
python manage.py createsuperuser
```

1. Run the Django development server in Port 8888:

>[!IMPORTANT]
>The default 8000 Port is blocked by BPP.

```bash
python manage.py runserver 8888
```

### Django Checkpoint

1. Open a web browser and navigate to <http://127.0.0.1:8888/>. You should see the Django welcome page.
2. Navigate to <http://127.0.0.1:8000/admin/> and log in with the superuser credentials to access the Django admin interface.

## 6: Set Up React Application

Navigate to the React project directory and run the following commands to install project dependencies and start the React development server.

```bash
# verifies the right Node.js version is in the environment
node -v # should print `v20.18.0`
# verifies the right npm version is in the environment
npm -v # should print `10.8.2`

cd ./Admin3/frontend/react-Admin3
npm install # Install project dependencies
npm start
```

### React Checkpoint

1. Open a web browser and navigate to <http://localhost:3000/>. You should see the React application running.

## 7: Set Up PostgreSQL

1. In PgAdmin 4, open the ACTEDDEV01.sql using the query tool, run the query to create a local database named "ACTEDDEV01".
1. Update the Django settings.py (./Admin3/backend/Django-Admin3/settings.py) file with the PostgreSQL database configuration.

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ACTEDDEV01',
        'USER': 'your_username',
        'PASSWORD': 'your_password',
        'HOST': 'localhost', # or your PostgreSQL server address
        'PORT': '5432', # default PostgreSQL port
    }
}
```

### PostgreSQL Checkpoint

1. Verify the database connection by running a simple query using the PostgreSQL extension in VSCode.

```sql
SELECT * FROM public."user-profile"
LEFT JOIN public."auth-user" 
ON public."user-profile"."user_id" = public."auth-user"."id"
LIMIT 10
```

## 8: Running Admin3

1. Open Terminal in VSCode and navigate to the Django project directory.

```bash
cd ./Admin3/backend/Django-Admin3
python manage.py runserver 8888
```

1. Open Another Terminal in VSCode and navigate to the React project directory and run the following command to start the React development server.

```bash
cd ./Admin3/frontend/react-admin3
npm start
```

1. Open a web browser and navigate to <http://localhost:3000/>. You should see the Admin3  running. ^_^
