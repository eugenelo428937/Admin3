# Backend tutorial

## Chapter 1: Setup

#### Installing Python

    1. Go to https://www.python.org/downloads/ and download the latest Python install manager. Or go to `Z:\Shared IT Files\Python`
    1. Run the installer as Administrator
    1. IMPORTANT: Check "Add Python to PATH"
    1. Click Customize installation
    1. Optional Features - Check all:
        - Documentation
        - pip
        - tcl/tk and IDLE
        - Python test suite
        - py launcher
    1. Click Next
    1. Advanced Options:
        - Install for all users
        - Associate files with Python
        - Create shortcuts
        - Add Python to environment variables
        - Precompile standard library
        - Install location: C:\Program Files\Python31x
    1. Click Install
    1. Wait for installation to complete
    1. Click Close

##### Verify Python Installation

    ```powershell
    python --version
    ```

**Expected output:**
    ```powershell
    Python 3.14.x
    ```

**Verify pip:**
    ```powershell
    pip --version
    ```

**Expected output:**
    ```powershell
    pip 25.x from C:\Program Files\Python314\Lib\site-packages\pip (python 3.14)
    ```

#### Install Github CLI

#### Install PostgreSql

1. Download the latest windows installer at [https://www.postgresql.org/download/](https://www.postgresql.org/download/) or copy from `Z:\Shared IT Files\.Laptop setup\IT Dev`
1. Install PostgreSQL
1. Download PgAdmin 4 [https://www.pgadmin.org/download/pgadmin-4-windows/(https://www.pgadmin.org/download/pgadmin-4-windows/)
1. Install PgAdmin 4
1 Create database ACTEDDBTRAIN01

#### Clone repository from github

    ```powershell
    mkdir C:/Code
    cd C:/Code
    gh repo clone actedoffice/eStore
    ```

#### Create Virtual Environment

<details>

<summary>More about Virtual Environment</summary>

When you write Python applications, you will usually use packages and modules that are not included in the standard Python library. You may have Python applications that require a different version of the same module. However, only a specific version of a module can be installed system-wide. If you upgrade a module version for an application, you might end up breaking other applications that require an older version of that module.

To address this issue, you can use Python virtual environments. With virtual environments, you can install Python modules in an isolated location rather than installing them system-wide. Each virtual environment has its own Python binary and can have its own independent set of installed Python packages in its site-packages directory.

Since version 3.3, Python comes with the venv library, which provides support for creating lightweight virtual environments. By using the Python venv module to create isolated Python environments, you can use different package versions for different projects. Another advantage of using venv is that you won’t need any administrative privileges to install Python packages

</details>

    ```powershell
        cd C:/Code/eStore
        python -m venv my_env
        .\my_env\Scripts\activate
    ```

#### Installing Django with pip

```powershell
python -m pip install Django~=6.0.1
```

**Verify django:**
    ```powershell
    python -m django --version
    ```

    **Expected output:**
    ```powershell
    6.0.1
    ```

#### Installing python packages

```
    cd C:/Code/eStore/backend/
    pip install -r requirements.txt
```

## Chapter 2: Create django_estore_training Project

    ```powershell
        cd C:/Code/eStore/backend/
        django-admin startproject django_estore_training
    ```

<details>

<summary>Django overview</summary>

Django is a framework consisting of a set of components that solve common web development problems. Django components are loosely coupled, which means they can be managed independently. This helps separate the responsibilities of the different layers of the framework; the database layer knows nothing about how the data is displayed, the template system knows nothing about web requests, and so on.

Django offers maximum code reusability by following the DRY (don’t repeat yourself) principle. Django also fosters rapid development and allows you to use less code by taking advantage of Python’s dynamic capabilities, such as introspection.

You can read more about Django’s design philosophies at https://docs.djangoproject.com/en/5.2/misc/design-philosophies/.

### Main framework components

Django follows the MTV (Model-Template-View) pattern. It is a slightly similar pattern to the well-known MVC (Model-View-Controller) pattern, where the template acts as the view and the framework itself acts as the controller.

The responsibilities in the Django MTV pattern are divided as follows:

Model: This defines the logical data structure and is the data handler between the database and the view.
Template: This is the presentation layer. Django uses a plain-text template system that keeps everything that the browser renders.
View: This communicates with the database via the model and transfers the data to the template for viewing.
The framework itself acts as the controller. It sends a request to the appropriate view, according to the Django URL configuration.

When developing any Django project, you will always work with models, views, templates, and URLs. In this chapter, you will learn how they fit together.

### The Django architecture

 ?? shows how Django processes requests and how the request/response cycle is managed with the different main Django components – URLs, views, models, and templates:

 This is how Django handles HTTP requests and generates responses:

A web browser requests a page by its URL and the web server passes the HTTP request to Django.
Django runs through its configured URL patterns and stops at the first one that matches the requested URL.
Django executes the view that corresponds to the matched URL pattern.
The view potentially uses data models to retrieve information from the database.
Data models provide data definitions and behaviors. They are used to query the database.
The view renders a template (usually HTML) to display the data and returns it with an HTTP response.

</details>

``` 
eStore/
    backend/
        django_estore_training/
            manage.py
            mysite/
            __init__.py
            asgi.py
            settings.py
            urls.py
            wsgi.py
        django_estore/
            ...
```

In the `backend/` folder The `django_estore_training/` directory is the container for the eStore Demo. The `django_estore/`  It contains the following files:

- manage.py: This is a command-line utility used to interact with your project. You won’t usually need to edit this file.
- `django_estore_training/django_estore_training/` folder: This is the Python package for your project, which consists of the following files:
  - `__init__.py`: An empty file that tells Python to treat the mysite directory as a Python module.
  - `asgi.py`: This is the configuration to run your project as an ASGI application with ASGI-compatible web servers. ASGI is the emerging Python standard for asynchronous web servers and applications.
  - `settings.py`: This indicates settings and configuration for your project and contains initial default settings.
  - `urls.py`: This is the place where your URL patterns live. Each URL defined here is mapped to a view.
  - `wsgi.py`: This is the configuration to run your project as a Web Server Gateway Interface (WSGI) application with WSGI-compatible web servers.

### Applying initial database migrations

Django applications require a database to store data. The settings.py file contains the database configuration for your project in the DATABASES setting.

Update the databases to ACTEDDBTRAIN01

Your settings.py file also includes a list named INSTALLED_APPS that contains common Django applications that are added to your project by default.

Django applications contain data models that are mapped to database tables. You will create your own models in the Creating the blog data models section. To complete the project setup, you need to create the tables associated with the models of the default Django applications included in the INSTALLED_APPS setting. Django comes with a system that helps you manage database migrations.

    ```powershell
    cd C:/Code/eStore/backend/django_estore_demo
    python manage.py migrate
    ```

    ```powershell
    python manage.py runserver 8888
    ```


    n+1 problem
field__lookup