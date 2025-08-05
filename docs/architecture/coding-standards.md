# Coding Standards

## General Principles

- **Consistency**: Follow established patterns within the codebase
- **Readability**: Code should be self-documenting and clear
- **Security**: Never commit secrets, validate all inputs, follow security best practices
- **Testing**: All code should be testable and include appropriate tests

## Django Backend Standards

### Code Style
- Use **snake_case** for field names, method names, and variables
- Use **PascalCase** for class names
- Follow PEP 8 conventions
- Use meaningful names that describe purpose

### Model Standards
- Include proper `__str__` methods for all models
- Use `active` boolean fields for soft deletes instead of hard deletes
- Store external API IDs as `external_id` fields
- Use proper foreign key relationships and constraints
- Add `created_at` and `updated_at` timestamps where appropriate

### API Standards
- Use Django REST Framework patterns consistently
- Implement proper serializers with validation
- Use appropriate HTTP status codes
- Implement pagination for large datasets
- Include proper error handling and logging

### Database Standards
- Use `select_related`/`prefetch_related` for query optimization
- Index frequently queried fields
- Use transactions for data consistency
- Avoid N+1 queries

### Security Standards
- Use JWT tokens with proper refresh mechanism
- Validate all user inputs
- Implement proper CORS configuration
- Enable CSRF protection
- Never hardcode credentials in source code

## React Frontend Standards

### Component Standards
- Use **functional components** with hooks
- Use **PascalCase** for component names
- Use **camelCase** for props and state variables
- Implement proper loading states and error handling

### Code Organization
- Keep components focused and single-responsibility
- Use custom hooks for reusable logic
- Implement proper prop validation
- Use Material-UI components consistently, layout, styles and css attributes should be placed in theme.js as much as possible.

### State Management
- Use Context API for global state
- Keep local state minimal and close to where it's used
- Implement proper error boundaries

### Performance Standards
- Use React.memo for expensive components
- Implement lazy loading where appropriate
- Optimize bundle size with code splitting
- Cache frequently accessed data

## File Organization

### Directory Structure
- Group related files together
- Use clear, descriptive directory names
- Separate concerns (components, services, utils, etc.)
- Keep test files close to source files

### Import Standards
- Use absolute imports where configured
- Group imports: external libraries, internal modules, relative imports
- Use named imports when possible
- Keep import lists clean and organized

## Testing Standards

### Django Tests
- Use `APITestCase` for API testing
- Set up test data in `setUp()` methods
- Use `force_authenticate()` for authenticated tests
- Mock external API calls in tests
- Test both success and error cases

### React Tests
- Test component rendering and user interactions
- Mock API calls in component tests
- Test form validation and error handling
- Use React Testing Library patterns

## Error Handling

### Backend Error Handling
```python
try:
    result = api_service.execute_query(query, variables)
except Exception as e:
    logger.error(f"Operation failed: {str(e)}")
    return Response({"error": "Operation failed"}, status=500)
```

### Frontend Error Handling
- Implement proper error boundaries
- Show user-friendly error messages
- Log errors for debugging
- Provide fallback UI for error states

## Documentation Standards

- Keep documentation up to date with code changes
- Use clear, concise language
- Include code examples where helpful
- Document API endpoints and data models
- Maintain README files for setup and development

## Git Standards

- Use conventional commit message format
- Keep commits focused and atomic
- Write descriptive commit messages
- Use feature branches for development
- Review code before merging

## Environment Standards

- Use environment variables for configuration
- Never commit sensitive data to version control
- Maintain separate configurations for different environments
- Document required environment variables