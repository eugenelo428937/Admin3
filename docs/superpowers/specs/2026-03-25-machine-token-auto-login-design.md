# Machine Token Auto-Login for Admin Staff

**Date:** 2026-03-25
**Status:** Draft
**Author:** Claude Code + Eugene Lo

## Problem

Staff accessing the Admin3 admin panel must manually enter email and password every time, despite having already authenticated via SharePoint 2FA on the same machine. This creates unnecessary friction — double authentication on every session.

## Constraints

- Admin3 runs at `https://7.32.1.138:8443` (internal network)
- SharePoint session data (`sessionTracking_*` localStorage) is on `bppserviceslimited.sharepoint.com` — **cross-origin, inaccessible** from Admin3
- No control over SSO, Active Directory, or DNS (managed by Apollo Global)
- Reverse DNS does not resolve VPN IPs (verified: PTR records absent)
- Staff access from specific laptops on VPN (subnet `7.32.0.0/16`)
- Each machine has known hostname, serial number, MAC address
- Project is in dev phase — no legacy user migration concerns

## Solution: Machine Token Auto-Login

Pre-provision a long-lived, hashed authentication token per staff machine. Staff browser shortcut includes the token as a **URL fragment** (`#machine_token=...`). On page load, React reads the fragment (which is never sent to the server), POSTs it to the backend, which validates the token and VPN subnet, then issues a JWT — zero interaction required.

## Architecture

### Flow

```
Staff clicks browser shortcut
  → https://7.32.1.138:8443/admin#machine_token=<raw_token>
  → Fragment (#...) is NOT sent to the server — no log/Referer leakage
  → React reads `machine_token` from window.location.hash
  → POST /api/auth/machine-login/ { machine_token: "<raw_token>" }
  → Backend:
      1. Rate-limit check (5 attempts/min per IP)
      2. HMAC-hash incoming token with SECRET_KEY
      3. Look up hash in MachineToken table
      4. Verify token is active
      5. Verify request IP is in trusted subnet (7.32.0.0/16)
      6. Linked user is active and is_superuser
      7. Update last_used_at timestamp
      8. Generate JWT (access + refresh) for linked user
      9. Return JWT + user data (same shape as /api/auth/login/)
      10. Log success (user, machine_name, IP, timestamp)
  → Frontend:
      1. Store JWT + user in localStorage
      2. Remove fragment from URL via history.replaceState
      3. Set authenticated state
  → Staff lands on /admin dashboard, fully authenticated
```

### What Changes

| Component | Change | Details |
|-----------|--------|---------|
| `core_auth/models.py` | **New model** | `MachineToken` — hashed token, user FK, machine name, active flag |
| `core_auth/views.py` | **New action** | `machine_login` — validates token + subnet, returns JWT |
| `core_auth/urls.py` | **New route** | `POST /api/auth/machine-login/` |
| `core_auth/management/commands/` | **New commands** | `create_machine_token`, `revoke_machine_token`, `list_machine_tokens` |
| `core_auth/admin.py` | **New registration** | `MachineToken` in Django Admin for visibility |
| `authService.ts` | **New method** | `machineLogin(token)` — POST to `/api/auth/machine-login/` |
| `useAuth.tsx` | **Modified** | Check URL fragment for `machine_token` on mount, call machine-login |
| `auth.types.ts` | **Modified** | Add `MachineLoginCredentials` type |
| `settings/base.py` | **New setting** | `MACHINE_LOGIN_TRUSTED_SUBNETS` |

### What Does NOT Change

- Normal email/password login flow
- `AdminLayout.tsx` — still gates on `isSuperuser`
- `httpService.ts` — JWT handling unchanged
- `IsSuperUser` permission class — unchanged
- All existing API permissions and auth middleware

## Backend Design

### MachineToken Model

App: `core_auth`
Schema: `acted`
Table: `'"acted"."machine_tokens"'`

This is the **first model** in the `core_auth` app. A new migration will be created.

```python
class MachineToken(models.Model):
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='machine_tokens')
    machine_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = '"acted"."machine_tokens"'

    def __str__(self):
        return f"{self.machine_name} → {self.user.email}"
```

Fields:
- `token_hash`: HMAC-SHA256 hash of the raw token using `SECRET_KEY` (raw token never stored). HMAC means a database breach alone is insufficient — attacker also needs `SECRET_KEY`.
- `user`: Django User with `is_superuser=True`
- `machine_name`: Human-readable label (e.g., "LAPTOP-ELO01"). Multiple tokens can exist for the same machine (e.g., different users). One user can have tokens on multiple machines.
- `is_active`: Soft-delete flag for revocation
- `last_used_at`: Updated on each successful login

### Token Hashing

```python
import hmac, hashlib
from django.conf import settings

def hash_token(raw_token: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(),
        raw_token.encode(),
        hashlib.sha256
    ).hexdigest()
```

