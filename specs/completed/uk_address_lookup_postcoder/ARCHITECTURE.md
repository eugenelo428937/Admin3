# Architecture Decision: Dual-Method Address Lookup

**Feature**: Postcoder.com Address Lookup Integration
**Date**: 2025-11-04
**Status**: Approved

## Decision

Implement a **new, separate address lookup method** for Postcoder.com API while preserving the existing getaddress.io implementation unchanged. Both methods will coexist independently, enabling side-by-side evaluation.

## Context

The Admin3 application currently uses getaddress.io API for UK address lookups via the `address_lookup_proxy` view function. We want to evaluate Postcoder.com as an alternative provider without:
- Disrupting existing functionality
- Requiring frontend changes
- Risking data quality regressions
- Committing to immediate migration

## Architecture Overview

### Two Independent Endpoints

#### Existing Method (Unchanged)
- **Endpoint**: `/api/utils/address-lookup/`
- **View Function**: `address_lookup_proxy` in `backend/django_Admin3/utils/views.py:10`
- **API Provider**: getaddress.io
- **Status**: **PRESERVED - NO MODIFICATIONS**
- **Features**: Basic address lookup, no caching, no analytics
- **Used By**: Current frontend SmartAddressInput component

#### New Method (This Feature)
- **Endpoint**: `/api/utils/postcoder-address-lookup/`
- **View Function**: `postcoder_address_lookup` (new)
- **API Provider**: Postcoder.com
- **Status**: **NEW IMPLEMENTATION**
- **Features**: Address lookup + 7-day caching + analytics logging
- **Used By**: Optional (evaluation/testing only initially)

### Component Architecture

```
┌─────────────────────────────────────────────────────┐
│            Frontend (React)                         │
│  ┌──────────────────────────────────┐              │
│  │  SmartAddressInput.js            │              │
│  │  (Currently uses getaddress.io)  │              │
│  └──────────────────────────────────┘              │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│             Django Backend                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  URL Routing (utils/urls.py)                 │  │
│  │  ┌────────────────┐  ┌───────────────────┐  │  │
│  │  │ EXISTING:      │  │ NEW:              │  │  │
│  │  │ address-lookup/│  │ postcoder-address-│  │  │
│  │  └────────────────┘  │ lookup/           │  │  │
│  │                      └───────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  View Layer (utils/views.py)                 │  │
│  │  ┌────────────────────┐  ┌─────────────────┐│  │
│  │  │ EXISTING:          │  │ NEW:            ││  │
│  │  │ address_lookup_    │  │ postcoder_      ││  │
│  │  │ proxy()            │  │ address_lookup()││  │
│  │  │                    │  │                 ││  │
│  │  │ ⚠ NO CHANGES       │  │ ✅ NEW FUNCTION ││  │
│  │  └────────────────────┘  └─────────────────┘│  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Service Layer (utils/services/)             │  │
│  │  ┌───────────────────────────────────────┐  │  │
│  │  │ NEW SERVICES:                         │  │  │
│  │  │ - PostcoderService                    │  │  │
│  │  │ - AddressCacheService                 │  │  │
│  │  │ - AddressLookupLogger                 │  │  │
│  │  └───────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Data Layer (Django ORM)                     │  │
│  │  ┌───────────────────────────────────────┐  │  │
│  │  │ NEW MODELS:                           │  │  │
│  │  │ - CachedAddress (address_cache app)   │  │  │
│  │  │ - AddressLookupLog (address_analytics)│  │  │
│  │  └───────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│           External APIs                             │
│  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ getaddress.io    │  │ Postcoder.com         │  │
│  │ (EXISTING)       │  │ (NEW)                 │  │
│  └──────────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Request Flow Comparison

### Existing getaddress.io Flow
```
User → SmartAddressInput → /api/utils/address-lookup/
     → address_lookup_proxy() → getaddress.io API → Response
