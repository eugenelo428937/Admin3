# Django Backend Training Course

**Project**: Admin3 - Online Store for Actuarial Education
**Stack**: Python 3.14, Django 6.0, Django REST Framework, PostgreSQL
**Reference text**: *Django 5 By Example* (5th Edition) by Antonio Mele

Each session runs approximately 30 minutes.

---

## Module 1: Foundations

### Session 1.1 — Python Virtual Environments and Project Setup

**Topic**: Isolating Python dependencies per project with virtual environments.

**What it does**: A virtual environment creates a self-contained Python installation. Each project gets its own packages and versions, independent of the system-wide Python.

**The problem it solves**: Without isolation, installing a package for one project can break another. Upgrading `Django 5.1` for Project A overwrites the system-wide copy that Project B still needs at `Django 4.2`.

**Visual FoxPro comparison**: VFP lacked dependency isolation. All `.vcx`, `.prg`, and third-party `.fll` libraries lived in shared directories or the system PATH. Upgrading a library for one project risked breaking every other project that depended on it. Python's `venv` eliminates that risk.

**Step-by-step (from Admin3)**:

1. Create the virtual environment:
   ```powershell
   cd C:\Code\Admin3\backend\django_Admin3
   python -m venv .venv
   ```
2. Activate it:
   ```powershell
   .\.venv\Scripts\activate
   ```
3. Install project dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Verify Django installed correctly:
   ```powershell
   python -m django --version
   # Expected: 6.0.1
   ```

**How it fits**: Every developer on the Admin3 project runs the same package versions. The `requirements.txt` file pins exact versions. The `.venv` folder stays out of version control.

---

### Session 1.2 — Django Project Structure

**Topic**: The anatomy of a Django project and how its files fit together.

**What it does**: Django organises code into a *project* (the container holding settings, URLs, and WSGI/ASGI entry points) and *apps* (self-contained modules for distinct business domains).

**The problem it solves**: Without structure, web applications become monolithic — authentication, products, and orders tangle together in one giant codebase. Django's project/app split enforces separation from day one.

**Visual FoxPro comparison**: A typical VFP application was a single `.pjx` project containing all forms, classes, reports, and data tables. As the application grew, everything lived in the same flat structure. Django replaces that with a modular layout where each business domain owns its own app.

**Step-by-step (from Admin3)**:

1. Examine the project layout:
   ```
   backend/django_Admin3/
   ├── django_Admin3/           # Project configuration package
   │   ├── settings/
   │   │   ├── base.py          # Shared settings
   │   │   ├── development.py   # Dev overrides
   │   │   └── uat.py           # UAT overrides
   │   ├── urls.py              # Root URL router
   │   ├── wsgi.py              # Web server entry point
   │   └── asgi.py              # Async server entry point
   ├── catalog/                 # App: master data (subjects, exams)
   ├── store/                   # App: purchasable items
   ├── cart/                    # App: shopping cart
   ├── core_auth/               # App: authentication
   ├── rules_engine/            # App: business rules
   ├── manage.py                # CLI entry point
   └── requirements.txt         # Dependencies
   ```

2. Key files and their purpose:
   - `manage.py` — CLI tool for running the server, migrations, and management commands.
   - `settings/base.py` — Database config, installed apps, middleware stack, REST framework settings. See [base.py](../../backend/django_Admin3/django_Admin3/settings/base.py).
   - `urls.py` — Maps URL paths to views across all apps. See [urls.py](../../backend/django_Admin3/django_Admin3/urls.py).

3. Create a new project (training exercise):
   ```powershell
   cd C:\Code\eStore\backend
   django-admin startproject django_estore_training
   ```

**How it fits**: Admin3 has 15+ apps. Each app owns its models, views, serializers, and URL routes. The root `urls.py` delegates to each app via `include()`. This modular design lets teams work on different apps independently.

---

### Session 1.3 — Settings and Environment Configuration

**Topic**: Configuring Django for multiple environments (development, UAT, production).

**What it does**: Django reads its configuration from `settings.py`. Admin3 splits settings into a base file (shared config) and environment-specific files that override it.

**The problem it solves**: Hardcoding a production database password into a committed settings file creates a security breach. Hardcoding `DEBUG=True` in production exposes stack traces to users. Environment-based settings prevent both.

**Visual FoxPro comparison**: VFP stored configuration in `.ini` files, registry entries, or hardcoded `#DEFINE` constants. Switching between development and production meant manually editing config values. Django's `django-environ` library reads from `.env` files — one per environment — and the correct file loads automatically based on `DJANGO_ENV`.

**Step-by-step (from Admin3)**:

1. Environment detection in `settings/base.py`:
   ```python
   import environ

   env = environ.Env(
       DEBUG=(bool, False),
       ALLOWED_HOSTS=(list, []),
   )

   DJANGO_ENV = os.getenv('DJANGO_ENV', 'development')
   env_file = os.path.join(BASE_DIR, f'.env.{DJANGO_ENV}')
   environ.Env.read_env(env_file)

   DEBUG = env('DEBUG')
   ```

