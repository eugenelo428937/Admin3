# Feature Specification: Utils App Reorganization & Email System Extraction

**Feature Branch**: `20260115-20260122-util-refactoring`
**Created**: 2026-01-22
**Status**: Draft
**Input**: User description: "Utils app reorganization and email system extraction based on 2025-01-21-utils-reorganization-design.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Imports Email Functionality (Priority: P1)

A developer working on the Admin3 codebase needs to import email-related functionality (templates, queue, logging, settings) to implement features that send emails to users. They should find email functionality in a dedicated, clearly named location rather than buried in a monolithic utilities app.

**Why this priority**: Email functionality is critical to the application (password resets, order confirmations, notifications). Clear import paths improve developer experience and reduce onboarding time for new team members.

**Independent Test**: Can be fully tested by importing email models and services from the new location and successfully sending a test email.

**Acceptance Scenarios**:

1. **Given** the email system has been extracted, **When** a developer imports email models using the new import path, **Then** all email models (EmailTemplate, EmailQueue, EmailLog, EmailSettings, EmailContentRule, EmailContentPlaceholder) are accessible
2. **Given** the email system has been extracted, **When** a developer uses the email service to send an email, **Then** the email is queued and processed correctly
3. **Given** the email system has been extracted, **When** existing code using email functionality is run, **Then** all existing email functionality continues to work without modification to database content

---

### User Story 2 - Developer Imports VAT/Address/Other Utilities (Priority: P2)

A developer needs to use utility functions (VAT calculations, address lookup, health checks, reCAPTCHA verification) and should find them organized by domain rather than scattered in a flat file structure.

**Why this priority**: Organized utility packages improve code discoverability and make it easier for developers to find and use existing functionality, reducing code duplication.

**Independent Test**: Can be fully tested by importing utilities from domain-specific packages and verifying functionality works correctly.

**Acceptance Scenarios**:

1. **Given** utils has been reorganized, **When** a developer imports VAT functionality, **Then** they find it in a dedicated VAT package with clear module structure
2. **Given** utils has been reorganized, **When** a developer imports address lookup functionality, **Then** they find it in a dedicated address package
3. **Given** utils has been reorganized, **When** a developer searches for utility functions by domain, **Then** related functionality is co-located in discoverable packages

---

### User Story 3 - Admin User Manages Email Templates (Priority: P2)

An admin user needs to manage email templates, view email logs, and configure email settings through the Django admin interface. The admin interface should work identically after the reorganization.

**Why this priority**: Email template management is an ongoing operational task. Any disruption to admin functionality would impact daily operations.

**Independent Test**: Can be fully tested by logging into Django admin and performing CRUD operations on email templates.

**Acceptance Scenarios**:

1. **Given** the email system has been extracted, **When** an admin accesses email template management, **Then** all email templates are visible and editable
2. **Given** the email system has been extracted, **When** an admin creates a new email template, **Then** the template is saved and available for use
3. **Given** the email system has been extracted, **When** an admin views email logs, **Then** all historical email logs are preserved and accessible

---

### User Story 4 - System Processes Email Queue (Priority: P2)

The system must continue to process queued emails automatically. Background processes that handle email sending should work without interruption after the reorganization.

**Why this priority**: Email queue processing is essential for time-sensitive communications like password resets and order confirmations.

**Independent Test**: Can be fully tested by queuing test emails and verifying they are processed and sent.

**Acceptance Scenarios**:

1. **Given** the email system has been extracted, **When** the email queue processing command is run, **Then** queued emails are processed and sent
2. **Given** the email system has been extracted, **When** an email fails to send, **Then** the retry logic functions correctly
3. **Given** the email system has been extracted, **When** email queue metrics are requested, **Then** accurate statistics are returned

---

### Edge Cases

- What happens when deprecated import paths are used during transition period?
- How does system handle existing scheduled tasks that reference old import paths?
- What happens to email queue items that were created before the migration but processed after?
- How does system handle foreign key references to email models from other apps?

## Requirements *(mandatory)*

### Functional Requirements

#### Email System Extraction

- **FR-001**: System MUST provide a standalone email system that includes template management, queue processing, logging, and settings
- **FR-002**: System MUST preserve all existing email data (templates, logs, queue items, settings) without data loss during extraction
- **FR-003**: System MUST maintain identical email sending behavior after extraction
- **FR-004**: System MUST expose email models through new import paths that reflect the dedicated email system location
- **FR-005**: System MUST preserve admin interface functionality for all email-related models

#### Utils Reorganization

- **FR-006**: System MUST organize VAT-related functionality (region, country, VAT calculations) into a dedicated package
- **FR-007**: System MUST organize address lookup functionality (postcode lookup, address caching) into a dedicated package
- **FR-008**: System MUST organize DBF export functionality into a dedicated package
- **FR-009**: System MUST organize reCAPTCHA verification functionality into a dedicated package
- **FR-010**: System MUST organize health check functionality into a dedicated package
- **FR-011**: System MUST maintain middleware functionality at the utils root level

#### Backward Compatibility

- **FR-012**: System MUST provide deprecation warnings when old import paths are used during a transition period
- **FR-013**: System MUST ensure all existing tests pass after reorganization without test code modifications (beyond import path updates)
- **FR-014**: System MUST preserve all database table names to avoid data migration complexity

#### External Dependencies

- **FR-015**: System MUST update the core_auth app's dependency on EmailSettings to use the new import path
- **FR-016**: System MUST document all import path changes for other apps that depend on utils or email functionality

### Key Entities

- **EmailTemplate**: Reusable email template with subject, body content, and variable placeholders
- **EmailAttachment**: File attachment that can be included with emails
- **EmailTemplateAttachment**: Association between templates and their default attachments
- **EmailQueue**: Pending emails waiting to be sent with retry tracking
- **EmailLog**: Historical record of sent emails with delivery status
- **EmailSettings**: Configuration settings for email system behavior (timeouts, retry limits, etc.)
- **EmailContentRule**: Rules for dynamic content insertion into emails
- **EmailContentPlaceholder**: Variable placeholders available in email templates
- **UtilsRegion**: Geographic region for VAT calculations
- **UtilsCountrys**: Country information with VAT rates
- **UtilsCountryRegion**: Association between countries and regions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing email functionality works identically - emails are sent, queued, and logged without behavior changes
- **SC-002**: Developers can find and import email functionality in 50% less time compared to searching the monolithic utils app
- **SC-003**: 100% of existing tests pass after updating import paths (no functionality regressions)
- **SC-004**: All email data is preserved - zero records lost from templates, logs, queue, or settings tables
- **SC-005**: Admin users can perform all email management tasks without retraining or workflow changes
- **SC-006**: Codebase has clear separation - email system has zero dependencies on utils app internal structure
- **SC-007**: New developers can identify the correct import location for utilities within 30 seconds based on function domain
- **SC-008**: Rollback can be completed within 5 minutes if issues are discovered after deployment

## Assumptions

- The existing database schema and table names will be preserved (no column changes, no table renames)
- All apps currently importing from utils have been identified (core_auth confirmed, no others expected based on codebase analysis)
- Email functionality has no circular dependencies that would complicate extraction
- The development and production databases have identical schema structures
- Django admin customizations are limited to the models being moved (no complex cross-app admin dependencies)

## Out of Scope

- Changing email system behavior or adding new features
- Migrating to a different email backend or service
- Adding new utility packages beyond the domains currently in utils
- Changing the VAT, address, or other utility functionality
- Performance optimizations to email queue processing
- UI changes to Django admin beyond what's necessary for the move