```

### New Postcoder Flow
```
User → (Future) PostcoderAddressInput → /api/utils/postcoder-address-lookup/
     → postcoder_address_lookup()
     → PostcoderService.execute_lookup()
        1. Check cache (AddressCacheService.get_cached_address())
        2. If cache miss → Call Postcoder.com API
        3. Transform response to getaddress.io format
        4. Cache result (AddressCacheService.cache_address())
        5. Log analytics (AddressLookupLogger.log_lookup())
     → Response (with cache_hit metadata)
```

## Benefits of Dual-Method Architecture

### 1. Zero Risk to Existing Functionality
- Existing `address_lookup_proxy` function: **UNTOUCHED**
- No changes to getaddress.io integration
- Current users experience zero disruption
- Existing SmartAddressInput component continues working

### 2. Side-by-Side Evaluation
- **Data Quality**: Compare address results from both APIs
- **Performance**: Measure response times independently
- **Cost**: Track API usage and costs separately
- **Reliability**: Evaluate uptime and error rates

### 3. Flexible Migration Path
- **Option A**: Keep both methods long-term (redundancy)
- **Option B**: Gradually migrate users to Postcoder
- **Option C**: Use feature flags for A/B testing
- **Option D**: Revert to getaddress.io if Postcoder underperforms

### 4. Rollback Safety
- If Postcoder.com has issues: **getaddress.io still works**
- No emergency rollback procedures needed
- No database rollbacks required
- No frontend hotfixes needed

### 5. Feature Isolation
- Advanced features (caching, analytics) isolated to Postcoder method
- No risk of introducing bugs to proven getaddress.io implementation
- Can experiment with new features without affecting legacy code

## Implementation Details

### New Django Apps
- **address_cache**: Stores Postcoder lookup results (7-day retention)
- **address_analytics**: Tracks lookup metrics for both methods

### Service Layer Classes
- **PostcoderService**: Handles Postcoder.com API integration
- **AddressCacheService**: Manages 7-day caching for Postcoder lookups
- **AddressLookupLogger**: Logs analytics data for performance monitoring

### Database Models

#### CachedAddress (address_cache app)
```python
postcode           CharField(indexed)
search_query       CharField
response_data      JSONField
formatted_addresses JSONField
created_at         DateTimeField(indexed)
expires_at         DateTimeField(indexed)
hit_count          IntegerField
```

#### AddressLookupLog (address_analytics app)
```python
postcode           CharField(indexed)
search_query       CharField
lookup_timestamp   DateTimeField(indexed)
cache_hit          BooleanField(indexed)
response_time_ms   IntegerField
result_count       IntegerField
api_provider       CharField(indexed)  # 'getaddress' or 'postcoder'
success            BooleanField(indexed)
error_message      TextField(nullable)
```

### Response Format Compatibility
Both methods return the same response format for frontend compatibility:

```json
{
  "addresses": [
    {
      "postcode": "SW1A 1AA",
      "latitude": 51.501364,
      "longitude": -0.141890,
      "formatted_address": ["10 Downing Street", "Westminster", "London"],
      "line_1": "10 Downing Street",
      "line_2": "",
      "line_3": "Westminster",
      "line_4": "",
      "town_or_city": "London",
      "county": "Greater London",
      "country": "England"
    }
  ],
  "cache_hit": false,        // NEW: Postcoder only
  "response_time_ms": 234    // NEW: Postcoder only
}
```

## Future Migration Strategy

### Phase 1: Evaluation (Current Implementation)
- Deploy Postcoder endpoint alongside getaddress.io
- Frontend continues using getaddress.io
- Manually test Postcoder endpoint for quality validation
- Monitor performance metrics via Django admin

### Phase 2: Parallel Testing (Future)
- Add feature flag: `USE_POSTCODER_ADDRESS_LOOKUP`
- Update SmartAddressInput to check feature flag
- A/B test with small percentage of users
- Compare data quality and performance metrics

### Phase 3: Migration (Future - If Approved)
- Gradually increase Postcoder usage percentage
- Monitor error rates and user feedback
- Full migration when confidence is high
- Keep getaddress.io as backup for 90 days

### Phase 4: Deprecation (Future - Optional)
- Remove getaddress.io if Postcoder proves superior
- Archive address_lookup_proxy code with documentation
- Update all frontend components to use Postcoder

## Risks and Mitigations

### Risk: Postcoder API Instability
**Mitigation**: getaddress.io remains fully functional as fallback

### Risk: Postcoder Data Quality Issues
**Mitigation**: Side-by-side comparison before migration, easy rollback

### Risk: Increased Infrastructure Costs
**Mitigation**: Caching reduces API calls by target 40%, monitor costs closely

### Risk: Frontend Changes Required
**Mitigation**: Response format matches getaddress.io, zero frontend changes required initially

## Monitoring and Analytics

### Key Metrics to Track
1. **Response Time**: < 500ms (cache miss), < 100ms (cache hit)
2. **Cache Hit Rate**: Target 40% within 30 days
3. **Error Rate**: < 1% for successful lookups
4. **API Costs**: Compare per-lookup costs between providers
5. **Data Quality**: Manual comparison of address results

### Django Admin Views
- **CachedAddress**: Monitor cache entries, hit counts, expiration
- **AddressLookupLog**: Analyze response times, cache performance, error rates

### SQL Analytics Queries
```sql
-- Cache hit rate over time
SELECT DATE(lookup_timestamp) as date,
       COUNT(*) as total_lookups,
       SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
       ROUND(100.0 * SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) / COUNT(*), 2) as hit_rate_pct
