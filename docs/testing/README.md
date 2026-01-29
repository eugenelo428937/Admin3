# Testing Infrastructure Documentation

This directory contains documentation for Admin3's testing quality infrastructure -- three interconnected systems that ensure backend changes don't silently break frontend expectations, surface coverage gaps, and enforce test-passing before commits.

## Why This Exists

Admin3 has a React frontend calling 76+ Django REST API endpoints. The core risk: **backend changes can silently break the frontend**. A field rename, a changed response shape, or a removed endpoint won't produce a compile error -- it will produce a runtime failure that only surfaces when a user clicks the wrong button at the wrong time.

These three systems address that risk at different levels:

| System | What It Catches | When It Runs |
|--------|-----------------|--------------|
| [Pact Contract Testing](./pact-contract-testing.md) | Response shape mismatches between frontend expectations and backend reality | CI pipeline + on-demand |
| [Test Gap Analysis](./test-gap-analysis.md) | Endpoints and serializer fields with no test coverage at all | On-demand management command |
| [Pre-commit Test Gate](./pre-commit-test-gate.md) | Committing code when the test suite is broken | Automatically before every `git commit` |

## Quick Reference

```bash
# Run Pact consumer tests (generates contract file)
cd frontend/react-Admin3
npm run test:pact

# Verify backend satisfies contracts
cd backend/django_Admin3
python manage.py test pact_tests --settings=django_Admin3.settings.development --keepdb

# Run test gap analysis
python manage.py test_coverage_audit

# Run test gap analysis for a single app
python manage.py test_coverage_audit --app=store --format=text
```

## Documentation Index

1. **[Pact Contract Testing](./pact-contract-testing.md)** -- Consumer-driven contract verification between React frontend and Django backend
2. **[Test Gap Analysis](./test-gap-analysis.md)** -- Management command that discovers untested endpoints and serializer fields
3. **[Pre-commit Test Gate](./pre-commit-test-gate.md)** -- Hook that blocks git commits when Django tests fail

## Architecture Overview

```
Frontend (React)                    Backend (Django)
==================                  ==================

src/pact/consumers/                 pact_tests/
  auth.pact.test.js    ------>        state_handlers.py
  cart.pact.test.js    Generates      test_provider_verification.py
  products.pact.test.js  contract       (replays contract
  search.pact.test.js    JSON file       against live Django)
       |                                    |
       v                                    v
  pacts/Admin3Frontend-             LiveServerTestCase
    Admin3Backend.json               + State Change Server

                                    utils/audit/
                                      endpoint_auditor.py
                                      serializer_auditor.py
                                      test_file_scanner.py
                                      report_generator.py
                                    utils/management/commands/
                                      test_coverage_audit.py

scripts/
  pre-commit-test-gate.sh  <---  .claude/settings.json (hook config)
```

## Dependencies

| Package | Version | Side | Purpose |
|---------|---------|------|---------|
| `@pact-foundation/pact` | ^16.0.4 | Frontend | Consumer contract test library |
| `pact-python` | 2.2.2 | Backend | Provider verification library |

## CI Pipeline Integration

The GitHub Actions workflow (`.github/workflows/deploy.yml`) includes two Pact-specific jobs:

1. **test-pact-consumer** -- Runs frontend consumer tests, uploads contract artifacts
2. **test-pact-provider** -- Downloads contracts, verifies backend satisfies them

Both must pass before the `deploy` job runs. See [Pact Contract Testing](./pact-contract-testing.md) for CI details.