2. Database configuration:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': os.environ.get('DB_NAME', 'ACTEDDBDEV01'),
           'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
           'PORT': os.environ.get('DB_PORT', '5432'),
       }
   }
   ```

3. The `.env.development` file (never committed to Git):
   ```env
   DJANGO_ENV=development
   DEBUG=True
   DB_NAME=ACTEDDBTRAIN01
   DB_HOST=127.0.0.1
   SECRET_KEY=your-dev-secret-key
   ```

4. Registering apps in `INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       'django.contrib.admin',
       'django.contrib.auth',
       'rest_framework',
       'corsheaders',
       'catalog',
       'store',
       'cart',
       # ...
   ]
   ```

**How it fits**: Admin3 deploys to Railway (UAT/production) and runs locally for development. The same codebase loads different `.env` files depending on the environment variable, keeping secrets out of source control.

---

### Session 1.4 — Migrations and the Database

**Topic**: How Django manages database schema changes through migration files.

**What it does**: Migrations translate Python model definitions into SQL `CREATE TABLE`, `ALTER TABLE`, and `DROP TABLE` statements. Django generates migration files automatically and applies them in order.

**The problem it solves**: Without migrations, schema changes require hand-written SQL scripts, careful ordering, and manual tracking of which scripts each environment has run. Migrations automate all of this.

**Visual FoxPro comparison**: In VFP, changing a table structure meant opening the Table Designer, modifying fields, and hoping no one else had the table open. There was no version history, no rollback, and no way to reproduce the change on another machine. Django migrations provide a versioned, repeatable record of every schema change.

**Step-by-step (from Admin3)**:

1. Create migrations after model changes:
   ```powershell
   python manage.py makemigrations catalog
   ```
   This generates a file like `catalog/migrations/0001_initial.py`.

2. Review the migration before applying:
   ```powershell
   python manage.py sqlmigrate catalog 0001
   ```
   This prints the SQL that Django will execute.

3. Apply migrations:
   ```powershell
   python manage.py migrate
   ```

4. Check which migrations have run:
   ```powershell
   python manage.py showmigrations
   ```

5. Example migration from Admin3 — the catalog app enables PostgreSQL's trigram extension for fuzzy search:
   ```python
   # catalog/migrations/0005_enable_pg_trgm.py
   from django.contrib.postgres.operations import TrigramExtension
   from django.db import migrations

   class Migration(migrations.Migration):
       dependencies = [('catalog', '0004_...')]
       operations = [TrigramExtension()]
   ```

**How it fits**: Admin3 uses PostgreSQL with a custom `acted` schema. Each app's migrations live alongside its models. When a developer pulls new code, running `migrate` brings the local database up to date with zero manual SQL.

---

## Module 2: Models — The Data Layer

### Session 2.1 — Defining Models and Field Types

**Topic**: Django models — Python classes that map to database tables.

**What it does**: Each model class becomes a database table. Each class attribute becomes a column. Django handles SQL generation, data type mapping, and query building.

**The problem it solves**: Writing raw SQL for every CRUD operation is repetitive, error-prone, and database-specific. Django's ORM lets you define your schema in Python and query it in Python — the framework generates correct SQL for your database engine.

**Visual FoxPro comparison**: VFP's closest equivalent was the Database Container (`.dbc`) and Table Designer. You defined fields, types, and indexes through a GUI. Queries used VFP's SQL dialect or `SCAN/ENDSCAN` loops. Django replaces all of that with Python classes and a query API that works across databases.

**Step-by-step (from Admin3)**:

1. A simple model — `Subject` in `catalog/models/subject.py`:
   ```python
   from django.db import models

   class Subject(models.Model):
       code = models.CharField(max_length=10, unique=True)
       description = models.TextField(blank=True, null=True)
       active = models.BooleanField(default=True)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           db_table = '"acted"."catalog_subjects"'
           ordering = ['code']

       def __str__(self):
           return f"{self.code} - {self.description}"
   ```

2. Field types used across Admin3:
   | Python Field | SQL Type | Example |
   |---|---|---|
   | `CharField` | `VARCHAR` | Subject code, product names |
   | `TextField` | `TEXT` | Descriptions, error messages |
   | `BooleanField` | `BOOLEAN` | Active flags |
   | `DecimalField` | `NUMERIC` | Prices, VAT rates |
   | `DateTimeField` | `TIMESTAMP` | Created/updated timestamps |
   | `PositiveIntegerField` | `INTEGER CHECK >= 0` | Quantities |
   | `JSONField` | `JSONB` | VAT results, rule conditions |

3. The `Meta` class controls table-level behaviour:
   - `db_table` — Custom table name (Admin3 uses the `acted` schema)
   - `ordering` — Default sort order for queries
   - `verbose_name` — Human-readable name for Django Admin

4. `__str__` — Returns a readable label, used in Django Admin and shell debugging.

**How it fits**: Every app in Admin3 defines its models this way. The `Subject` model is the simplest — later sessions cover relationships, constraints, and computed properties.

---

### Session 2.2 — Model Relationships (ForeignKey, ManyToMany)

**Topic**: Linking models together with foreign keys and junction tables.

**What it does**: `ForeignKey` creates a one-to-many link. A junction model (explicit many-to-many) lets you attach extra data to the relationship.

**The problem it solves**: Real data is relational. An exam session has many subjects. A subject appears in many exam sessions. Without relationships, you duplicate data or write manual join queries.

**Visual FoxPro comparison**: VFP had persistent relationships in the Database Container, but enforced them weakly. You set up relations between tables using index tags, but VFP did not enforce referential integrity by default — orphaned records were common. Django enforces FK constraints at both the database and application level.

**Step-by-step (from Admin3)**:

1. ForeignKey — `ExamSessionSubject` links exam sessions to subjects:
   ```python
   # catalog/models/exam_session_subject.py
   class ExamSessionSubject(models.Model):
       exam_session = models.ForeignKey(
           'catalog.ExamSession',
           on_delete=models.CASCADE,
           related_name='exam_session_subjects',
       )
       subject = models.ForeignKey(
           'catalog.Subject',
           on_delete=models.CASCADE,
           related_name='exam_session_subjects',
       )
       is_active = models.BooleanField(default=True)

       class Meta:
           unique_together = ('exam_session', 'subject')
   ```

2. Key concepts:
   - `on_delete=models.CASCADE` — Deleting the parent deletes all children.
   - `related_name='exam_session_subjects'` — Enables reverse queries: `subject.exam_session_subjects.all()`.
   - `unique_together` — Prevents duplicate combinations.

3. Querying relationships:
   ```python
   # Forward: from child to parent
   ess = ExamSessionSubject.objects.first()
   print(ess.subject.code)          # 'CM2'
   print(ess.exam_session.session_code)  # '2025-04'

   # Reverse: from parent to children
   subject = Subject.objects.get(code='CM2')
   sessions = subject.exam_session_subjects.all()
   ```

4. Multi-level FK chain — Store `Product` links to two junction tables:
   ```python
   # store/models/product.py
   class Product(models.Model):
       exam_session_subject = models.ForeignKey(
           'catalog.ExamSessionSubject',
           on_delete=models.CASCADE,
           related_name='store_products',
       )
       product_product_variation = models.ForeignKey(
           'catalog.ProductProductVariation',
           on_delete=models.CASCADE,
           related_name='store_products',
       )
   ```

**How it fits**: Admin3's data model is deeply relational. A store product connects exam session, subject, product template, and variation. Understanding FK chains is essential for querying products, building serializers, and debugging data issues.

---

### Session 2.3 — Model Constraints and Validation

**Topic**: Database-level constraints that enforce data integrity.

**What it does**: Constraints prevent invalid data from reaching the database. Django supports unique constraints, check constraints, and composite unique constraints — all defined in the model's `Meta` class.

**The problem it solves**: Application-level validation can be bypassed (through management commands, the Django shell, or direct SQL). Database constraints serve as the last line of defence — they reject invalid data regardless of entry method.

**Visual FoxPro comparison**: VFP had field-level and record-level validation rules, but these ran only in VFP's runtime. A direct `INSERT` via ODBC bypassed them. PostgreSQL constraints, enforced through Django migrations, reject invalid data from every client.

**Step-by-step (from Admin3)**:

1. Simple unique constraint — one cart per user:
   ```python
   # cart/models.py
   class Cart(models.Model):
       user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True)

       class Meta:
           constraints = [
               models.UniqueConstraint(
                   fields=['user'],
                   condition=models.Q(user__isnull=False),
                   name='unique_cart_per_user'
               ),
           ]
   ```
   This allows multiple guest carts (user=NULL) but only one cart per logged-in user.

2. Check constraint — a cart item must reference a product, voucher, or be a fee:
   ```python
   # cart/models.py
   class CartItem(models.Model):
       class Meta:
           constraints = [
               models.CheckConstraint(
                   condition=(
                       models.Q(product__isnull=False) |
                       models.Q(marking_voucher__isnull=False) |
                       models.Q(item_type='fee')
                   ),
                   name='cart_item_has_product_or_voucher_or_is_fee'
               ),
               models.CheckConstraint(
                   condition=~(
                       models.Q(product__isnull=False) &
                       models.Q(marking_voucher__isnull=False)
                   ),
                   name='cart_item_not_both_product_and_voucher'
               ),
           ]
   ```

3. Composite unique — one price type per product:
   ```python
   # store/models/price.py
   class Price(models.Model):
       class Meta:
           unique_together = ('product', 'price_type')
   ```

4. Custom indexes for query performance:
   ```python
   class Meta:
       indexes = [
           models.Index(fields=['vat_region'], name='idx_cartitem_vat_region'),
           models.Index(fields=['cart', 'vat_region'], name='idx_cartitem_cart_vat_region'),
       ]
   ```

**How it fits**: Admin3's cart system relies on constraints to prevent data corruption — duplicate carts, items without products, and overlapping price types. These constraints generate real PostgreSQL `CHECK` and `UNIQUE` constraints in the database.

---

### Session 2.4 — Custom Model Methods and Properties

**Topic**: Adding business logic to models through methods and computed properties.

**What it does**: Models can define methods (for actions) and `@property` decorators (for computed values). Overriding `save()` lets you run logic before writing to the database.

**The problem it solves**: Scattering business logic across views, serializers, and utility functions makes it hard to find and test. Placing logic on the model keeps data and behaviour together.

**Visual FoxPro comparison**: VFP used class methods on business objects or custom procedures in `.prg` files. The logic was often disconnected from the data layer. Django models unify data definition and domain logic in one class — a "rich domain model."

**Step-by-step (from Admin3)**:

1. Override `save()` for auto-generated codes:
   ```python
   # store/models/product.py
   class Product(models.Model):
       product_code = models.CharField(max_length=64, unique=True)

       def save(self, *args, **kwargs):
           if not self.product_code:
               self.product_code = self._generate_product_code()
           super().save(*args, **kwargs)

       def _generate_product_code(self):
           ess = self.exam_session_subject
           subject_code = ess.subject.code
           exam_code = ess.exam_session.session_code
           # Build code from related data...
           return f"{subject_code}/{variation_code}/{exam_code}"
   ```

2. `@property` for backward compatibility:
   ```python
   # store/models/product.py
   @property
   def product(self):
       """Access the catalog Product through the PPV junction."""
       return self.product_product_variation.product

   @property
   def product_variation(self):
       """Access the catalog ProductVariation through the PPV junction."""
       return self.product_product_variation.product_variation
   ```

3. `@property` with fallback logic:
   ```python
   # store/models/bundle.py
   class Bundle(models.Model):
       override_name = models.CharField(max_length=255, blank=True, null=True)

       @property
       def name(self):
           return self.override_name or self.bundle_template.bundle_name
   ```

4. `__str__` with FK traversal:
   ```python
   def __str__(self):
       return f"{self.exam_session.session_code} - {self.subject.code}"
   ```

**How it fits**: Admin3's store products auto-generate product codes on save. The backward-compatible properties let old cart code keep working after the database restructure. These patterns keep the codebase maintainable during large refactors.

---

## Module 3: The ORM — Querying Data

### Session 3.1 — QuerySets: Filtering, Ordering, and Chaining

**Topic**: Django's QuerySet API for reading data from the database.

**What it does**: QuerySets are lazy — they build SQL incrementally and execute only when evaluated. You chain `.filter()`, `.exclude()`, `.order_by()`, and other methods to compose queries.

**The problem it solves**: Writing raw SQL for every query is verbose and database-specific. The ORM generates optimised SQL from Python expressions and works identically across PostgreSQL, MySQL, and SQLite.

**Visual FoxPro comparison**: VFP used `SELECT ... FROM ... WHERE` in its SQL dialect, or procedural `SCAN/ENDSCAN` loops with `LOCATE/CONTINUE`. Django's QuerySet API resembles SQL `SELECT` but is chainable and composable in Python.

**Step-by-step (from Admin3)**:

1. Basic queries in the Django shell:
   ```python
   python manage.py shell

   from catalog.models import Subject

   # All subjects
   Subject.objects.all()

   # Filter by field value
   Subject.objects.filter(code='CM2')

   # Filter active subjects, ordered by code
   Subject.objects.filter(active=True).order_by('code')

   # Exclude inactive
   Subject.objects.exclude(active=False)

   # Get a single record (raises DoesNotExist if missing)
   Subject.objects.get(code='CM2')
   ```

2. Chaining filters:
   ```python
   from store.models import Product

   # Active products for a specific subject
   Product.objects.filter(
       is_active=True,
       exam_session_subject__subject__code='CM2'
   ).order_by('product_code')
   ```
   The double-underscore (`__`) syntax traverses FK relationships.

3. Aggregation:
   ```python
   from django.db.models import Count

   Subject.objects.annotate(
       product_count=Count('exam_session_subjects__store_products')
   ).values('code', 'product_count')
   ```

4. Lightweight queries with `.values()`:
   ```python
   Subject.objects.filter(active=True).values('id', 'code', 'description')
   # Returns list of dicts — no model instantiation
   ```

**How it fits**: Every view in Admin3 uses QuerySets. The catalog views filter by active status. The search service chains filters for fuzzy matching. QuerySets are foundational to every endpoint.

---

### Session 3.2 — Query Optimisation: select_related and prefetch_related

**Topic**: Avoiding the N+1 query problem with eager loading.

**What it does**: `select_related()` performs a SQL `JOIN` to fetch related objects in one query. `prefetch_related()` runs a separate query per relationship and joins results in Python.

**The problem it solves**: Accessing FK fields while iterating through objects causes one query per object — the N+1 problem. A page listing 50 products with their subjects fires 51 queries instead of 2.

**Visual FoxPro comparison**: VFP developers faced the same problem. Looping through a result set and calling `SEEK` for each related record was slow. The fix was `SET RELATION TO` or a SQL `JOIN`. Django's `select_related` is the equivalent of an explicit `JOIN`.

**Step-by-step (from Admin3)**:

1. Without optimisation (N+1 problem):
   ```python
   # BAD: 1 query for products + 1 query per product for subject
   for product in Product.objects.all()[:50]:
       print(product.exam_session_subject.subject.code)
   # Total: 51 queries
   ```

2. With `select_related` (FK joins):
   ```python
   # GOOD: 1 query with JOINs
   products = Product.objects.select_related(
       'exam_session_subject',
       'exam_session_subject__subject',
       'exam_session_subject__exam_session',
       'product_product_variation',
   ).all()[:50]

   for product in products:
       print(product.exam_session_subject.subject.code)
   # Total: 1 query
   ```

3. With `prefetch_related` (reverse FK / M2M):
   ```python
   # Prefetch bundle products for each bundle
   bundles = Bundle.objects.prefetch_related(
       'bundle_products',
       'bundle_products__product',
   ).filter(is_active=True)
   ```

4. Real usage in Admin3 — the cart view:
   ```python
   # cart/views.py
   ppv = ProductProductVariation.objects.select_related(
       'product_variation'
   ).get(id=metadata.get('variationId'))
   ```

**How it fits**: Admin3's store products chain across 4-5 FK relationships. Without `select_related`, listing products or rendering the cart fires hundreds of queries. Every ViewSet in Admin3 uses one or both methods.

---

## Module 4: Serializers — Shaping API Responses

### Session 4.1 — ModelSerializer Basics

**Topic**: Serializers convert Django model instances to JSON (and back).

**What it does**: `ModelSerializer` inspects a model and auto-generates fields for serialisation. You control which fields to include, which are read-only, and how related data appears.

**The problem it solves**: Manually converting model instances to dictionaries is tedious and inconsistent. Serializers standardise input validation, output formatting, and nested object handling.

**Visual FoxPro comparison**: VFP had no built-in serialisation. Converting a cursor to XML required `CURSORTOXML()`, and VFP lacked native JSON support. Developers wrote custom functions to loop through fields and build strings. Django REST Framework serializers handle this automatically.

**Step-by-step (from Admin3)**:

1. Basic ModelSerializer:
   ```python
   # catalog/serializers/subject_serializers.py
   from rest_framework import serializers
   from catalog.models import Subject

   class SubjectSerializer(serializers.ModelSerializer):
       name = serializers.CharField(source='description', read_only=True)

       class Meta:
           model = Subject
           fields = ['id', 'code', 'description', 'name']
   ```
   - `source='description'` aliases the `description` field as `name` for the frontend.
   - `read_only=True` means this field appears in responses but the serializer ignores it in requests.

2. Read-only timestamps:
   ```python
   # catalog/serializers/exam_session_serializers.py
   class ExamSessionSerializer(serializers.ModelSerializer):
       class Meta:
           model = ExamSession
           fields = ['id', 'session_code', 'start_date', 'end_date',
                     'create_date', 'modified_date']
           read_only_fields = ['create_date', 'modified_date']
   ```

3. Nested FK access via `source`:
   ```python
   # store/serializers/product.py
   class ProductSerializer(serializers.ModelSerializer):
       subject_code = serializers.CharField(
           source='exam_session_subject.subject.code',
           read_only=True
       )
       session_code = serializers.CharField(
           source='exam_session_subject.exam_session.session_code',
           read_only=True
       )
   ```
   The dotted `source` path traverses FK relationships — no extra query if you used `select_related` in the view.

**How it fits**: Every API endpoint in Admin3 uses serializers. The frontend receives clean JSON shaped by serializers, not raw database rows.

---

### Session 4.2 — SerializerMethodField and Computed Properties

**Topic**: Adding computed or conditional fields to API responses.

**What it does**: `SerializerMethodField` calls a method on the serializer to compute a value at serialisation time. Use it when the value depends on logic, not a model field.

**The problem it solves**: Some API responses need derived data — product types computed from group names, net amounts calculated from price and quantity, or conditional values based on item type. A simple `source` path cannot express these.

**Visual FoxPro comparison**: In VFP reports and grids, computed columns used expressions like `IIF(product_type = 'M', 'Material', 'Tutorial')`. `SerializerMethodField` serves the same purpose in a structured, testable Python method.

**Step-by-step (from Admin3)**:

1. Computing product type from related data:
   ```python
   # catalog/serializers/product_serializers.py
   class ProductSerializer(serializers.ModelSerializer):
       type = serializers.SerializerMethodField()

       def get_type(self, obj):
           group_names = [group.name for group in obj.groups.all()]
           if 'Tutorial' in group_names:
               return 'Tutorial'
           elif 'Marking' in group_names:
               return 'Markings'
           return 'Material'
   ```

2. Conditional field based on item type:
   ```python
   # cart/serializers.py
   class CartItemSerializer(serializers.ModelSerializer):
       subject_code = serializers.SerializerMethodField()

       def get_subject_code(self, obj):
           if obj.item_type == 'marking_voucher':
               return None
           if obj.product:
               return obj.product.exam_session_subject.subject.code
           return None
   ```

3. Calculated value:
   ```python
   # cart/serializers.py
   net_amount = serializers.SerializerMethodField()

   def get_net_amount(self, obj):
       from decimal import Decimal
       return (obj.actual_price or Decimal('0.00')) * obj.quantity
   ```

**How it fits**: Admin3's cart serializer uses several `SerializerMethodField` instances to flatten deeply nested FK data into a simple, frontend-friendly structure. The product type classification drives UI rendering decisions.

---

## Module 5: Views — The API Layer

### Session 5.1 — ViewSets and Routers

**Topic**: ViewSets group related API actions (list, create, retrieve, update, delete) into one class.

**What it does**: A `ModelViewSet` provides all five CRUD actions out of the box. A `ViewSet` gives you a blank slate for custom actions. Routers auto-generate URL patterns from ViewSets.

**The problem it solves**: Without ViewSets, each action (list products, get one product, create product) needs a separate view and URL. ViewSets collapse five view functions and five URL patterns into one class and one router registration.

**Visual FoxPro comparison**: VFP had no equivalent. Each form or menu item was a separate `.scx` or `.mpr` file. The closest analogy is a VFP class with `DoList`, `DoGet`, `DoSave`, and `DoDelete` methods — but Django's ViewSets also handle HTTP method routing, permissions, and serialisation automatically.

**Step-by-step (from Admin3)**:

1. ModelViewSet — CRUD with one class:
   ```python
   # catalog/views/exam_session_views.py
   from rest_framework import viewsets
   from catalog.models import ExamSession
   from catalog.serializers import ExamSessionSerializer

   class ExamSessionViewSet(viewsets.ModelViewSet):
       queryset = ExamSession.objects.all().order_by('-start_date')
       serializer_class = ExamSessionSerializer
   ```
   This single class handles:
   - `GET /api/catalog/exam-sessions/` → list
   - `GET /api/catalog/exam-sessions/1/` → retrieve
   - `POST /api/catalog/exam-sessions/` → create
   - `PUT /api/catalog/exam-sessions/1/` → update
   - `DELETE /api/catalog/exam-sessions/1/` → destroy

2. Register with a router:
   ```python
   # catalog/urls.py
   from rest_framework.routers import DefaultRouter
   from catalog.views import ExamSessionViewSet

   router = DefaultRouter()
   router.register(r'exam-sessions', ExamSessionViewSet)

   urlpatterns = router.urls
   ```

3. Include in the project's URL config:
   ```python
   # django_Admin3/urls.py
   urlpatterns = [
       path('api/catalog/', include('catalog.urls')),
   ]
   ```
   Result: `GET /api/catalog/exam-sessions/` is now a working endpoint.

4. Dynamic filtering with `get_queryset()`:
   ```python
   # catalog/views/product_views.py
   class ProductViewSet(viewsets.ModelViewSet):
       def get_queryset(self):
           queryset = Product.objects.filter(is_active=True)
           group_id = self.request.query_params.get('group')
           if group_id:
               queryset = queryset.filter(groups__id=group_id)
           return queryset.distinct().order_by('shortname')
   ```

**How it fits**: Admin3 registers ViewSets for subjects, exam sessions, products, prices, bundles, and cart items. The router generates consistent URL patterns across all endpoints. The `get_queryset()` override enables server-side filtering with no extra code.

---

### Session 5.2 — Permissions and Authentication

**Topic**: Controlling who can access which endpoints.

**What it does**: Permission classes determine whether a request is allowed. Django REST Framework evaluates permissions before calling the view method. JWT (JSON Web Tokens) handles stateless authentication.

**The problem it solves**: Without access control, any user can modify or delete data. Permission classes enforce rules like "anyone can browse products, but only superusers can create them."

**Visual FoxPro comparison**: VFP applications typically used form-level security — hiding buttons or disabling menu items by user role. The underlying data had no protection; anyone with the `.dbf` file could open it directly. Django enforces permissions at the API layer, and JWT tokens ensure every request carries a verified identity.

**Step-by-step (from Admin3)**:

1. Global default — all endpoints require authentication:
   ```python
   # settings/base.py
   REST_FRAMEWORK = {
       'DEFAULT_PERMISSION_CLASSES': [
           'rest_framework.permissions.IsAuthenticated',
       ],
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework_simplejwt.authentication.JWTAuthentication',
       ],
   }
   ```

2. Action-based permissions — read is public, write requires superuser:
   ```python
   # catalog/views/exam_session_views.py
   from rest_framework.permissions import AllowAny
   from catalog.permissions import IsSuperUser

   class ExamSessionViewSet(viewsets.ModelViewSet):
       def get_permissions(self):
           if self.action in ['list', 'retrieve']:
               return [AllowAny()]
           return [IsSuperUser()]
   ```

3. Custom permission class:
   ```python
   # catalog/permissions.py
   from rest_framework.permissions import BasePermission

   class IsSuperUser(BasePermission):
       def has_permission(self, request, view):
           return bool(request.user and request.user.is_superuser)
   ```

4. JWT authentication flow:
   ```python
   # core_auth/views.py
   from rest_framework_simplejwt.tokens import RefreshToken

   @action(detail=False, methods=['post'])
   def login(self, request):
       user = authenticate(username=username, password=password)
       if user:
           refresh = RefreshToken.for_user(user)
           return Response({
               'token': str(refresh.access_token),
               'refresh': str(refresh),
           })
   ```

5. JWT settings:
   ```python
   # settings/base.py
   SIMPLE_JWT = {
       'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
       'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
   }
   ```

**How it fits**: Admin3's product browsing is public (`AllowAny`). Adding items to the cart works for guests (session-based) and authenticated users (JWT). Creating or modifying catalog data requires superuser privileges. The frontend stores JWT tokens and includes them in API headers.

---

### Session 5.3 — Custom Actions and Function-Based Views

**Topic**: Extending ViewSets with custom endpoints and standalone view functions.

**What it does**: The `@action` decorator adds custom URL endpoints to a ViewSet. For simple endpoints, `@api_view` creates a standalone function-based view.

**The problem it solves**: Standard CRUD covers only five actions. A "merge guest cart into user cart on login" action, a "bulk import subjects from CSV" operation, or a "health check" endpoint falls outside the list/create/retrieve/update/delete pattern.

**Visual FoxPro comparison**: VFP added custom buttons to forms — "Print Report", "Import Data", "Merge Records." These were custom methods on form classes. Django's `@action` decorator serves the same purpose but routes to a URL endpoint instead of a button click.

**Step-by-step (from Admin3)**:

1. Custom action on a ViewSet:
   ```python
   # core_auth/views.py
   class AuthViewSet(viewsets.ViewSet):
       permission_classes = [AllowAny]

       @action(detail=False, methods=['post'])
       def login(self, request):
           # Custom login logic...
           return Response({'token': '...'})

       @action(detail=False, methods=['post'])
       def register(self, request):
           # Custom registration logic...
           return Response({'user': '...'})
   ```
   - `detail=False` — The action applies to the collection (`/api/auth/login/`), not a single object.
   - `detail=True` — The action applies to one object (`/api/products/5/bundle-contents/`).

2. Standalone function-based view:
   ```python
   # utils/health_check.py
   from rest_framework.decorators import api_view, permission_classes
   from rest_framework.permissions import AllowAny
   from rest_framework.response import Response

   @api_view(['GET'])
   @permission_classes([AllowAny])
   def health_check(request):
       return Response({'status': 'healthy'})
   ```

3. Registering in URLs:
   ```python
   # django_Admin3/urls.py
   from utils.health_check import health_check

   urlpatterns = [
       path('api/health/', health_check, name='health_check'),
   ]
   ```

**How it fits**: Admin3 uses custom actions for authentication (login, register, refresh), cart operations (merge, calculate VAT), catalog imports (bulk import), and rules engine execution. Railway's deployment monitoring uses the health check endpoint.

---

## Module 6: URL Routing

### Session 6.1 — URL Configuration and the include() Pattern

**Topic**: How Django routes incoming HTTP requests to the correct view.

**What it does**: The root `urls.py` defines URL patterns. Each pattern maps a path prefix to an app's URL configuration using `include()`. The app's `urls.py` maps specific paths to views or routers.

**The problem it solves**: Centralising all URL definitions in one file becomes unmanageable at scale. The `include()` pattern lets each app own its URL namespace; the root file simply delegates.

**Visual FoxPro comparison**: VFP used a main menu (`.mpr`) that dispatched to forms. Each form handled its own events. Django's URL routing is similar — the root `urls.py` is the main menu, and each app's `urls.py` is the form. But unlike VFP menus, URL routing matches patterns on the request path.

**Step-by-step (from Admin3)**:

1. Root URL configuration:
   ```python
   # django_Admin3/urls.py
   from django.urls import path, include

   urlpatterns = [
       path('admin/', admin.site.urls),
       path('api/health/', health_check),
       path('api/auth/', include('core_auth.urls')),
       path('api/catalog/', include('catalog.urls')),
       path('api/store/', include('store.urls')),
       path('api/cart/', include('cart.urls')),
       path('api/rules/', include('rules_engine.urls')),
       path('api/search/', include('search.urls')),
   ]
   ```

2. App-level URL configuration with router:
   ```python
   # catalog/urls.py
   from rest_framework.routers import DefaultRouter
   from .views import SubjectViewSet, ExamSessionViewSet, ProductViewSet

   router = DefaultRouter()
   router.register(r'subjects', SubjectViewSet)
   router.register(r'exam-sessions', ExamSessionViewSet)
   router.register(r'products', ProductViewSet)

   urlpatterns = router.urls
   ```

3. Resulting endpoint map:
   ```
   /api/catalog/subjects/           → SubjectViewSet.list
   /api/catalog/subjects/1/         → SubjectViewSet.retrieve
   /api/catalog/exam-sessions/      → ExamSessionViewSet.list
   /api/catalog/products/           → ProductViewSet.list
   /api/store/products/             → store.ProductViewSet.list
   /api/cart/                       → CartViewSet actions
   /api/auth/login/                 → AuthViewSet.login
   ```

**How it fits**: Admin3 serves 10+ API namespaces. Each app registers its own routes. Adding a new app means creating its `urls.py`, registering ViewSets, and adding one `include()` line to the root.

---

## Module 7: Django Admin

### Session 7.1 — The Django Admin Interface

**Topic**: Django's built-in administration interface for managing data.

**What it does**: Django Admin auto-generates a web-based CRUD interface from your models. Staff users can browse, search, create, and edit records without custom frontend code.

**The problem it solves**: Building an admin interface from scratch takes significant time. Django Admin provides one for free — with search, filtering, pagination, and inline editing — minutes after you register a model.

**Visual FoxPro comparison**: VFP developers built custom data entry forms for every table. The BROWSE command provided a raw grid view unsuitable for end users. Django Admin resembles a polished VFP form — with search fields, filter panels, and validation — generated automatically from model definitions.

**Step-by-step (from Admin3)**:

1. Register a model:
   ```python
   # catalog/admin.py
   from django.contrib import admin
   from catalog.models import Subject

   @admin.register(Subject)
   class SubjectAdmin(admin.ModelAdmin):
       list_display = ('code', 'description', 'active')
       list_filter = ('active',)
       search_fields = ('code', 'description')
   ```

2. Access at `http://127.0.0.1:8888/admin/`

