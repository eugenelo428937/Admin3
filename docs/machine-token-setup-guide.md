# Machine Token Auto-Login: Staff Machine Setup Guide

## Overview

Staff machines can be configured for **zero-friction admin login** to the ActEd Management System. Instead of typing email and password, staff simply click a bookmark and are instantly logged into the admin dashboard.

### How It Works

1. A **machine token** is generated and tied to a specific staff member and machine
2. The token is embedded in a browser bookmark URL
3. When staff click the bookmark, the frontend sends the token to the backend
4. The backend verifies the token + checks the request comes from the VPN network
5. JWT tokens are issued and the admin dashboard loads immediately

### Security

- Tokens are **HMAC-SHA256 hashed** before storage -- even with database access, raw tokens cannot be recovered
- Tokens only work from the **trusted VPN subnet** (`7.32.0.0/16`)
- Only **active superusers** can authenticate via machine token
- The token is **removed from the browser URL** immediately after use (not stored in history)
- Each token can be **individually revoked** if a machine is lost or staff leave

---

## Prerequisites

Before setting up a staff machine, ensure:

- [ ] The staff member has a **Django superuser account** (`is_superuser=True`)
- [ ] The machine is connected to the **VPN** (IP in `7.32.0.0/16` range)
- [ ] The Admin3 backend is running and accessible at `https://7.32.1.138:8443`
- [ ] The `core_auth` migration has been applied (`python manage.py migrate core_auth`)

---

## Step 1: Create a Machine Token

On the server (or any machine with access to the Django management commands):

```bash
cd backend/django_Admin3
.\.venv\Scripts\activate

python manage.py create_machine_token --email staff@bpp.com --machine "MACHINE-NAME"
```

**Arguments:**

| Argument | Description | Example |
|----------|-------------|---------|
| `--email` | Staff member's email (must match Django user) | `EugeneLo@bpp.com` |
| `--machine` | Machine identifier (hostname, asset tag, etc.) | `LAPTOP-ELO01` |

**Output:**

```
Machine token created for staff@bpp.com on LAPTOP-ELO01
Token: a1b2c3d4e5f6...  (64-character hex string)
URL:   https://7.32.1.138:8443/admin#machine_token=a1b2c3d4e5f6...

This token will not be shown again. Save it now.
```

**IMPORTANT:** Copy the token and URL immediately. The raw token is never stored and cannot be retrieved later.

---

## Step 2: Configure the Staff Machine

### Option A: Browser Bookmark (Recommended)

1. Open the staff member's browser (Chrome/Edge)
2. Navigate to the bookmark bar
3. Right-click the bookmark bar > **Add page...**
4. Set the name to: `ActEd Admin`
5. Set the URL to the full URL from Step 1:
   ```
   https://7.32.1.138:8443/admin#machine_token=a1b2c3d4e5f6...
   ```
6. Click **Save**

### Option B: Desktop Shortcut

1. Right-click the desktop > **New** > **Shortcut**
2. Enter the URL from Step 1 as the location
3. Name it `ActEd Admin`
4. Click **Finish**

### Option C: Browser Homepage

1. Open browser settings
2. Set the homepage or startup page to the URL from Step 1

---

## Step 3: Verify

1. Ensure the staff member is connected to the VPN
2. Click the bookmark / shortcut
3. The admin dashboard should load immediately with no login prompt

**If it doesn't work**, check:
- Is the VPN connected? (IP must be in `7.32.0.0/16`)
- Is the Django user account active and a superuser?
- Was the token copied correctly? (should be exactly 64 hex characters)

---

## Managing Tokens

### List Active Tokens

```bash
python manage.py list_machine_tokens
```

Output:
```
Machine                   User                           Active   Created              Last Used
-------------------------------------------------------------------------------------------------------
LAPTOP-ELO01              EugeneLo@bpp.com               Yes      2026-03-25 14:30     2026-03-25 15:02
DESKTOP-ADMIN02           JaneSmith@bpp.com              Yes      2026-03-25 14:35     Never
```

