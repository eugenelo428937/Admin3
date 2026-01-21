# Analytics Dashboard Queries - Postcoder.com Address Lookup

This document provides ready-to-use SQL queries, Django ORM equivalents, and dashboard integration examples for monitoring the Postcoder.com address lookup integration.

---

## Table of Contents

1. [Core Analytics Queries](#core-analytics-queries)
2. [Django ORM Equivalents](#django-orm-equivalents)
3. [Dashboard Integration](#dashboard-integration)
4. [Query Optimization](#query-optimization)
5. [Scheduled Reports](#scheduled-reports)
6. [Grafana Dashboard Examples](#grafana-dashboard-examples)

---

## Core Analytics Queries

### 1. Average Response Time by Cache Status

**Purpose:** Monitor performance difference between cache hits and misses.

**SQL Query:**
```sql
-- Average response time over last 24 hours
SELECT
  cache_hit,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms,
  ROUND(MIN(response_time_ms), 2) as min_response_ms,
  ROUND(MAX(response_time_ms), 2) as max_response_ms,
  COUNT(*) as request_count
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '24 hours'
  AND success = true
GROUP BY cache_hit
ORDER BY cache_hit DESC;
```

**Expected Output:**
```
 cache_hit | avg_response_ms | min_response_ms | max_response_ms | request_count
-----------+-----------------+-----------------+-----------------+---------------
 true      |           10.50 |            5.20 |           25.30 |           120
 false     |          280.00 |          150.00 |          450.00 |            80
```

**Alert Threshold:**
- Cache hit avg > 100ms → Warning
- Cache miss avg > 1000ms → Critical

---

### 2. Cache Hit Rate Over Time

**Purpose:** Track cache effectiveness over days/weeks.

**SQL Query (Daily):**
```sql
-- Cache hit rate per day over last 30 days
SELECT
  DATE(lookup_timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as cache_misses,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as hit_rate_percent
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '30 days'
  AND success = true
GROUP BY DATE(lookup_timestamp)
ORDER BY date DESC;
```

**Expected Output:**
```
    date    | total_requests | cache_hits | cache_misses | hit_rate_percent
------------+----------------+------------+--------------+------------------
 2025-11-05 |            250 |        110 |          140 |            44.00
 2025-11-04 |            320 |        128 |          192 |            40.00
 2025-11-03 |            180 |         63 |          117 |            35.00
```

**SQL Query (Hourly - for today):**
```sql
-- Cache hit rate per hour today
SELECT
  DATE_TRUNC('hour', lookup_timestamp) as hour,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as hit_rate_percent
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > CURRENT_DATE
  AND success = true
GROUP BY DATE_TRUNC('hour', lookup_timestamp)
ORDER BY hour DESC;
```

**Alert Threshold:**
- Hit rate < 30% after 30 days → Warning
- Hit rate < 20% after 60 days → Critical

---

### 3. Most Searched Postcodes

**Purpose:** Identify popular postcodes for cache warming strategies.

**SQL Query (Top 50):**
```sql
-- Top 50 most searched postcodes over last 7 days
SELECT
  postcode,
  COUNT(*) as search_count,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as hit_rate_percent,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '7 days'
  AND success = true
GROUP BY postcode
ORDER BY search_count DESC
LIMIT 50;
```

**Expected Output:**
```
 postcode | search_count | cache_hits | hit_rate_percent | avg_response_ms
----------+--------------+------------+------------------+-----------------
 SW1A1AA  |           45 |         42 |            93.33 |           15.20
 EC1A1BB  |           38 |         35 |            92.11 |           18.50
 M13NQ    |           32 |         28 |            87.50 |           22.00
```

**Use Case:** Pre-populate cache with top 100 postcodes to improve initial hit rate.

---

### 4. Error Rate Analysis

**Purpose:** Monitor API failures and validation errors.

**SQL Query (Daily Error Rate):**
```sql
-- Error rate per day over last 30 days
SELECT
  DATE(lookup_timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
  ROUND(
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as error_rate_percent
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(lookup_timestamp)
ORDER BY date DESC;
```

**SQL Query (Error Breakdown):**
```sql
-- Error types over last 7 days
SELECT
  COALESCE(error_message, 'Unknown') as error_type,
  COUNT(*) as error_count,
  MIN(lookup_timestamp) as first_occurrence,
  MAX(lookup_timestamp) as last_occurrence
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '7 days'
  AND success = false
GROUP BY error_message
ORDER BY error_count DESC;
```

**Alert Threshold:**
- Error rate > 5% → Warning
- Error rate > 10% → Critical

---

### 5. API Usage and Cost Tracking

**Purpose:** Monitor API call volume for cost management.

**SQL Query (Daily API Calls):**
```sql
-- Daily API call count (cache misses) over last 30 days
SELECT
  DATE(lookup_timestamp) as date,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as from_cache,
  SUM(CASE WHEN NOT cache_hit AND success THEN 1 ELSE 0 END) as api_calls,
  ROUND(
    SUM(CASE WHEN NOT cache_hit AND success THEN 1 ELSE 0 END) * 0.003,
    2
  ) as daily_cost_gbp
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(lookup_timestamp)
ORDER BY date DESC;
```

**Expected Output:**
```
    date    | total_requests | from_cache | api_calls | daily_cost_gbp
------------+----------------+------------+-----------+----------------
 2025-11-05 |            250 |        110 |       138 |           0.41
 2025-11-04 |            320 |        128 |       190 |           0.57
 2025-11-03 |            180 |         63 |       116 |           0.35
```

**SQL Query (Monthly Summary):**
```sql
-- Monthly API usage and cost summary
SELECT
  DATE_TRUNC('month', lookup_timestamp) as month,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as from_cache,
  SUM(CASE WHEN NOT cache_hit AND success THEN 1 ELSE 0 END) as api_calls,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as cache_hit_rate,
  ROUND(
    SUM(CASE WHEN NOT cache_hit AND success THEN 1 ELSE 0 END) * 0.003,
    2
  ) as total_cost_gbp,
  ROUND(
    (COUNT(*) * 0.003) - (SUM(CASE WHEN NOT cache_hit AND success THEN 1 ELSE 0 END) * 0.003),
    2
  ) as savings_gbp
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', lookup_timestamp)
ORDER BY month DESC;
```

**Alert Threshold:**
- Monthly API calls exceed quota → Critical

---

### 6. Cache Efficiency Metrics

**Purpose:** Measure cache effectiveness and identify optimization opportunities.

**SQL Query (Cache Statistics):**
```sql
-- Comprehensive cache statistics
SELECT
  COUNT(*) as total_lookups,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END) as cache_misses,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as hit_rate_percent,
  ROUND(AVG(CASE WHEN cache_hit THEN response_time_ms END), 2) as avg_hit_time_ms,
  ROUND(AVG(CASE WHEN NOT cache_hit THEN response_time_ms END), 2) as avg_miss_time_ms,
  ROUND(
    AVG(CASE WHEN NOT cache_hit THEN response_time_ms END) /
    NULLIF(AVG(CASE WHEN cache_hit THEN response_time_ms END), 0),
    2
  ) as performance_improvement,
  COUNT(DISTINCT postcode) as unique_postcodes
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '7 days'
  AND success = true;
```

**Expected Output:**
```
 total_lookups | cache_hits | cache_misses | hit_rate_percent | avg_hit_time_ms | avg_miss_time_ms | performance_improvement | unique_postcodes
---------------+------------+--------------+------------------+-----------------+------------------+-------------------------+------------------
          1250 |        520 |          730 |            41.60 |           12.50 |           285.00 |                   22.80 |              890
```

---

### 7. Provider Comparison (Postcoder vs GetAddress.io)

**Purpose:** Compare performance between different address lookup providers.

**SQL Query:**
```sql
-- Compare Postcoder vs GetAddress.io (if both are tracked)
SELECT
  api_provider,
  COUNT(*) as total_requests,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(
    SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as success_rate_percent,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms,
  ROUND(MIN(response_time_ms), 2) as min_response_ms,
  ROUND(MAX(response_time_ms), 2) as max_response_ms,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as cache_hit_rate
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '7 days'
GROUP BY api_provider
ORDER BY api_provider;
```

**Expected Output:**
```
 api_provider | total_requests | successful | success_rate_percent | avg_response_ms | min_response_ms | max_response_ms | cache_hits | cache_hit_rate
--------------+----------------+------------+----------------------+-----------------+-----------------+-----------------+------------+----------------
 getaddress   |            450 |        442 |                98.22 |          245.00 |          150.00 |          420.00 |          0 |           0.00
 postcoder    |           1250 |       1238 |                99.04 |           85.50 |           10.00 |          380.00 |        520 |          41.60
```

---

### 8. Slowest Postcodes

**Purpose:** Identify postcodes with consistently slow response times.

**SQL Query:**
```sql
-- Top 20 slowest postcodes over last 7 days
SELECT
  postcode,
  COUNT(*) as lookup_count,
  ROUND(AVG(response_time_ms), 2) as avg_response_ms,
  ROUND(MAX(response_time_ms), 2) as max_response_ms,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as cache_hit_rate
FROM address_analytics_addresslookuplog
WHERE lookup_timestamp > NOW() - INTERVAL '7 days'
  AND success = true
GROUP BY postcode
HAVING COUNT(*) >= 5  -- At least 5 lookups
ORDER BY avg_response_ms DESC
LIMIT 20;
```

**Use Case:** Identify problematic postcodes that may need special handling or caching priority.

---

## Django ORM Equivalents

### 1. Average Response Time by Cache Status

```python
from django.db.models import Avg, Min, Max, Count, Q
from django.utils import timezone
from datetime import timedelta
from address_analytics.models import AddressLookupLog

# Average response time over last 24 hours
results = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(hours=24),
    success=True
).values('cache_hit').annotate(
    avg_response_ms=Avg('response_time_ms'),
    min_response_ms=Min('response_time_ms'),
    max_response_ms=Max('response_time_ms'),
    request_count=Count('id')
).order_by('-cache_hit')

# Example usage
for result in results:
    print(f"Cache Hit: {result['cache_hit']}")
    print(f"  Avg: {result['avg_response_ms']:.2f}ms")
    print(f"  Min: {result['min_response_ms']:.2f}ms")
    print(f"  Max: {result['max_response_ms']:.2f}ms")
    print(f"  Count: {result['request_count']}")
```

---

### 2. Cache Hit Rate Over Time

```python
from django.db.models import Count, Case, When, IntegerField, FloatField
from django.db.models.functions import TruncDate, TruncHour

# Daily cache hit rate over last 30 days
daily_stats = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=30),
    success=True
).annotate(
    date=TruncDate('lookup_timestamp')
).values('date').annotate(
    total_requests=Count('id'),
    cache_hits=Count('id', filter=Q(cache_hit=True)),
    cache_misses=Count('id', filter=Q(cache_hit=False)),
    hit_rate_percent=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
).order_by('-date')

# Hourly cache hit rate for today
hourly_stats = AddressLookupLog.objects.filter(
    lookup_timestamp__date=timezone.now().date(),
    success=True
).annotate(
    hour=TruncHour('lookup_timestamp')
).values('hour').annotate(
    total_requests=Count('id'),
    cache_hits=Count('id', filter=Q(cache_hit=True)),
    hit_rate_percent=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
).order_by('-hour')
```

---

### 3. Most Searched Postcodes

```python
# Top 50 most searched postcodes over last 7 days
top_postcodes = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=7),
    success=True
).values('postcode').annotate(
    search_count=Count('id'),
    cache_hits=Count('id', filter=Q(cache_hit=True)),
    hit_rate_percent=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
    avg_response_ms=Avg('response_time_ms')
).order_by('-search_count')[:50]

# Example: Get postcodes for cache warming
popular_postcodes = [item['postcode'] for item in top_postcodes[:100]]
```

---

### 4. Error Rate Analysis

```python
# Daily error rate over last 30 days
error_stats = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=30)
).annotate(
    date=TruncDate('lookup_timestamp')
).values('date').annotate(
    total_requests=Count('id'),
    successful=Count('id', filter=Q(success=True)),
    failed=Count('id', filter=Q(success=False)),
    error_rate_percent=100.0 * Count('id', filter=Q(success=False)) / Count('id')
).order_by('-date')

# Error breakdown by type
error_breakdown = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=7),
    success=False
).values('error_message').annotate(
    error_count=Count('id'),
    first_occurrence=Min('lookup_timestamp'),
    last_occurrence=Max('lookup_timestamp')
).order_by('-error_count')
```

---

### 5. API Usage and Cost Tracking

```python
from django.db.models import F, ExpressionWrapper, DecimalField

# Daily API call count over last 30 days
api_usage = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=30)
).annotate(
    date=TruncDate('lookup_timestamp')
).values('date').annotate(
    total_requests=Count('id'),
    from_cache=Count('id', filter=Q(cache_hit=True)),
    api_calls=Count('id', filter=Q(cache_hit=False, success=True)),
    daily_cost_gbp=ExpressionWrapper(
        Count('id', filter=Q(cache_hit=False, success=True)) * 0.003,
        output_field=DecimalField(max_digits=10, decimal_places=2)
    )
).order_by('-date')

# Monthly summary
from django.db.models.functions import TruncMonth

monthly_usage = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=365)
).annotate(
    month=TruncMonth('lookup_timestamp')
).values('month').annotate(
    total_requests=Count('id'),
    from_cache=Count('id', filter=Q(cache_hit=True)),
    api_calls=Count('id', filter=Q(cache_hit=False, success=True)),
    cache_hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
    total_cost_gbp=ExpressionWrapper(
        Count('id', filter=Q(cache_hit=False, success=True)) * 0.003,
        output_field=DecimalField(max_digits=10, decimal_places=2)
    )
).order_by('-month')
```

---

### 6. Cache Efficiency Metrics

```python
from django.db.models import Avg, Count, Q

# Comprehensive cache statistics
cache_stats = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=7),
    success=True
).aggregate(
    total_lookups=Count('id'),
    cache_hits=Count('id', filter=Q(cache_hit=True)),
    cache_misses=Count('id', filter=Q(cache_hit=False)),
    hit_rate_percent=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
    avg_hit_time_ms=Avg('response_time_ms', filter=Q(cache_hit=True)),
    avg_miss_time_ms=Avg('response_time_ms', filter=Q(cache_hit=False)),
    unique_postcodes=Count('postcode', distinct=True)
)

# Calculate performance improvement
if cache_stats['avg_hit_time_ms'] and cache_stats['avg_miss_time_ms']:
    cache_stats['performance_improvement'] = (
        cache_stats['avg_miss_time_ms'] / cache_stats['avg_hit_time_ms']
    )
```

---

### 7. Provider Comparison

```python
# Compare Postcoder vs GetAddress.io
provider_comparison = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=7)
).values('api_provider').annotate(
    total_requests=Count('id'),
    successful=Count('id', filter=Q(success=True)),
    success_rate_percent=100.0 * Count('id', filter=Q(success=True)) / Count('id'),
    avg_response_ms=Avg('response_time_ms'),
    min_response_ms=Min('response_time_ms'),
    max_response_ms=Max('response_time_ms'),
    cache_hits=Count('id', filter=Q(cache_hit=True)),
    cache_hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
).order_by('api_provider')
```

---

### 8. Slowest Postcodes

```python
# Top 20 slowest postcodes over last 7 days
slowest_postcodes = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(days=7),
    success=True
).values('postcode').annotate(
    lookup_count=Count('id'),
    avg_response_ms=Avg('response_time_ms'),
    max_response_ms=Max('response_time_ms'),
    cache_hits=Count('id', filter=Q(cache_hit=True)),
    cache_hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
).filter(
    lookup_count__gte=5  # At least 5 lookups
).order_by('-avg_response_ms')[:20]
```

---

## Dashboard Integration

### Django Admin Integration

Create custom Django admin views for analytics:

```python
# address_analytics/admin.py
from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta
from .models import AddressLookupLog

@admin.register(AddressLookupLog)
class AddressLookupLogAdmin(admin.ModelAdmin):
    list_display = ['postcode', 'lookup_timestamp', 'cache_hit', 'success', 'response_time_ms']
    list_filter = ['cache_hit', 'success', 'api_provider', 'lookup_timestamp']
    search_fields = ['postcode']
    readonly_fields = ['lookup_timestamp']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('analytics/', self.admin_site.admin_view(self.analytics_view), name='address-analytics'),
        ]
        return custom_urls + urls

    def analytics_view(self, request):
        """Custom analytics dashboard view"""
        # Cache statistics
        cache_stats = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=timezone.now() - timedelta(days=7),
            success=True
        ).aggregate(
            total_lookups=Count('id'),
            cache_hits=Count('id', filter=Q(cache_hit=True)),
            hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
            avg_hit_time=Avg('response_time_ms', filter=Q(cache_hit=True)),
            avg_miss_time=Avg('response_time_ms', filter=Q(cache_hit=False))
        )

        # Daily trends
        daily_trends = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=timezone.now() - timedelta(days=30),
            success=True
        ).annotate(
            date=TruncDate('lookup_timestamp')
        ).values('date').annotate(
            requests=Count('id'),
            hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
        ).order_by('-date')[:30]

        # Top postcodes
        top_postcodes = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=timezone.now() - timedelta(days=7),
            success=True
        ).values('postcode').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        context = {
            'title': 'Address Lookup Analytics',
            'cache_stats': cache_stats,
            'daily_trends': daily_trends,
            'top_postcodes': top_postcodes,
        }

        return render(request, 'admin/address_analytics/analytics.html', context)
```

**Template** (`templates/admin/address_analytics/analytics.html`):
```html
{% extends "admin/base_site.html" %}

{% block content %}
<h1>Address Lookup Analytics (Last 7 Days)</h1>

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
  <div class="stat-card">
    <h3>Total Lookups</h3>
    <p class="stat-value">{{ cache_stats.total_lookups }}</p>
  </div>

  <div class="stat-card">
    <h3>Cache Hit Rate</h3>
    <p class="stat-value">{{ cache_stats.hit_rate|floatformat:2 }}%</p>
  </div>

  <div class="stat-card">
    <h3>Performance Gain</h3>
    <p class="stat-value">{{ cache_stats.avg_miss_time|div:cache_stats.avg_hit_time|floatformat:2 }}x</p>
  </div>
</div>

<h2>Daily Trends (Last 30 Days)</h2>
<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Requests</th>
      <th>Hit Rate</th>
    </tr>
  </thead>
  <tbody>
    {% for day in daily_trends %}
    <tr>
      <td>{{ day.date }}</td>
      <td>{{ day.requests }}</td>
      <td>{{ day.hit_rate|floatformat:2 }}%</td>
    </tr>
    {% endfor %}
  </tbody>
</table>

<h2>Top Postcodes</h2>
<table>
  <thead>
    <tr>
      <th>Postcode</th>
      <th>Lookups</th>
    </tr>
  </thead>
  <tbody>
    {% for item in top_postcodes %}
    <tr>
      <td>{{ item.postcode }}</td>
      <td>{{ item.count }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
{% endblock %}
```

---

### API Endpoint for External Dashboards

Create REST API endpoint for external monitoring tools:

```python
# address_analytics/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import AddressLookupLog

@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_api(request):
    """
    Analytics API endpoint for external dashboards

    Query parameters:
    - days: Number of days to analyze (default: 7)
    - metric: Specific metric to return (optional)
    """
    days = int(request.GET.get('days', 7))
    metric = request.GET.get('metric', None)

    start_date = timezone.now() - timedelta(days=days)

    # Cache statistics
    cache_stats = AddressLookupLog.objects.filter(
        lookup_timestamp__gte=start_date,
        success=True
    ).aggregate(
        total_lookups=Count('id'),
        cache_hits=Count('id', filter=Q(cache_hit=True)),
        cache_misses=Count('id', filter=Q(cache_hit=False)),
        hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
        avg_hit_time=Avg('response_time_ms', filter=Q(cache_hit=True)),
        avg_miss_time=Avg('response_time_ms', filter=Q(cache_hit=False)),
        success_rate=100.0 * Count('id', filter=Q(success=True)) / Count('id'),
        unique_postcodes=Count('postcode', distinct=True)
    )

    # Daily trends
    daily_trends = list(AddressLookupLog.objects.filter(
        lookup_timestamp__gte=start_date
    ).annotate(
        date=TruncDate('lookup_timestamp')
    ).values('date').annotate(
        requests=Count('id'),
        hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
        error_rate=100.0 * Count('id', filter=Q(success=False)) / Count('id')
    ).order_by('date'))

    # Top postcodes
    top_postcodes = list(AddressLookupLog.objects.filter(
        lookup_timestamp__gte=start_date,
        success=True
    ).values('postcode').annotate(
        count=Count('id'),
        hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
    ).order_by('-count')[:50])

    response_data = {
        'period': f'Last {days} days',
        'cache_stats': cache_stats,
        'daily_trends': daily_trends,
        'top_postcodes': top_postcodes,
    }

    # Return specific metric if requested
    if metric:
        if metric in cache_stats:
            return Response({metric: cache_stats[metric]})
        else:
            return Response({'error': f'Unknown metric: {metric}'}, status=400)

    return Response(response_data)


# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('api/analytics/address-lookup/', views.analytics_api, name='address-analytics-api'),
]
```

**Example API Calls:**
```bash
# Get all analytics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8888/api/analytics/address-lookup/?days=30

# Get specific metric
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8888/api/analytics/address-lookup/?metric=hit_rate

# Get cache hit rate for Grafana
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8888/api/analytics/address-lookup/?metric=hit_rate&days=1
```

---

## Query Optimization

### 1. Add Database Indexes

Ensure these indexes exist for optimal query performance:

```sql
-- Composite index on lookup_timestamp and cache_hit (for time-series queries)
CREATE INDEX idx_lookup_timestamp_cache_hit
ON address_analytics_addresslookuplog (lookup_timestamp DESC, cache_hit);

-- Composite index on lookup_timestamp and success (for error analysis)
CREATE INDEX idx_lookup_timestamp_success
ON address_analytics_addresslookuplog (lookup_timestamp DESC, success);

-- Index on postcode for postcode-specific queries
CREATE INDEX idx_postcode
ON address_analytics_addresslookuplog (postcode);

-- Index on api_provider for provider comparison
CREATE INDEX idx_api_provider
ON address_analytics_addresslookuplog (api_provider);

-- Composite index on postcode and lookup_timestamp (for postcode trends)
CREATE INDEX idx_postcode_timestamp
ON address_analytics_addresslookuplog (postcode, lookup_timestamp DESC);
```

**Django Migration:**
```python
# address_analytics/migrations/0003_add_analytics_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('address_analytics', '0002_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='addresslookuplog',
            index=models.Index(
                fields=['-lookup_timestamp', 'cache_hit'],
                name='idx_lookup_timestamp_cache_hit'
            ),
        ),
        migrations.AddIndex(
            model_name='addresslookuplog',
            index=models.Index(
                fields=['-lookup_timestamp', 'success'],
                name='idx_lookup_timestamp_success'
            ),
        ),
        migrations.AddIndex(
            model_name='addresslookuplog',
            index=models.Index(
                fields=['postcode'],
                name='idx_postcode'
            ),
        ),
        migrations.AddIndex(
            model_name='addresslookuplog',
            index=models.Index(
                fields=['api_provider'],
                name='idx_api_provider'
            ),
        ),
        migrations.AddIndex(
            model_name='addresslookuplog',
            index=models.Index(
                fields=['postcode', '-lookup_timestamp'],
                name='idx_postcode_timestamp'
            ),
        ),
    ]
```

---

### 2. Query Performance Tips

**Use `.values()` for Aggregations:**
```python
# ❌ Bad: Loads full objects into memory
results = AddressLookupLog.objects.filter(...).all()

# ✅ Good: Only loads needed fields
results = AddressLookupLog.objects.filter(...).values('postcode', 'cache_hit').annotate(...)
```

**Use `.only()` for Specific Fields:**
```python
# ❌ Bad: Loads all fields
logs = AddressLookupLog.objects.filter(...)

# ✅ Good: Only loads needed fields
logs = AddressLookupLog.objects.filter(...).only('postcode', 'response_time_ms', 'cache_hit')
```

**Use `.iterator()` for Large Datasets:**
```python
# ❌ Bad: Loads all results into memory
for log in AddressLookupLog.objects.filter(...):
    process(log)

# ✅ Good: Streams results
for log in AddressLookupLog.objects.filter(...).iterator(chunk_size=1000):
    process(log)
```

**Cache Expensive Queries:**
```python
from django.core.cache import cache

def get_cache_hit_rate():
    """Get cache hit rate with 5-minute caching"""
    cache_key = 'cache_hit_rate'
    result = cache.get(cache_key)

    if result is None:
        result = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=timezone.now() - timedelta(days=1)
        ).aggregate(
            hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
        )
        cache.set(cache_key, result, 300)  # Cache for 5 minutes

    return result['hit_rate']
```

---

## Scheduled Reports

### 1. Daily Email Report

Create management command for daily analytics email:

```python
# address_analytics/management/commands/send_daily_analytics.py
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from address_analytics.models import AddressLookupLog

class Command(BaseCommand):
    help = 'Send daily analytics email report'

    def handle(self, *args, **options):
        yesterday = timezone.now() - timedelta(days=1)
        start_of_day = yesterday.replace(hour=0, minute=0, second=0)
        end_of_day = yesterday.replace(hour=23, minute=59, second=59)

        # Get statistics
        stats = AddressLookupLog.objects.filter(
            lookup_timestamp__range=[start_of_day, end_of_day],
            success=True
        ).aggregate(
            total_requests=Count('id'),
            cache_hits=Count('id', filter=Q(cache_hit=True)),
            hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
            avg_response_time=Avg('response_time_ms'),
            api_calls=Count('id', filter=Q(cache_hit=False)),
            estimated_cost=Count('id', filter=Q(cache_hit=False)) * 0.003
        )

        # Format email
        subject = f"Address Lookup Analytics - {yesterday.strftime('%Y-%m-%d')}"
        message = f"""
Daily Address Lookup Analytics Report
Date: {yesterday.strftime('%Y-%m-%d')}

Performance Metrics:
--------------------
Total Requests:       {stats['total_requests']}
Cache Hits:           {stats['cache_hits']}
Cache Hit Rate:       {stats['hit_rate']:.2f}%
Avg Response Time:    {stats['avg_response_time']:.2f}ms
API Calls:            {stats['api_calls']}
Estimated Cost:       £{stats['estimated_cost']:.2f}

Dashboard: https://your-domain.com/admin/address_analytics/addresslookuplog/analytics/
        """

        # Send email
        send_mail(
            subject,
            message,
            'noreply@your-domain.com',
            ['admin@your-domain.com'],
            fail_silently=False,
        )

        self.stdout.write(self.style.SUCCESS(f'Daily analytics email sent'))
```

**Cron Job Setup:**
```bash
# Run daily at 8am
0 8 * * * cd /path/to/project && python manage.py send_daily_analytics
```

---

### 2. Weekly Summary Report

```python
# address_analytics/management/commands/send_weekly_analytics.py
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Send weekly analytics email report'

    def handle(self, *args, **options):
        last_week_start = timezone.now() - timedelta(days=7)

        # Get weekly statistics
        weekly_stats = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=last_week_start,
            success=True
        ).aggregate(
            total_requests=Count('id'),
            cache_hits=Count('id', filter=Q(cache_hit=True)),
            hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id'),
            avg_response_time=Avg('response_time_ms'),
            unique_postcodes=Count('postcode', distinct=True),
            api_calls=Count('id', filter=Q(cache_hit=False)),
            estimated_cost=Count('id', filter=Q(cache_hit=False)) * 0.003
        )

        # Get daily breakdown
        daily_breakdown = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=last_week_start,
            success=True
        ).annotate(
            date=TruncDate('lookup_timestamp')
        ).values('date').annotate(
            requests=Count('id'),
            hit_rate=100.0 * Count('id', filter=Q(cache_hit=True)) / Count('id')
        ).order_by('date')

        # Get top postcodes
        top_postcodes = AddressLookupLog.objects.filter(
            lookup_timestamp__gte=last_week_start,
            success=True
        ).values('postcode').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # Format email
        subject = f"Weekly Address Lookup Analytics - {last_week_start.strftime('%Y-%m-%d')}"

        daily_table = "\n".join([
            f"{item['date']}  {item['requests']:>4}  {item['hit_rate']:>6.2f}%"
            for item in daily_breakdown
        ])

        top_postcodes_table = "\n".join([
            f"{item['postcode']:<10}  {item['count']:>4}"
            for item in top_postcodes
        ])

        message = f"""
Weekly Address Lookup Analytics Report
Period: {last_week_start.strftime('%Y-%m-%d')} to {timezone.now().strftime('%Y-%m-%d')}

Summary:
--------
Total Requests:       {weekly_stats['total_requests']}
Cache Hit Rate:       {weekly_stats['hit_rate']:.2f}%
Avg Response Time:    {weekly_stats['avg_response_time']:.2f}ms
Unique Postcodes:     {weekly_stats['unique_postcodes']}
API Calls:            {weekly_stats['api_calls']}
Estimated Cost:       £{weekly_stats['estimated_cost']:.2f}

Daily Breakdown:
----------------
Date          Requests  Hit Rate
{daily_table}

Top Postcodes:
--------------
Postcode      Count
{top_postcodes_table}

Dashboard: https://your-domain.com/admin/address_analytics/addresslookuplog/analytics/
        """

        send_mail(
            subject,
            message,
            'noreply@your-domain.com',
            ['admin@your-domain.com'],
            fail_silently=False,
        )

        self.stdout.write(self.style.SUCCESS(f'Weekly analytics email sent'))
```

**Cron Job Setup:**
```bash
# Run every Monday at 9am
0 9 * * 1 cd /path/to/project && python manage.py send_weekly_analytics
```

---

## Grafana Dashboard Examples

### 1. Prometheus Exporter

Create custom Prometheus exporter for Grafana:

```python
# address_analytics/prometheus_exporter.py
from prometheus_client import Gauge, Counter, Histogram
from django.utils import timezone
from datetime import timedelta
from .models import AddressLookupLog

# Metrics
cache_hit_rate = Gauge('address_lookup_cache_hit_rate', 'Cache hit rate percentage')
total_requests = Counter('address_lookup_total_requests', 'Total address lookup requests')
cache_hits = Counter('address_lookup_cache_hits', 'Total cache hits')
cache_misses = Counter('address_lookup_cache_misses', 'Total cache misses')
response_time = Histogram('address_lookup_response_time_ms', 'Response time in milliseconds')
error_rate = Gauge('address_lookup_error_rate', 'Error rate percentage')

def update_prometheus_metrics():
    """Update Prometheus metrics from database"""
    # Last 24 hours
    start_time = timezone.now() - timedelta(hours=24)

    stats = AddressLookupLog.objects.filter(
        lookup_timestamp__gte=start_time
    ).aggregate(
        total=Count('id'),
        hits=Count('id', filter=Q(cache_hit=True)),
        misses=Count('id', filter=Q(cache_hit=False)),
        errors=Count('id', filter=Q(success=False)),
        avg_time=Avg('response_time_ms')
    )

    # Update gauges
    if stats['total'] > 0:
        cache_hit_rate.set((stats['hits'] / stats['total']) * 100)
        error_rate.set((stats['errors'] / stats['total']) * 100)

    # Counters are incremental, so we set them to current values
    # (In production, increment these in real-time as requests happen)
    total_requests._value._value = stats['total']
    cache_hits._value._value = stats['hits']
    cache_misses._value._value = stats['misses']
```

**Django View for Prometheus:**
```python
# address_analytics/views.py
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from django.http import HttpResponse
from .prometheus_exporter import update_prometheus_metrics

def prometheus_metrics(request):
    """Prometheus metrics endpoint"""
    update_prometheus_metrics()
    return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)

# urls.py
urlpatterns = [
    path('metrics/', views.prometheus_metrics, name='prometheus-metrics'),
]
```

---

### 2. Grafana Dashboard JSON

**Grafana Dashboard Configuration** (import this JSON):

```json
{
  "dashboard": {
    "title": "Address Lookup Analytics",
    "panels": [
      {
        "title": "Cache Hit Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "address_lookup_cache_hit_rate",
            "legendFormat": "Cache Hit Rate %"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "min": 0,
            "max": 100
          }
        ]
      },
      {
        "title": "Request Volume",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(address_lookup_total_requests[5m])",
            "legendFormat": "Requests/sec"
          },
          {
            "expr": "rate(address_lookup_cache_hits[5m])",
            "legendFormat": "Cache Hits/sec"
          },
          {
            "expr": "rate(address_lookup_cache_misses[5m])",
            "legendFormat": "Cache Misses/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "address_lookup_response_time_ms",
            "legendFormat": "Response Time (ms)"
          }
        ],
        "yaxes": [
          {
            "format": "ms"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "address_lookup_error_rate",
            "legendFormat": "Error Rate %"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "min": 0
          }
        ]
      }
    ]
  }
}
```

---

### 3. Simple Dashboard (No Prometheus)

**Use Django REST API endpoint directly:**

```javascript
// Grafana JSON data source configuration
{
  "url": "https://your-domain.com/api/analytics/address-lookup/",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  }
}

// Panel query
{
  "target": "hit_rate",
  "queryType": "timeseries"
}
```

---

## Datadog Integration

### Custom Metrics

```python
# address_analytics/datadog_metrics.py
from datadog import statsd
from django.utils import timezone
from datetime import timedelta
from .models import AddressLookupLog

def send_datadog_metrics():
    """Send metrics to Datadog"""
    start_time = timezone.now() - timedelta(hours=1)

    stats = AddressLookupLog.objects.filter(
        lookup_timestamp__gte=start_time,
        success=True
    ).aggregate(
        total=Count('id'),
        hits=Count('id', filter=Q(cache_hit=True)),
        avg_time=Avg('response_time_ms')
    )

    # Send metrics
    statsd.gauge('address_lookup.cache_hit_rate', (stats['hits'] / stats['total']) * 100)
    statsd.gauge('address_lookup.avg_response_time', stats['avg_time'])
    statsd.increment('address_lookup.total_requests', stats['total'])
```

**Cron Job:**
```bash
# Send metrics to Datadog every hour
0 * * * * cd /path/to/project && python -c "from address_analytics.datadog_metrics import send_datadog_metrics; send_datadog_metrics()"
```

---

## AWS CloudWatch Integration

```python
# address_analytics/cloudwatch_metrics.py
import boto3
from django.utils import timezone
from datetime import timedelta
from .models import AddressLookupLog

def send_cloudwatch_metrics():
    """Send metrics to AWS CloudWatch"""
    cloudwatch = boto3.client('cloudwatch')

    start_time = timezone.now() - timedelta(hours=1)

    stats = AddressLookupLog.objects.filter(
        lookup_timestamp__gte=start_time,
        success=True
    ).aggregate(
        total=Count('id'),
        hits=Count('id', filter=Q(cache_hit=True)),
        avg_time=Avg('response_time_ms')
    )

    # Put metrics
    cloudwatch.put_metric_data(
        Namespace='AddressLookup',
        MetricData=[
            {
                'MetricName': 'CacheHitRate',
                'Value': (stats['hits'] / stats['total']) * 100,
                'Unit': 'Percent',
                'Timestamp': timezone.now()
            },
            {
                'MetricName': 'AverageResponseTime',
                'Value': stats['avg_time'],
                'Unit': 'Milliseconds',
                'Timestamp': timezone.now()
            },
            {
                'MetricName': 'TotalRequests',
                'Value': stats['total'],
                'Unit': 'Count',
                'Timestamp': timezone.now()
            }
        ]
    )
```

---

## Testing Queries

**Test all queries:**
```bash
cd backend/django_Admin3
python manage.py shell

# Test ORM queries
from address_analytics.models import AddressLookupLog
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

# Test cache hit rate query
results = AddressLookupLog.objects.filter(
    lookup_timestamp__gte=timezone.now() - timedelta(hours=24),
    success=True
).values('cache_hit').annotate(
    avg_response_ms=Avg('response_time_ms'),
    request_count=Count('id')
)

print(list(results))
```

---

## Summary

**This document provides:**

✅ 8 core SQL queries for analytics
✅ Django ORM equivalents for all queries
✅ Django Admin integration examples
✅ REST API endpoint for external dashboards
✅ Database optimization strategies
✅ Scheduled report scripts (daily/weekly)
✅ Grafana dashboard configurations
✅ Prometheus exporter integration
✅ Datadog and CloudWatch integration
✅ Query performance optimization tips

**Next Steps:**

1. Add database indexes (run migration)
2. Create custom Django Admin analytics view
3. Set up daily/weekly email reports
4. Integrate with monitoring platform (Grafana/Datadog/CloudWatch)
5. Configure alerting thresholds

**Monitoring Checklist:**

- [ ] Database indexes created
- [ ] Django Admin analytics view configured
- [ ] Daily email reports scheduled
- [ ] Weekly email reports scheduled
- [ ] External dashboard configured (Grafana/Datadog)
- [ ] Alert thresholds configured
- [ ] Performance metrics validated
- [ ] Cost tracking verified

---

**Last Updated:** 2025-11-05
**Status:** Production-ready
**Related Documents:**
- `PERFORMANCE.md` - Performance benchmarks and optimization
- `FRONTEND_INTEGRATION.md` - Frontend migration strategies
- `FRONTEND_EXAMPLE.md` - React code examples
