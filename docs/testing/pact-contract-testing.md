# Pact Consumer-Driven Contract Testing

## Problem Statement

Admin3's React frontend makes HTTP requests to 76+ Django REST API endpoints. When the backend changes a response shape (renames a field, changes a type, removes a key), there is no compile-time error. The frontend silently receives unexpected data, and the defect only surfaces at runtime -- often in production.

Traditional integration tests don't solve this because they test the backend in isolation. The frontend's *expectations* about response shapes are encoded only in its service layer code, and there is no mechanism to verify those expectations against the backend.

## What Pact Does

Pact is a **consumer-driven contract testing** framework. It works in two phases:

1. **Consumer side** (frontend): Tests define the exact request/response interactions the frontend expects. Pact generates a JSON "contract" file describing these expectations.
2. **Provider side** (backend): The contract is replayed against a live Django server. If any response doesn't match the contract shape, the provider test fails.

The contract file is the bridge. It captures *what the frontend actually needs* and verifies *what the backend actually returns*.

## How It Works

### Phase 1: Consumer Tests Generate Contracts

Each consumer test file defines interactions using the PactV3 builder API:

```javascript
// src/pact/consumers/auth.pact.test.js
const { createPactProvider } = require('../setup');
const { string, integer, like, JSON_RESPONSE_HEADERS } = require('../helpers');

describe('Auth Service - Pact Consumer Tests', () => {
  const provider = createPactProvider();

  it('returns token and user on successful login', async () => {
    provider
      .given('a registered user exists')         // Provider state
      .uponReceiving('a valid login request')     // Interaction name
      .withRequest({
        method: 'POST',
        path: '/api/auth/login/',
        headers: { 'Content-Type': 'application/json' },
        body: { username: 'test@example.com', password: 'ValidPass123!' },
      })
      .willRespondWith({
        status: 200,
        headers: JSON_RESPONSE_HEADERS,
        body: {
          token: string('eyJ...access'),    // Must be a string
          refresh: string('eyJ...refresh'), // Must be a string
          user: like({                       // Must match this shape
            id: integer(1),
            email: string('test@example.com'),
          }),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await axios.post(
        `${mockServer.url}/api/auth/login/`,
        { username: 'test@example.com', password: 'ValidPass123!' },
        { headers: { 'Content-Type': 'application/json' } }
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
    });
  });
});
```

Key concepts:

- **`.given('state description')`** -- Names the database state the backend needs. The backend's state handlers set this up before verification.
- **`.uponReceiving('interaction name')`** -- Human-readable name for this interaction. Must be unique within the consumer-provider pair.
- **`.withRequest()`** -- The exact HTTP request the frontend will send.
- **`.willRespondWith()`** -- The expected response. Uses matchers (`string()`, `integer()`, `like()`, `eachLike()`) to define shape constraints rather than exact values.
- **`.executeTest()`** -- Runs a callback against a Pact mock server that returns the defined responses. Verifies the frontend code actually works with those responses.

When tests pass, Pact writes a JSON contract file to `pacts/Admin3Frontend-Admin3Backend.json`.

### Phase 2: Provider Verification Replays Contracts

The backend verification test:

1. Starts a Django `LiveServerTestCase` (real HTTP server on a random port)
2. Starts a lightweight state-change HTTP server on another port
3. Uses `pact.v3.Verifier` to replay every interaction from the contract file
4. For each interaction, the verifier first POSTs the `given()` state to the state-change server, which runs the appropriate handler to set up the database
5. The verifier then sends the request from the contract to the Django server and compares the response against the contract's matchers

```python
# pact_tests/test_provider_verification.py
class PactProviderVerificationTest(LiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._state_server_port = _find_free_port()
        cls._state_server_thread = threading.Thread(
            target=_run_state_server,
            args=(cls._state_server_port,),
            daemon=True,
        )
        cls._state_server_thread.start()

    def test_provider_honours_pact_with_consumer(self):
        verifier = Verifier(PROVIDER_NAME)
        verifier.set_info('Admin3Backend', url=self.live_server_url)
        verifier.set_state(
            f'http://127.0.0.1:{self._state_server_port}/_pact/state',
            teardown=False,
        )
        verifier.add_source(PACT_FILE)
        verifier.verify()
```

State handlers set up the database for each `given()` clause:

```python
# pact_tests/state_handlers.py
def state_a_registered_user_exists(params=None):
    user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'username': 'test@example.com', 'is_active': True},
    )
    if created:
        user.set_password('ValidPass123!')
        user.save()

STATE_HANDLERS = {
    'a registered user exists': state_a_registered_user_exists,
    'no user with email newuser@example.com exists': state_no_user_with_email_exists,
    # ... 14 more state handlers
}
```

