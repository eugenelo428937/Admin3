<!--
## Sync Impact Report
- Version: Initial creation → v2.1.1
- Ratification Date: 2025-12-15
- Last Amended: 2025-12-15

### Modified Principles
- Initial creation (no prior version)

### Added Sections
- All sections (initial creation)

### Removed Sections
- None (initial creation)

### Templates Requiring Updates
- ✅ .specify/templates/plan-template.md (already references v2.1.1)
- ✅ .specify/templates/spec-template.md (compatible)
- ✅ .specify/templates/tasks-template.md (compatible)

### Follow-up TODOs
- None
-->

# Admin3 Project Constitution

**Project**: Admin3 - Online Store for Actuarial Education
**Version**: 2.1.1
**Ratification Date**: 2025-12-15
**Last Amended**: 2025-12-15

---

## Purpose

This constitution establishes non-negotiable principles and quality gates for the Admin3 project. All development work, specifications, plans, and implementations MUST adhere to these principles.

---

## Principles

### Principle 1: Test-Driven Development (TDD)

All code development MUST follow strict Test-Driven Development practices.

**Requirements**:
- **RED Phase**: Write a failing test first that captures the desired behavior
- **GREEN Phase**: Write only enough code to make the test pass
- **REFACTOR Phase**: Improve code quality while keeping tests green
- No production code MUST be written without a corresponding failing test
- Minimum 80% test coverage for new code
- Tests MUST be run and verified before marking any task complete

**Rationale**: TDD ensures code correctness, enables safe refactoring, and produces self-documenting tests that serve as living specifications.

### Principle 2: Simplicity Over Complexity

Avoid over-engineering. Only make changes that are directly requested or clearly necessary.

**Requirements**:
- MUST NOT add features, refactor code, or make "improvements" beyond what was asked
- MUST NOT add error handling for scenarios that cannot happen
- MUST NOT create helpers, utilities, or abstractions for one-time operations
- MUST NOT design for hypothetical future requirements
- Three similar lines of code is better than a premature abstraction
- Bug fixes MUST NOT include surrounding code cleanup unless explicitly requested

**Rationale**: Unnecessary complexity increases maintenance burden, introduces bugs, and obscures the actual business logic.

### Principle 3: Security First

All code MUST prioritize security and never introduce vulnerabilities.

**Requirements**:
- MUST validate all user inputs at system boundaries
- MUST NOT introduce OWASP Top 10 vulnerabilities (XSS, SQL injection, command injection, etc.)
- MUST use JWT authentication with proper refresh token handling
- MUST sanitize all template rendering to prevent XSS
- MUST use parameterized queries for all database operations
- MUST NOT hardcode credentials or secrets in source code

**Rationale**: Security vulnerabilities can lead to data breaches, financial loss, and reputational damage.

### Principle 4: Single Source of Truth

Each piece of data or configuration MUST have exactly one authoritative source.

**Requirements**:
- Redux store is the single source of truth for frontend filter state
- Database is the single source of truth for business data
- Environment variables are the single source of truth for configuration
- MUST NOT duplicate state across multiple locations
- URL parameters MUST sync bidirectionally with Redux state via middleware

**Rationale**: Multiple sources of truth lead to inconsistencies, bugs, and maintenance nightmares.

### Principle 5: Explicit Over Implicit

Code behavior MUST be explicit and predictable.

**Requirements**:
- MUST use explicit type annotations where supported
- MUST include proper `__str__` methods for all Django models
- MUST use descriptive variable and function names
- MUST NOT rely on implicit type coercion or magic behavior
- Boolean props in React MUST use proper boolean syntax, not strings

**Rationale**: Explicit code is easier to understand, debug, and maintain.

### Principle 6: Documentation Standards

Documentation MUST be maintained alongside code changes.

**Requirements**:
- MUST NOT create documentation files unless explicitly requested
- MUST update CLAUDE.md when adding new patterns or architectural decisions
- MUST include JSDoc/docstrings for public APIs and complex logic
- MUST keep documentation concise and actionable
- Comments SHOULD explain "why", not "what"

**Rationale**: Good documentation reduces onboarding time and prevents knowledge silos, but excessive documentation becomes stale and misleading.

---

## Quality Gates

### Gate 1: Pre-Implementation

Before writing implementation code:
- [ ] Failing test exists for the feature/fix
- [ ] Spec reviewed for ambiguities (no [NEEDS CLARIFICATION] markers)
- [ ] Design adheres to all constitutional principles

### Gate 2: Pre-Commit

Before committing code:
- [ ] All tests pass (RED → GREEN complete)
- [ ] No security vulnerabilities introduced
- [ ] Code follows project style conventions
- [ ] No unnecessary complexity added

### Gate 3: Pre-Merge

Before merging to main branch:
- [ ] Test coverage meets 80% minimum for new code
- [ ] REFACTOR phase completed if applicable
- [ ] Documentation updated if patterns changed
- [ ] Code review completed (if applicable)

---

## Governance

### Amendment Process

1. **Proposal**: Any team member may propose amendments via documented discussion
2. **Review**: Amendments MUST be reviewed against project goals and existing principles
3. **Approval**: Amendments require explicit approval before implementation
4. **Versioning**: All amendments MUST increment the constitution version

### Versioning Policy

- **MAJOR** (X.0.0): Backward-incompatible principle removals or redefinitions
- **MINOR** (0.X.0): New principle added or materially expanded guidance
- **PATCH** (0.0.X): Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Review

- Constitution principles are checked during `/plan` command execution
- Violations MUST be documented in plan's Complexity Tracking section
- Unjustifiable violations block implementation until resolved

---

## Project-Specific Standards

### Backend (Django)

- Use `snake_case` for field names and methods
- Store external API IDs as `external_id` fields
- Use `active` boolean fields for soft deletes
- Follow Django REST Framework patterns

### Frontend (React)

- Use functional components with hooks
- Use `PascalCase` for component names
- Use `camelCase` for props and state variables
- Use Material-UI components consistently
- Implement proper loading states and error handling

### Database

- Use `select_related`/`prefetch_related` for query optimization
- Implement pagination for large datasets
- Index frequently queried fields

---

*This constitution is the authoritative source for development standards in Admin3.*