HMAC with `SECRET_KEY` provides defense-in-depth: even with full DB access, tokens cannot be verified without the key.

### Machine Login Endpoint

```
POST /api/auth/machine-login/
Content-Type: application/json
No authentication required

Request:  { "machine_token": "<raw_token_64_hex_chars>" }
Response: { "token": "<jwt_access>", "refresh": "<jwt_refresh>", "user": { ... } }
```

Validation order:
1. Token present and non-empty
2. Hash token, look up in DB
3. Token is active (`is_active=True`)
4. Request IP is in `MACHINE_LOGIN_TRUSTED_SUBNETS`
5. Linked user is active and `is_superuser`

Error responses:
- All failure modes return `403 { "error": "Machine login failed" }` — same status and message regardless of which check failed, to prevent information leakage.

### Rate Limiting

The endpoint is unauthenticated and grants superuser access, so rate limiting is mandatory.

- **Mechanism:** DRF throttling (`rest_framework.throttling.AnonRateThrottle`)
- **Limit:** 5 requests per minute per IP
- **Scope:** `machine_login` (dedicated throttle scope, not shared with other endpoints)
- **Failed attempts:** Logged with IP and timestamp for monitoring

```python
# Custom throttle for machine login
class MachineLoginThrottle(AnonRateThrottle):
    scope = 'machine_login'
    rate = '5/min'
```

Apply to the view via `throttle_classes`:

```python
@action(detail=False, methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[MachineLoginThrottle])
def machine_login(self, request):
    ...
```

This is the first throttled endpoint in the project. No global `DEFAULT_THROTTLE_CLASSES` config is needed — the throttle is applied per-view only.

### Audit Logging

All machine login attempts are logged via Python's `logging` module:

**On success:**
```
INFO machine_login: user=eugene.lo@bpp.com machine=LAPTOP-ELO01 ip=7.32.3.4
```

**On failure:**
```
WARNING machine_login_failed: ip=7.32.3.4 reason=invalid_token
WARNING machine_login_failed: ip=10.0.0.5 reason=untrusted_network
```

Failure logs include a reason category for operational visibility but the HTTP response remains generic.

### Settings

```python
# settings/base.py
MACHINE_LOGIN_TRUSTED_SUBNETS = ['7.32.0.0/16']
```

### Management Commands

**create_machine_token**
```bash
python manage.py create_machine_token --email eugene.lo@bpp.com --machine "LAPTOP-ELO01"
```
Output:
```
Machine token created for eugene.lo@bpp.com on LAPTOP-ELO01
Token: a1b2c3d4e5f6... (64 hex chars)
URL:   https://7.32.1.138:8443/admin#machine_token=a1b2c3d4e5f6...

⚠ This token will not be shown again. Save it now.
```

**revoke_machine_token**
```bash
python manage.py revoke_machine_token --machine "LAPTOP-ELO01"
```
Sets `is_active=False` for all tokens on that machine.
Lists affected tokens and prompts for confirmation before revoking. Use `--force` to skip confirmation.
Note: this revokes ALL tokens for that machine name, which may affect multiple users.
Also supports `--user email@bpp.com` to revoke all tokens for a specific user across all machines.

**list_machine_tokens**
```bash
python manage.py list_machine_tokens
python manage.py list_machine_tokens --user eugene.lo@bpp.com
python manage.py list_machine_tokens --machine "LAPTOP-ELO01"
```
Lists active tokens with: machine name, user email, created date, last used date. Supports filtering by user or machine.

### IP Validation

```python
import ipaddress
from django.conf import settings

def is_trusted_ip(client_ip: str) -> bool:
    addr = ipaddress.ip_address(client_ip)
    return any(
        addr in ipaddress.ip_network(subnet)
        for subnet in settings.MACHINE_LOGIN_TRUSTED_SUBNETS
    )
```

Reuse the existing `get_client_ip` from `utils/recaptcha_utils.py` for IP extraction (handles `X-Forwarded-For`).

## Frontend Design

### useAuth.tsx Modification

On mount, before checking existing JWT in localStorage:

```
1. Read URL fragment (window.location.hash)
2. Parse: if hash contains "machine_token=<value>":
   a. Extract token from fragment
   b. Clear fragment immediately: history.replaceState({}, '', '/admin')
   c. Call authService.machineLogin(token)
      → POST /api/auth/machine-login/ { machine_token: token }
   d. On success:
      - Store JWT + user in localStorage (same as login())
      - Set auth state (user, isSuperuser, isAuthenticated)
      - AdminLayout renders normally (isSuperuser = true)
   e. On failure:
      - Set machineLoginError state
      - Navigate to '/' (home/login page)
      - Login form displays: "Auto-login failed. Please log in manually."
3. If no machine_token in fragment:
   - Existing flow (check localStorage for JWT)
```