## File Structure

```
Admin3/
  pacts/
    .gitkeep                              # Preserves directory in git
    Admin3Frontend-Admin3Backend.json      # Generated contract (gitignored)

  frontend/react-Admin3/
    jest.pact.config.js                   # Separate Jest config for Pact
    src/pact/
      setup.js                            # PactV3 provider factory
      helpers.js                          # Shared matchers and response shapes
      consumers/
        auth.pact.test.js                 # Auth API contracts (8 tests)
        cart.pact.test.js                 # Cart API contracts (7 tests)
        products.pact.test.js             # Products/Store contracts (5 tests)
        search.pact.test.js               # Search contracts (4 tests)

  backend/django_Admin3/
    pact_tests/
      __init__.py
      conftest.py                         # Constants (paths, names)
      state_handlers.py                   # DB setup for each given() state
      test_provider_verification.py       # LiveServer + Verifier
```

## Current Coverage (Phase 1)

| Domain | Consumer Tests | Endpoints Covered |
|--------|---------------|-------------------|
| Auth | 8 tests | login, register, refresh, logout, password reset, activate |
| Cart | 7 tests | fetch, add, update, remove, clear, checkout |
| Products/Store | 5 tests | store products, navigation data, filters, bundles |
| Search | 4 tests | fuzzy search, advanced search, default data |
| **Total** | **24 tests** | **21 unique interactions** |

Planned future phases:
- **Phase 2**: Catalog, Store, Orders
- **Phase 3**: Rules Engine, Tutorials, Users/Students, Marking

## CI Pipeline

Two jobs in `.github/workflows/deploy.yml`:

```yaml
test-pact-consumer:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with: { node-version: '18' }
    - name: Install frontend dependencies
      working-directory: ./frontend/react-Admin3
      run: npm ci
    - name: Run Pact consumer tests
      working-directory: ./frontend/react-Admin3
      run: npm run test:pact
    - name: Upload Pact contracts
      uses: actions/upload-artifact@v4
      with:
        name: pact-contracts
        path: pacts/*.json

test-pact-provider:
  needs: [test-pact-consumer]
  runs-on: ubuntu-latest
  services:
    postgres: { ... }
  steps:
    - uses: actions/checkout@v4
    - name: Download Pact contracts
      uses: actions/download-artifact@v4
      with: { name: pact-contracts, path: pacts/ }
    - name: Run Pact provider verification
      working-directory: ./backend/django_Admin3
      run: python manage.py test pact_tests --settings=django_Admin3.settings.development
```

Contract files are passed between jobs via GitHub Actions artifacts (not committed to git).

## Matchers Reference

Matchers define *shape* constraints. The provider can return any value that matches the type/pattern -- not the exact example value.

| Matcher | What It Validates | Example |
|---------|-------------------|---------|
| `string('example')` | Value is a string | `string('CM2')` |
| `integer(1)` | Value is an integer | `integer(42)` |
| `decimal(9.99)` | Value is a decimal number | `decimal(59.99)` |
| `boolean(true)` | Value is a boolean | `boolean(false)` |
| `like({...})` | Object matches structure (values can differ) | `like({ id: integer(1) })` |
| `eachLike({...})` | Array where each item matches structure | `eachLike({ code: string('CM2') })` |
| `regex(pattern, example)` | String matches regex | `regex('\\d{4}-\\d{2}', '2025-04')` |

**Known limitation**: Regex matchers cannot be used in `Content-Type` response headers. The Pact Rust FFI parses header values as MIME types before applying matchers, so regex objects in Content-Type headers cause a crash. Use plain strings instead:

```javascript
// CORRECT
const JSON_RESPONSE_HEADERS = { 'Content-Type': 'application/json' };

// WRONG - causes Pact FFI SIGABRT
const JSON_RESPONSE_HEADERS = {
  'Content-Type': regex('application/json(;\\s?charset=utf-8)?', 'application/json'),
};
```

---

## Maintenance Guide

### Adding a New Consumer Contract Test

When the frontend adds a new API call or changes an existing one:

1. **Create or edit the consumer test file** in `frontend/react-Admin3/src/pact/consumers/`

   - If the endpoint belongs to an existing domain (auth, cart, products, search), add to the existing file
   - If it's a new domain, create a new file: `{domain}.pact.test.js`

