https://docs.djangoproject.com/en/5.1/ref/contrib/auth/#django.contrib.auth.models.User

https://www.django-rest-framework.org/tutorial/quickstart/

Django CORS headers documentation: <https://github.com/adamchainz/django-cors-headers>
Django CSRF documentation: <https://docs.djangoproject.com/en/stable/ref/csrf/>
Django authentication documentation: <https://docs.djangoproject.com/en/stable/topics/auth/>
https://axios-http.com/docs/interceptors

python manage.py startapp sessions
python manage.py show_urls

## Performance Optimization

### Database Query Optimization
- Use select_related() for foreign key relationships
- Use prefetch_related() for many-to-many and reverse foreign key relationships
- Use Q objects for complex queries
- Add database indexes for frequently queried fields

### Caching Implementation
- Django cache framework with Redis/Memcached backend
- Cache expensive query results for 5-30 minutes
- Use cache keys that reflect query parameters
- Clear cache when data changes

### API Optimization Patterns
```python
# Optimized queryset with relationships
queryset = Model.objects.select_related(
    'foreign_key_field'
).prefetch_related(
    'many_to_many_field',
    'reverse_foreign_key_set'
)

# Caching expensive operations
cache_key = f'data_{hash(str(params))}'
cached_result = cache.get(cache_key)
if not cached_result:
    cached_result = expensive_operation()
    cache.set(cache_key, cached_result, 600)  # 10 minutes
```

### Performance Commands
```bash
# Monitor database queries
python manage.py shell
from django.db import connection
print(connection.queries)

# Clear cache
python manage.py shell
from django.core.cache import cache
cache.clear()
```