3. Create a superuser:
   ```powershell
   python manage.py createsuperuser
   ```

4. Key `ModelAdmin` options:
   - `list_display` — Columns shown in the list view
   - `list_filter` — Filter sidebar
   - `search_fields` — Search bar
   - `readonly_fields` — Fields that cannot be edited
   - `ordering` — Default sort order

**How it fits**: Admin3 uses Django Admin for managing catalog data, rules engine configuration, email templates, and user accounts. Staff users configure business rules and message templates through the admin interface without developer help.

---

## Module 8: Services and Business Logic

### Session 8.1 — The Service Layer Pattern

**Topic**: Separating complex business logic from views and models into dedicated service classes.

**What it does**: Service classes encapsulate multi-step operations — VAT calculation, email sending, rule execution — that span multiple models or external systems.

**The problem it solves**: Fat views (views exceeding 200 lines of business logic) are hard to test, reuse, and maintain. Extracting logic into services focuses each layer: views handle HTTP, models handle data, services handle orchestration.

**Visual FoxPro comparison**: VFP's closest equivalent was business logic classes (`.vcx`) or procedure files (`.prg`). Without a clear convention, logic ended up in form event handlers. Django's service layer convention — a `services/` directory per app — provides a consistent home for business logic.

**Step-by-step (from Admin3)**:

1. Service class structure:
   ```python
   # cart/services/vat_orchestrator.py
   class VATCalculationService:
       def calculate_vat_for_cart(self, country_code, cart_items):
           """Calculate VAT for all items in a cart."""
           # 1. Determine VAT region from country code
           # 2. Look up VAT rates via rules engine
           # 3. Apply rates to each cart item
           # 4. Return totals
   ```

2. Using the service in a view:
   ```python
   # cart/views.py
   from cart.services.vat_orchestrator import VATCalculationService

   vat_service = VATCalculationService()
   result = vat_service.calculate_vat_for_cart(
       country_code='GB',
       cart_items=cart.items.all()
   )
   ```

3. Email service — queueing and sending:
   ```python
   # email_system/services/email_service.py
   class EmailService:
       def send_account_activation(self, user_email, activation_data):
           """Queue activation email for async delivery."""

       def send_order_confirmation(self, user_email, order_data):
           """Queue order confirmation email."""
   ```

4. Wrapping multi-model operations in transactions:
   ```python
   from django.db import transaction

   @transaction.atomic
   def register_user(data):
       user = User.objects.create_user(...)
       Student.objects.create(user=user)
       email_service.send_activation(user)
       # If any step fails, all changes roll back
   ```

**How it fits**: Admin3's cart app uses `VATCalculationService` for tax calculations, the auth flow uses `EmailService` for activation emails, and the rules engine has its own service layer for rule evaluation. Each service is independently testable.