2. **Define the interaction** using the PactV3 builder:

   ```javascript
   const { createPactProvider } = require('../setup');
   const { string, integer, like, JSON_RESPONSE_HEADERS } = require('../helpers');

   describe('New Domain - Pact Consumer Tests', () => {
     const provider = createPactProvider();

     it('returns expected data', async () => {
       provider
         .given('required state description')
         .uponReceiving('a unique interaction name')
         .withRequest({
           method: 'GET',
           path: '/api/new-endpoint/',
         })
         .willRespondWith({
           status: 200,
           headers: JSON_RESPONSE_HEADERS,
           body: { field: string('value') },
         });

       await provider.executeTest(async (mockServer) => {
         const response = await axios.get(`${mockServer.url}/api/new-endpoint/`);
         expect(response.status).toBe(200);
       });
     });
   });
   ```

3. **Add a state handler** if the `given()` clause is new. Edit `backend/django_Admin3/pact_tests/state_handlers.py`:

   ```python
   def state_new_required_state(params=None):
       """State: required state description"""
       # Set up database objects needed for this interaction
       MyModel.objects.get_or_create(...)

   # Add to the STATE_HANDLERS dict:
   STATE_HANDLERS = {
       # ... existing handlers ...
       'required state description': state_new_required_state,
   }
   ```

   The state description string must **exactly match** the `.given()` string in the consumer test.

4. **Run the consumer tests** to regenerate the contract:

   ```bash
   cd frontend/react-Admin3
   npm run test:pact
   ```

5. **Run the provider verification** to check the backend satisfies the contract:

   ```bash
   cd backend/django_Admin3
   python manage.py test pact_tests --settings=django_Admin3.settings.development --keepdb
   ```

### Adding a Shared Response Shape

If multiple tests need the same response structure, add it to `src/pact/helpers.js`:

```javascript
// Add the shape definition
const newResourceShape = {
  id: integer(1),
  name: string('Resource Name'),
  is_active: boolean(true),
};

// Export it
module.exports = {
  // ... existing exports ...
  newResourceShape,
};
```

### Updating the Provider State Change Server

The state change server ([test_provider_verification.py](../../backend/django_Admin3/pact_tests/test_provider_verification.py)) uses Python's built-in `http.server`. If you need to change its behavior:

- The server listens on `/_pact/state` for POST requests
- Request body is JSON: `{ "state": "description", "action": "setup"|"teardown", "params": {} }`
- It looks up `state` in `STATE_HANDLERS` and calls the matching function
- Unknown states or teardown actions get a 200 response (acknowledged, no-op)

### When a Contract Test Fails

**Consumer test fails**: The frontend code doesn't work with the mock response you defined. Check that your matchers and response shape match what the frontend actually parses.

**Provider test fails**: The Django backend returns a response that doesn't match the contract. This means either:
- The backend changed (intentionally or accidentally) -- update the consumer test to match the new shape, or fix the backend regression
- The state handler didn't set up the database correctly -- check state_handlers.py
- The contract file is stale -- re-run `npm run test:pact` to regenerate

### Debugging

- Set `PACT_LOG_LEVEL=debug` to get verbose Pact output:
  ```bash
  PACT_LOG_LEVEL=debug npm run test:pact
  ```
- The contract JSON file (`pacts/Admin3Frontend-Admin3Backend.json`) is human-readable. Open it to see all interactions and matchers.
- Provider verification errors include the interaction name and the specific field that didn't match.

### Removing an Endpoint from Contracts

If an endpoint is removed from the backend:

1. Delete the corresponding `it()` block from the consumer test file
2. Remove the state handler from `STATE_HANDLERS` if no other interaction uses it
3. Re-run `npm run test:pact` to regenerate the contract without that interaction
4. Re-run provider verification to confirm

### Dependencies

| Package | Version | Location |
|---------|---------|----------|
| `@pact-foundation/pact` | ^16.0.4 | `frontend/react-Admin3/package.json` (devDependencies) |
| `pact-python` | 2.2.2 | `backend/django_Admin3/requirements.txt` |

The Pact FFI (Foreign Function Interface) binary is bundled with `@pact-foundation/pact` and downloaded automatically during `npm install`. The backend `pact-python` package depends on `cffi`.

### Upgrading Pact Versions

**Frontend**: Update `@pact-foundation/pact` in `package.json`. The PactV3 API has been stable since v12. Check the [Pact JS changelog](https://github.com/pact-foundation/pact-js/blob/master/CHANGELOG.md) for breaking changes.

**Backend**: Update `pact-python` in `requirements.txt`. The `pact.v3.Verifier` API has been stable since v2.0. Check the [Pact Python changelog](https://github.com/pact-foundation/pact-python/blob/master/CHANGELOG.md) for breaking changes.

After upgrading, re-run both consumer and provider tests to verify compatibility.