**Error flow detail:** On failure, the user is redirected to `/` (not left on `/admin`) because `AdminLayout` would redirect them there anyway since `isSuperuser` would be false. Showing the error on the login form gives them a clear fallback path.

### User Experience Matrix

| Scenario | Experience |
|----------|-----------|
| Valid token + on VPN | Admin dashboard loads instantly |
| Valid token + off VPN | Login form with generic error |
| Invalid token | Login form with generic error |
| Revoked token | Login form with generic error |
| No token in URL | Normal login form (unchanged) |

### URL Token Safety

Using a URL **fragment** (`#machine_token=...`) instead of a query parameter (`?machine_token=...`) provides critical security benefits:

- **Not sent to server:** Fragments are never included in HTTP requests, so the token never appears in server access logs, proxy logs, or load balancer logs
- **Not in Referer header:** Fragments are stripped from Referer headers, so the token won't leak to any external resources loaded by the page
- **Cleaned immediately:** `history.replaceState` removes the fragment from the address bar and browser history before any other processing

## Security

### Trust Chain

```
VPN Connected (network layer)
  + Known machine (token bound to specific laptop name)
    + Known user (token → user FK)
      + Trusted subnet check (server-side IP validation)
        = JWT issued
```

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Token leaked via URL sharing | Subnet check — useless outside VPN |
| Staff laptop stolen | Revoke token via management command |
| Token brute force | 256-bit entropy + 5/min rate limit |
| Token in server logs | Fragment never sent to server |
| Token in Referer header | Fragment stripped from Referer |
| Token in browser history | `replaceState` clears fragment on load |
| Man-in-the-middle | HTTPS on port 8443 |
| Staff leaves company | Revoke token + deactivate Django user |
| Database breach | HMAC-SHA256 with SECRET_KEY — need both DB and key |
| CSRF attack on endpoint | Subnet check limits to VPN; token is unguessable |

### Token Properties

- **Format:** 64-character hex string (`secrets.token_hex(32)`)
- **Entropy:** 256 bits
- **Storage:** HMAC-SHA256 hash in database (keyed with `SECRET_KEY`)
- **Transport:** URL fragment (never touches server logs)
- **Lifetime:** Indefinite until manually revoked
- **Scope:** One token per machine, linked to one user

## Provisioning Workflow

1. Admin runs `create_machine_token` with staff email + machine name
2. Command outputs raw token and full URL — **shown once, never again**
3. Admin configures staff machine browser shortcut/homepage with the URL
4. Staff clicks shortcut — auto-logged in

## Migration

This is the first model in the `core_auth` app. Migration steps:

1. `python manage.py makemigrations core_auth` — creates initial migration
2. Verify migration creates the table in the `acted` schema using double-quoted `db_table`
3. `python manage.py migrate core_auth`
4. Verify with `python manage.py verify_schema_placement`

The `core_auth` app's `migrations/` directory currently only has `__init__.py` — this will be the first real migration file.

### Django Admin Registration

Register `MachineToken` in `core_auth/admin.py` for operational visibility:

```python
@admin.register(MachineToken)
class MachineTokenAdmin(admin.ModelAdmin):
    list_display = ['machine_name', 'user', 'is_active', 'created_at', 'last_used_at']
    list_filter = ['is_active']
    search_fields = ['machine_name', 'user__email']
    readonly_fields = ['token_hash', 'created_at', 'last_used_at']
```

Note: `token_hash` is read-only — new tokens are created via management command only (the raw token is shown once and never stored).

### Cart Merge

The existing `login` action merges guest carts via `cart_service.merge_guest_cart()`. Machine login **skips** cart merge — admin users accessing via machine token are not browsing the store, so there is no guest cart to merge.

## Testing Strategy

### Backend Tests
- Token validation (valid, invalid, inactive, missing)
- Subnet check (trusted IP, untrusted IP)
- JWT response shape matches `/api/auth/login/` response
- `last_used_at` updated on successful login
- Non-superuser rejection
- Inactive user rejection
- Rate limiting (6th request in 1 minute returns 429)
- All failure modes return identical 403 response body
- Audit logging: success logs user/machine/IP
- Audit logging: failure logs IP/reason category
- HMAC hashing: token hashed with SECRET_KEY, not plain SHA-256

### Frontend Tests
- `machine_token` detected in URL fragment triggers auto-login
- URL fragment cleaned after successful login
- URL fragment cleaned after failed login
- Failed login redirects to `/` with error message
- Fallback to normal login form on failure
- No interference when no fragment present
- `authService.machineLogin()` calls correct endpoint

### Manual Verification
- Provision token on dev machine
- Open URL on VPN — verify instant login
- Open URL off VPN — verify rejection
- Revoke token — verify rejection
- Normal login still works alongside
