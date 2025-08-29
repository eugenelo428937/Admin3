# Epic 0: Product Filtering System Redesign

**Epic Priority**: CRITICAL - Must be completed before all other epics
**Epic Duration**: 4-5 weeks
**Epic Owner**: Development Team

## Epic Goal

Completely redesign the product filtering system architecture to replace the current fragmented, unmaintainable filtering implementation with a modern Redux Toolkit + RTK Query architecture featuring unified API, cookie-based persistence, and optimized database performance.

## Background Context

### Current System Problems
The existing filtering system suffers from critical architectural flaws:

- **Multiple Sources of Truth**: URL params, panel filters, and search filters managed separately causing state inconsistencies
- **Unmaintainable Components**: ProductList.js has grown to 1000+ lines with complex, brittle state management
- **Parameter Mismatches**: Frontend sends `subject`, backend expects `SUBJECT_FILTER` creating integration failures
- **Dual Database Systems**: Both `acted_filter_group` and `acted_product_group` exist causing query confusion
- **Bypassed Architecture**: Existing filter service is ignored in favor of manual filtering logic
- **Performance Issues**: Multiple useEffect loops cause infinite re-renders and poor user experience
- **No State Persistence**: Filters don't survive page reloads, frustrating users

### Business Impact
- **User Experience**: Poor filtering performance leads to user frustration and cart abandonment
- **Maintenance Cost**: 1000+ line components are unmaintainable and error-prone
- **Development Velocity**: Adding new filters requires touching multiple disconnected systems
- **System Reliability**: Fragmented architecture creates bugs that are difficult to debug and fix

## Integration Requirements

This epic must maintain existing functionality while completely rebuilding the architecture:
- All current filtering behaviors must continue to work
- Navigation menu filtering logic must be preserved
- Product display and cart functionality must remain intact
- Database queries must maintain or improve performance
- API responses must remain consistent for external integrations

## Epic Stories

### Story 0.1: Redux Foundation and Unified API
**Priority**: Highest
**Estimate**: 1.5 weeks

As a developer,
I want a unified Redux store and API endpoint for all filtering operations,
So that we have a single source of truth and consistent data flow.

**Acceptance Criteria**:
1. Redux Toolkit store manages all filter state (subjects, categories, products, variations, search)
2. Single POST `/api/products/search/` endpoint handles all filtering with proper response format
3. RTK Query provides caching and state management for API calls
4. Cookie-based persistence maintains filter state across page reloads
5. Debounced API calls prevent excessive server requests (250ms delay)

**Technical Requirements**:
- Implement Redux store with filters slice
- Create RTK Query catalogApi service
- Add cookie persistence middleware
- Build unified backend search endpoint
- Implement disjunctive facet counting (Amazon-style)

### Story 0.2: Component Architecture Simplification
**Priority**: High
**Estimate**: 1 week

As a developer,
I want simplified, maintainable React components,
So that the filtering UI is easy to understand, modify, and extend.

**Acceptance Criteria**:
1. ProductList component reduced to ~150 lines (from 1000+)
2. FilterPanel component handles checkbox interface with proper counts
3. ActiveFilters component displays removable filter pills
4. ProductGrid component handles display logic
5. Custom hook useProductsSearch manages debounced API calls

**Technical Requirements**:
- Refactor ProductList.js to use Redux state
- Extract FilterPanel as separate component
- Create ActiveFilters pill interface
- Implement useProductsSearch hook
- Ensure all components use Redux for state management

### Story 0.3: Database Performance Optimization
**Priority**: High
**Estimate**: 0.5 weeks

As a system administrator,
I want optimized database queries and proper indexing,
So that filtering operations perform efficiently at scale.

**Acceptance Criteria**:
1. Critical database indexes added for filter performance
2. Database queries optimized using proper JOINs
3. Query response times < 200ms for typical filter combinations
4. Database migration scripts handle index creation safely
5. Query performance monitoring implemented

**Technical Requirements**:
- Add indexes on acted_exam_sessions_subjects_products
- Create indexes for product group relationships
- Optimize filter query generation
- Implement query performance logging
- Create database migration scripts

### Story 0.4: Navigation Menu Integration
**Priority**: High
**Estimate**: 0.5 weeks

As a user,
I want navigation menu filtering to work with special behaviors,
So that the menu acts as shortcuts with specific filter clearing logic.