---

## Module 9: Management Commands

### Session 9.1 — Custom Management Commands

**Topic**: Building CLI tools that run within the Django framework.

**What it does**: Management commands extend `python manage.py` with custom operations — data imports, cache cleanup, email queue processing. They run with full access to Django's ORM, settings, and services.

**The problem it solves**: Scheduled jobs, data migrations, and operational tasks need the Django environment. Scripts that manually import Django settings and models are fragile. Management commands run inside the framework and follow a consistent pattern.

**Visual FoxPro comparison**: VFP used standalone `.prg` programs or scheduled tasks that opened the application headlessly. These required manual path setup, database connections, and error handling. Django management commands provide all of that automatically — the ORM, database connection, and logging are already configured.

**Step-by-step (from Admin3)**:

1. Command file location:
   ```
   catalog/
   └── management/
       └── commands/
           └── import_subjects.py
   ```

2. Command structure:
   ```python
   from django.core.management.base import BaseCommand
   from django.db import transaction

   class Command(BaseCommand):
       help = 'Import subjects from a CSV file'

       def add_arguments(self, parser):
           parser.add_argument('file_path', type=str)
           parser.add_argument('--dry-run', action='store_true')
           parser.add_argument('--update-existing', action='store_true')

       def handle(self, *args, **options):
           dry_run = options.get('dry_run', False)
           try:
               with transaction.atomic():
                   # Import logic here...
                   if dry_run:
                       self.stdout.write('Dry run — no changes saved.')
                       transaction.set_rollback(True)
           except Exception as e:
               self.stderr.write(self.style.ERROR(f'Failed: {e}'))
   ```