**Filter options:**
```bash
python manage.py list_machine_tokens --user EugeneLo@bpp.com
python manage.py list_machine_tokens --machine LAPTOP-ELO01
python manage.py list_machine_tokens --all    # Include revoked tokens
```

### Revoke a Token

When a staff member leaves or a machine is lost/stolen:

```bash
# Revoke by machine name
python manage.py revoke_machine_token --machine "LAPTOP-ELO01"

# Revoke all tokens for a user
python manage.py revoke_machine_token --user "staff@bpp.com"

# Skip confirmation prompt
python manage.py revoke_machine_token --machine "LAPTOP-ELO01" --force
```

### Replace a Token

If a token needs to be rotated (e.g., suspected compromise):

```bash
# 1. Revoke the old token
python manage.py revoke_machine_token --machine "LAPTOP-ELO01" --force

# 2. Create a new token
python manage.py create_machine_token --email staff@bpp.com --machine "LAPTOP-ELO01"

# 3. Update the bookmark on the staff machine with the new URL
```

---

## New Staff Onboarding Checklist

For each new staff member who needs admin access:

1. [ ] Create Django superuser account (or grant `is_superuser=True` to existing account)
2. [ ] Record the machine hostname (run `hostname` in PowerShell on staff machine)
3. [ ] Run `create_machine_token` with their email and machine name
4. [ ] Copy the generated URL
5. [ ] On the staff machine: add the URL as a browser bookmark
6. [ ] Test: click the bookmark and verify instant login
7. [ ] Record the machine name in your admin records for future reference

---

## Staff Offboarding Checklist

When a staff member leaves or loses admin access:

1. [ ] Revoke their machine token: `python manage.py revoke_machine_token --user "staff@bpp.com"`
2. [ ] Remove superuser privileges: set `is_superuser=False` in Django admin
3. [ ] Remove the bookmark from the staff machine (if accessible)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Login form appears instead of auto-login | Token missing from URL | Re-add the full URL with `#machine_token=...` to bookmark |
| "Machine login failed" error | Invalid or revoked token | Create a new token and update bookmark |
| "Machine login failed" error | Not on VPN | Connect to VPN first, then retry |
| "Machine login failed" error | User is not active superuser | Check user account in Django admin |
| Redirected to home page (`/`) | User is not a superuser | Grant `is_superuser=True` in Django admin |
| URL shows token after page load | Frontend issue | Clear browser cache, reload |

### Checking Server Logs

Machine login attempts are logged in Django. Look for:

```
# Successful login
INFO machine_login: user=EugeneLo@bpp.com machine=LAPTOP-ELO01 ip=7.32.3.4

# Failed attempts (check reason)
WARNING machine_login_failed: ip=7.32.3.4 reason=invalid_token
WARNING machine_login_failed: ip=192.168.1.5 reason=untrusted_network
WARNING machine_login_failed: ip=7.32.3.4 reason=user_not_eligible
WARNING machine_login_failed: ip=7.32.3.4 reason=inactive_token
```

---

## Architecture Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| MachineToken model | `backend/django_Admin3/core_auth/models.py` | Stores hashed tokens |
| Machine login endpoint | `POST /api/auth/machine-login/` | Validates token + network |
| Token hashing utility | `backend/django_Admin3/core_auth/utils.py` | HMAC-SHA256 with SECRET_KEY |
| Trusted subnets config | `settings/base.py` → `MACHINE_LOGIN_TRUSTED_SUBNETS` | VPN subnet allowlist |
| Frontend auto-login | `frontend/react-Admin3/src/hooks/useAuth.tsx` | Reads URL fragment on mount |
| Auth service method | `frontend/react-Admin3/src/services/authService.ts` | `machineLogin()` HTTP call |
| Management commands | `backend/django_Admin3/core_auth/management/commands/` | CLI token management |