**Acceptance Criteria**:
1. Subject selection clears existing subjects, then applies new subject
2. "View All Products" clears all filters except subjects
3. Product group selection clears all except subjects, then applies product type filter
4. Product selection clears all except subjects, then applies product filter
5. Navigation behaviors integrate seamlessly with filter panel

**Technical Requirements**:
- Implement Redux actions for navigation behaviors
- Update MainNavBar.js to dispatch navigation actions
- Ensure navigation actions trigger proper API calls
- Test all navigation menu filter combinations
- Maintain existing menu structure and styling

### Story 0.5: Filter Analytics and Advanced Features
**Priority**: Medium
**Estimate**: 0.5 weeks

As a product manager,
I want analytics on filter usage and smart filter suggestions,
So that we can optimize the filtering experience and understand user behavior.

**Acceptance Criteria**:
1. Filter usage tracking implemented
2. Popular filter combinations identified
3. Filter performance metrics collected
4. Smart filter suggestions based on usage patterns
5. Admin dashboard shows filter analytics

**Technical Requirements**:
- Create FilterAnalytics model for tracking usage
- Implement filter suggestion algorithm
- Add performance monitoring dashboard
- Create admin interface for analytics
- Implement caching for frequently used filters

## Success Metrics

### Performance Metrics
- Filter response time: < 200ms (target: 150ms average)
- Page load with cached filters: < 1s
- Filter panel updates: < 100ms
- Zero infinite re-render loops

### Code Quality Metrics
- ProductList component: < 200 lines (from 1000+)
- Code complexity: Reduced cyclomatic complexity by 80%
- Test coverage: > 90% for all filtering components
- Technical debt: Eliminated fragmented state management

### User Experience Metrics
- Filter state persistence: 100% across page reloads
- Filter accuracy: 100% correct results for all combinations
- User session retention: > 95% filter state maintained
- Zero filter-related error reports

## Risk Assessment and Mitigation

### Technical Risks
**Risk**: Redux architecture complexity may slow initial development
**Mitigation**: Use Redux Toolkit which simplifies Redux patterns and provides excellent TypeScript support

**Risk**: API changes might break existing integrations
**Mitigation**: Maintain backward compatibility by supporting both old and new endpoints during transition

**Risk**: Database migration issues with production data
**Mitigation**: Create careful migration scripts with rollback capabilities and test thoroughly in staging

### Business Risks
**Risk**: User experience disruption during implementation
**Mitigation**: Use feature flags for gradual rollout and A/B testing capabilities

**Risk**: Extended development time affecting other priorities
**Mitigation**: This is CRITICAL priority and must be completed before other epics to avoid compounding technical debt

## Dependencies and Prerequisites

### Prerequisites
- Redux Toolkit and RTK Query understanding by development team
- Database migration strategy approved
- Feature flag system in place for gradual rollout

### Dependencies
- No dependencies on other epics - this is the foundation epic
- All other epics depend on completion of this architecture redesign

## Implementation Approach

### Phase 1: Foundation (Week 1-2)
- Redux store setup with filters slice
- Unified API endpoint creation
- Cookie persistence implementation
- Basic component refactoring

### Phase 2: Integration (Week 2-3)
- Component architecture simplification
- Navigation menu integration
- Database optimization
- Performance testing

### Phase 3: Advanced Features (Week 3-4)
- Filter analytics implementation
- Smart suggestions
- Performance monitoring
- Comprehensive testing

### Phase 4: Deployment (Week 4-5)
- Feature flag rollout
- Performance validation
- User acceptance testing
- Production deployment

## Definition of Done

This epic is complete when:
1. All existing filtering functionality works with new architecture
2. Performance metrics meet or exceed targets
3. Code complexity reduced by 80%
4. Zero technical debt related to filtering remains
5. Filter state persists across page reloads
6. Navigation menu behaviors work correctly
7. Database queries are optimized and indexed
8. Comprehensive test coverage achieved
9. Documentation updated for new architecture
10. Production deployment successful with no rollbacks

## Post-Epic Benefits

Upon completion, the development team will have:
- **Maintainable Codebase**: 150-line components instead of 1000+ line monsters
- **Scalable Architecture**: Easy to add new filter types and behaviors
- **Better Performance**: Sub-200ms response times and optimized database queries
- **Developer Experience**: Redux DevTools for debugging and clear data flow
- **User Experience**: Persistent filters and immediate feedback
- **Foundation for Growth**: Solid architecture for implementing other epics

This epic provides the architectural foundation required for all other system enhancements and must be prioritized as CRITICAL.