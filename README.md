# Admin3

## Test

## Django

```python manage.py makemigrations``
This command is used to create new migration files based on the changes you have made to your models. Here's a detailed explanation:

1. Detect Changes: Django scans your models.py files in each app listed in INSTALLED_APPS to detect any changes since the last migration.

1. Create Migration Files: It then creates migration files in the migrations directory of each app. These files are Python scripts that describe the changes to be made to the database schema.

1. Version Control: Each migration file is given a unique name and number, allowing Django to keep track of the order in which migrations should be applied.

```python manage.py migrate`
This command is used to apply the migrations to your database. Here's a detailed explanation:

1. Apply Migrations: Django reads the migration files and applies the changes described in them to your database schema.

1. Track Applied Migrations: Django keeps track of which migrations have been applied to the database in a special table called django_migrations.

1. Ensure Consistency: This ensures that your database schema is in sync with your current set of models.

```python manage.py runserver 8888`
   Port 8000 is blocked

### Example Workflow

1. Make Changes to Models: Modify your models.py file to add, remove, or change fields or models.
Create Migrations: Run python manage.py makemigrations to create migration files that describe the changes.

1. Apply Migrations: Run python manage.py migrate to apply the changes to your database.

## Using Custom table vs Tables Django auto-create

This project is a Django application that demonstrates the use of custom and Django-managed database tables. It includes a `Users` model that can be configured to use either a Django-managed table or an existing table in the database.

## Database Table Management

### Using Tables Created by Django

#### Pros

1. **Consistency and Convention**:
   - Django follows a consistent naming convention (`<app_label>_<model_name>`) which can make it easier to understand the structure of the database, especially in larger projects.

2. **Automatic Management**:
   - Django automatically handles the creation, modification, and deletion of tables based on your models. This reduces the risk of human error and ensures that the database schema is always in sync with your models.

3. **Migrations**:
   - Django's migration system is designed to work seamlessly with its own table naming conventions. This makes it easier to apply changes to the database schema over time.

4. **Integration with Django Admin**:
   - Tables created by Django are fully integrated with the Django admin interface, making it easier to manage data through the admin panel.

5. **Less Boilerplate**:
   - You don't need to manually specify table names or worry about conflicts, as Django handles this for you.

#### Cons

1. **Less Control**:
   - You have less control over the exact structure and naming of the tables, which might be an issue if you have specific requirements or need to integrate with an existing database.

2. **Learning Curve**:
   - If you're new to Django, understanding how migrations and automatic table management work can take some time.

3. **Potential for Bloat**:
   - Django might create additional tables (e.g., for many-to-many relationships) that you might not need if you were designing the database schema manually.

### Using Tables You Create Yourself

#### Pros

1. **Full Control**:
   - You have complete control over the table names, structure, and relationships. This can be important for performance tuning, compliance with existing database schemas, or specific naming conventions.

2. **Integration with Existing Databases**:
   - If you are integrating Django with an existing database, using pre-existing tables can make the integration smoother.

3. **Optimized Design**:
   - You can design the database schema to be as efficient as possible for your specific use case, without any unnecessary tables or columns.

#### Cons

1. **Manual Management**:
   - You need to manually manage the database schema, which can be error-prone and time-consuming. This includes creating, modifying, and deleting tables as your models change.

2. **Complex Migrations**:
   - Django's migration system is less effective when dealing with manually created tables. You might need to write custom migration scripts to handle changes.

3. **Increased Complexity**:
   - The need to manually synchronize your models with the database schema can add complexity to your development workflow.

4. **Potential for Inconsistency**:
   - There's a higher risk of the database schema becoming out of sync with your Django models, leading to potential bugs and data integrity issues.

## Example Workflow

### Using Django-Created Tables

1. **Make Changes to Models**:
   Modify your `models.py` file to add, remove, or change fields or models.

2. **Create Migrations**:
   Run `python manage.py makemigrations` to create migration files that describe the changes.

3. **Apply Migrations**:
   Run `python manage.py migrate` to apply the changes to your database.

### Using Existing Tables

1. **Define the Model with the Correct Table Name**:
   Ensure your model is defined with the `db_table` attribute set to the existing table name.

   ```python
   # myapp/models.py

   from django.db import models

   class Users(models.Model):
       firstname = models.CharField(max_length=100)
       lastname = models.CharField(max_length=100)
       password = models.CharField(max_length=50)

       def __str__(self):
           return f"{self.firstname} {self.lastname}"

       class Meta:
           db_table = 'Users'  # Use the existing table name
           managed = False  # This tells Django not to manage the table