3. Running the command:
   ```powershell
   python manage.py import_subjects subjects.csv --dry-run
   python manage.py import_subjects subjects.csv --update-existing
   ```

4. Other Admin3 management commands:
   ```powershell
   python manage.py process_email_queue     # Process queued emails
   python manage.py clear_rules_cache       # Clear rules cache
   python manage.py sync_course_templates   # Sync with external API
   ```

**How it fits**: Admin3 uses management commands for data imports, email processing, cache management, and external API synchronisation. They run as scheduled tasks in production and as developer tools locally.

---

## Module 10: Testing

### Session 10.1 — Writing Django Tests (TDD)

**Topic**: Test-Driven Development with Django's test framework.

**What it does**: Django's `TestCase` provides a test database, transaction rollback per test, and assertion helpers. DRF's `APITestCase` adds request simulation for API endpoint testing.

**The problem it solves**: Untested code accumulates bugs. Manual testing is slow and unrepeatable. Automated tests catch regressions immediately and serve as living documentation of expected behaviour.

**Visual FoxPro comparison**: VFP had no built-in test framework. Testing meant running the application, clicking through forms, and visually verifying output. Django's test framework runs hundreds of tests in seconds, reports failures with detailed diffs, and integrates with CI/CD pipelines.

**Step-by-step (from Admin3)**:

1. Model test:
   ```python
   # catalog/tests/test_models.py
   from django.test import TestCase
   from catalog.models import Subject

   class SubjectModelTest(TestCase):
       def setUp(self):
           self.subject = Subject.objects.create(
               code='CM2',
               description='Financial Mathematics'
           )

       def test_str_representation(self):
           self.assertEqual(str(self.subject), 'CM2 - Financial Mathematics')

       def test_unique_code_constraint(self):
           from django.db import IntegrityError
           with self.assertRaises(IntegrityError):
               Subject.objects.create(code='CM2', description='Duplicate')
   ```

2. API test:
   ```python
   # catalog/tests/test_api.py
   from rest_framework.test import APITestCase

   class SubjectAPITest(APITestCase):
       def setUp(self):
           Subject.objects.create(code='CM2', description='Financial Maths')

       def test_list_subjects(self):
           response = self.client.get('/api/catalog/subjects/')
           self.assertEqual(response.status_code, 200)
           self.assertEqual(len(response.data), 1)

       def test_create_requires_auth(self):
           response = self.client.post('/api/catalog/subjects/', {
               'code': 'SA1', 'description': 'Actuarial Statistics'
           })
           self.assertEqual(response.status_code, 403)
   ```

3. Cart constraint test:
   ```python
   # cart/tests/test_models.py
   class CartConstraintTest(TestCase):
       def test_unique_cart_per_user(self):
           user = User.objects.create_user('test', 'test@test.com', 'pass')
           Cart.objects.create(user=user)
           with self.assertRaises(IntegrityError):
               Cart.objects.create(user=user)
   ```

4. Running tests:
   ```powershell
   python manage.py test                        # All tests
   python manage.py test catalog.tests           # One app
   python manage.py test catalog.tests.test_models  # One module
   ```

**How it fits**: Admin3 follows TDD — tests precede implementation. The test suite covers models, serializers, API endpoints, and business logic. CI/CD runs the full suite on every push.

---

## Module 11: Middleware and Request/Response Cycle

### Session 11.1 — Middleware: Processing Requests and Responses

**Topic**: Middleware classes that intercept every request before it reaches a view and every response before it reaches the client.

**What it does**: Middleware runs code before and after views execute. CORS headers, CSRF protection, authentication, and session management all happen in middleware.

**The problem it solves**: Cross-cutting concerns — logging, security headers, authentication — should appear once, not duplicated in every view. Middleware applies them globally.

**Visual FoxPro comparison**: VFP had no middleware concept. Developers handled cross-cutting concerns by calling common functions at the top of every form's `Init` method. Forgetting the security check in one form left that form unprotected. Django middleware runs automatically for every request.

**Step-by-step (from Admin3)**:

1. Middleware stack in `settings/base.py`:
   ```python
   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',
       'django.middleware.security.SecurityMiddleware',
       'django.contrib.sessions.middleware.SessionMiddleware',
       'django.middleware.common.CommonMiddleware',
       'django.middleware.csrf.CsrfViewMiddleware',
       'django.contrib.auth.middleware.AuthenticationMiddleware',
       'django.contrib.messages.middleware.MessageMiddleware',
       'django.middleware.clickjacking.XFrameOptionsMiddleware',
   ]
   ```
   Order matters — CORS must run first to add headers before other middleware processes the request.

2. Custom middleware — Health check SSL bypass:
   ```python
   # utils/middleware.py
   from django.utils.deprecation import MiddlewareMixin

   class HealthCheckMiddleware(MiddlewareMixin):
       def process_request(self, request):
           if request.path == '/api/health/':
               request.META['HTTP_X_FORWARDED_PROTO'] = 'https'
           return None
   ```
   Railway's health check uses HTTP, but `SECURE_SSL_REDIRECT=True` rejects HTTP requests. This middleware fakes the HTTPS header for the health endpoint only.

3. Request lifecycle:
   ```
   Client → CORS → Security → Session → CSRF → Auth → View → Response
   ```

**How it fits**: Admin3's middleware stack handles CORS (React frontend on a different port), CSRF protection, session management for guest carts, and JWT authentication. The custom health check middleware ensures Railway deployments pass health checks without disabling SSL globally.

---

## Module 12: Caching and Performance

### Session 12.1 — Caching API Responses

**Topic**: Storing frequently accessed data in memory to reduce database queries.

**What it does**: Django's cache framework stores results in memory (or Redis). Subsequent requests read from cache instead of querying the database.

**The problem it solves**: The subjects list rarely changes, yet every page load queries it. Caching stores the result for 5 minutes, cutting database load by 99% for that endpoint.

**Visual FoxPro comparison**: VFP developers cached data in public arrays or custom collection classes held in memory. The challenge was invalidation — knowing when to refresh stale data. Django's cache framework handles expiration automatically with TTL (time-to-live).

**Step-by-step (from Admin3)**:

1. Cache in a ViewSet:
   ```python
   from django.core.cache import cache

   class SubjectViewSet(viewsets.ModelViewSet):
       def list(self, request):
           cache_key = 'subjects_list_v1'
           cached_data = cache.get(cache_key)
           if cached_data:
               return Response(cached_data)

           subjects = Subject.objects.filter(active=True).values(
               'id', 'code', 'description'
           )
           result = list(subjects)
           cache.set(cache_key, result, timeout=300)  # 5 minutes
           return Response(result)
   ```

2. Cache invalidation — clear when data changes:
   ```python
   def create(self, request, *args, **kwargs):
       response = super().create(request, *args, **kwargs)
       cache.delete('subjects_list_v1')
       return response
   ```

3. Navigation data caching — the catalog navigation endpoint combines subjects, products, and exam sessions into one cached response for performance.

**How it fits**: Admin3 caches subject lists, navigation menus, and filter configurations. These datasets change infrequently but load on every page.

---

## Module 13: Real-World Patterns

### Session 13.1 — The Strangler Fig Migration Pattern

**Topic**: Incrementally replacing legacy code without breaking existing functionality.

**What it does**: New code lives alongside old code. The old code delegates to the new code with deprecation warnings. Over time, callers migrate to the new endpoints, and the team removes the old code.

**The problem it solves**: Rewriting an entire system at once is risky and slow. The Strangler Fig pattern lets you migrate one piece at a time while the old system keeps working.

**Visual FoxPro comparison**: Migrating from VFP to a web application faces the same challenge — you cannot rewrite everything at once. The Strangler Fig approach is exactly how Admin3 migrated from VFP-era database patterns to Django: one app at a time, with backward-compatible wrappers during the transition.

**Step-by-step (from Admin3)**:

1. Legacy app delegates to new app:
   ```python
   # products/views.py (legacy — delegates to catalog)
   import warnings
   from catalog.views import ProductViewSet as CatalogProductViewSet

   class ProductViewSet(CatalogProductViewSet):
       def list(self, request, *args, **kwargs):
           warnings.warn(
               "products.ProductViewSet is deprecated. Use catalog.ProductViewSet.",
               DeprecationWarning
           )
           return super().list(request, *args, **kwargs)
   ```

2. Legacy URL still works:
   ```python
   # Old: /api/products/  → products.ProductViewSet (delegates to catalog)
   # New: /api/catalog/products/  → catalog.ProductViewSet (direct)
   ```

3. Store products provide backward-compatible properties:
   ```python
   # store/models/product.py
   @property
   def product(self):
       """Old cart code calls item.product.product — this still works."""
       return self.product_product_variation.product
   ```

4. Migration order in Admin3:
   - Phase 1: Create `catalog` app with new models
   - Phase 2: Migrate data from legacy tables
   - Phase 3: Convert legacy apps to thin wrappers
   - Phase 4: Remove legacy apps (after all callers update)

**How it fits**: Admin3's `catalog` and `store` apps replaced five legacy apps (`subjects`, `exam_sessions`, `products`, `exam_sessions_subjects`, `exam_sessions_subjects_products`). The legacy apps still exist as thin wrappers, ensuring the frontend works during the transition.

---

### Session 13.2 — JSONField and the Rules Engine

**Topic**: Using PostgreSQL JSONB fields for flexible, schema-less data storage within Django models.

**What it does**: `JSONField` stores structured JSON data in a PostgreSQL `JSONB` column. You can query, index, and filter JSON contents directly through the ORM.

**The problem it solves**: Some data structures change frequently or vary per record — rule conditions, VAT calculation results, template content. Adding separate columns for each possible field produces wide, sparse tables. JSON fields store variable structures without schema changes.

**Visual FoxPro comparison**: VFP had memo fields (`.fpt`) for storing free-form text, but they were unstructured and unsearchable. PostgreSQL JSONB is structured, indexable, and queryable — a document database inside your relational database.

**Step-by-step (from Admin3)**:

1. Rules stored as JSONB:
   ```python
   # rules_engine/models/acted_rule.py
   class ActedRule(models.Model):
       condition = models.JSONField(help_text="JSONLogic expression")
       actions = models.JSONField(help_text="Array of action definitions")
   ```

2. Example rule condition:
   ```json
   {
     "==": [{"var": "user.region"}, "EU"]
   }
   ```

3. Cart VAT results as JSONB:
   ```python
   # cart/models.py
   class Cart(models.Model):
       vat_result = models.JSONField(null=True, blank=True)
   ```
   This stores the entire VAT calculation output — rates, amounts, region, timestamp — in a single field.

4. Querying JSON fields:
   ```python
   # Filter rules by entry point (stored in JSONB)
   rules = ActedRule.objects.filter(
       entry_point='checkout_terms',
       active=True
   ).order_by('priority')
   ```

**How it fits**: Admin3's rules engine stores business rules, conditions, and actions as JSONB. Staff create and modify rules through Django Admin without database migrations. The cart stores VAT calculation snapshots for audit. Message templates store content structure as JSON for the React frontend to render.

---

## Module 14: Deployment and DevOps

### Session 14.1 — CORS, CSRF, and the Frontend Connection

**Topic**: Configuring Django to serve API requests from a React frontend on a different port.

**What it does**: CORS (Cross-Origin Resource Sharing) headers tell the browser which domains can call your API. CSRF (Cross-Site Request Forgery) protection prevents malicious sites from submitting forms on behalf of authenticated users.

**The problem it solves**: Browsers block requests from `localhost:3000` (React) to `localhost:8888` (Django) because the origins differ. Without CORS headers, the frontend cannot reach the backend.

**Visual FoxPro comparison**: VFP applications were monolithic — frontend and backend ran in the same process. CORS did not exist because there was no HTTP boundary. Web applications separate frontend and backend, requiring explicit permission for cross-origin requests.

**Step-by-step (from Admin3)**:

1. CORS configuration:
   ```python
   # settings/base.py
   CORS_ALLOWED_ORIGINS = [
       f"http://127.0.0.1:{FRONTEND_PORT}",
       f"http://127.0.0.1:{BACKEND_PORT}",
   ]
   CORS_ALLOW_CREDENTIALS = True
   ```

2. CORS middleware must be first:
   ```python
   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',  # Must be first
       # ...
   ]
   ```

3. CSRF token endpoint for session-based operations:
   ```python
   # core_auth/views.py
   @action(detail=False, methods=['get'])
   def csrf(self, request):
       csrf_token = get_token(request)
       return Response({'csrfToken': csrf_token})
   ```

4. Running both servers:
   ```powershell
   # Terminal 1: Django backend
   python manage.py runserver 127.0.0.1:8888

   # Terminal 2: React frontend
   cd frontend/react-Admin3
   npm start
   # Runs on 127.0.0.1:3000
   ```

**How it fits**: Admin3's React frontend runs on port 3000 and calls the Django API on port 8888. CORS headers permit this cross-origin communication. JWT tokens handle authentication for API calls, while CSRF protection covers session-based operations like the initial login.

---

## Appendix A: Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| Start server | `python manage.py runserver 8888` |
| Create migrations | `python manage.py makemigrations` |
| Apply migrations | `python manage.py migrate` |
| Run tests | `python manage.py test` |
| Create superuser | `python manage.py createsuperuser` |
| Django shell | `python manage.py shell` |
| Create new app | `python manage.py startapp myapp` |
| Check migrations | `python manage.py showmigrations` |
| Preview SQL | `python manage.py sqlmigrate app_name 0001` |

### Admin3 App Map

| App | Purpose | Key Models |
|-----|---------|------------|
| `catalog` | Master data | Subject, ExamSession, Product, ProductVariation |
| `store` | Purchasable items | Product, Price, Bundle, BundleProduct |
| `cart` | Shopping cart | Cart, CartItem |
| `core_auth` | Authentication | (uses Django User) |
| `rules_engine` | Business rules | ActedRule, ActedRulesFields, MessageTemplate |
| `email_system` | Email queue | EmailTemplate, EmailQueue, EmailLog |
| `filtering` | Product filters | FilterGroup, FilterConfiguration |
| `search` | Product search | (service layer, no models) |
| `users` | User profiles | UserProfile |
| `students` | Student records | Student |

### Homework Exercises

After each module, build the corresponding component in the `django_estore_training` project using the `ACTEDDBTRAIN01` database:

1. **Module 2**: Create a `catalog` app with `Subject` and `ExamSession` models. Run migrations.
2. **Module 2**: Create an `ExamSessionSubject` junction model with FK relationships and unique constraints.
3. **Module 4**: Write serializers for Subject and ExamSession.
4. **Module 5**: Create ViewSets with public read and restricted write permissions.
5. **Module 6**: Wire up URL routing with a router.
6. **Module 7**: Register models in Django Admin.
7. **Module 9**: Write a management command to import subjects from a CSV file.
8. **Module 10**: Write tests for models and API endpoints.