FROM address_analytics_addresslookuplog
WHERE api_provider = 'postcoder'
GROUP BY DATE(lookup_timestamp)
ORDER BY date DESC;

-- Average response time by cache status
SELECT cache_hit,
       AVG(response_time_ms) as avg_response_ms,
       MIN(response_time_ms) as min_response_ms,
       MAX(response_time_ms) as max_response_ms
FROM address_analytics_addresslookuplog
WHERE api_provider = 'postcoder'
GROUP BY cache_hit;
```

## Testing Strategy

### Unit Tests
- PostcoderService API integration (mock Postcoder.com responses)
- AddressCacheService caching logic (7-day TTL enforcement)
- AddressLookupLogger analytics tracking

### Integration Tests
- Full request flow: endpoint → services → database
- Cache hit/miss behavior verification
- Error handling and fallback logic

### Manual Testing
- Compare Postcoder vs getaddress.io results for same postcodes
- Verify response format compatibility with frontend
- Test cache expiration after 7 days
- Validate Django admin views for monitoring

### Performance Tests
- Response time under load (concurrent requests)
- Cache hit rate validation with repeated queries
- Memory usage with large cache datasets

## Decision Rationale

### Why Not Replace getaddress.io Immediately?
- **Risk**: Unknown data quality of Postcoder.com for our use cases
- **Risk**: Potential API reliability issues with new provider
- **Risk**: Frontend compatibility concerns
- **Safety**: Keeping both allows rollback without code changes

### Why Not Just Add Feature Flag to Existing Endpoint?
- **Complexity**: Conditional logic increases bug risk in proven code
- **Testing**: Harder to test both paths independently
- **Rollback**: Feature flag removal requires code deployment
- **Clarity**: Separate endpoints make intent and usage explicit

### Why Add Caching Only to Postcoder Method?
- **Safety**: Don't modify proven getaddress.io implementation
- **Evaluation**: Caching is a new feature to test with Postcoder
- **Performance**: Postcoder evaluation includes caching benefits
- **Future**: Can add caching to getaddress.io later if Postcoder proves concept

## Related Documents
- [Feature Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Task Breakdown](./tasks.md)

## Approval
- ✅ Constitutional compliance: No abstract patterns, no new projects
- ✅ Technical review: Service layer pattern, single responsibility principle
- ✅ Security review: API keys in environment variables, input validation
- ✅ Performance review: Caching strategy, response time targets

---

**Last Updated**: 2025-11-04
**Architecture Version**: 1.0
**Status**: Approved for Implementation
