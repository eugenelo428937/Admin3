# Email Batch Admin — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Overview

Add email batch visibility to the admin panel: a dashboard card showing the latest 5 batches and a full EmailBatchList page with a detail drawer.

## Components

### 1. Dashboard Email Batch Card

A compact card on the admin Dashboard (`/`) showing the 5 most recent batches.

**Layout per row (two lines):**
- **Line 1:** Template name + sent_count/total_items counter
- **Line 2:** requested_by · relative time

**Status badge** (right-aligned) with 5 statuses:

| Backend status | Display label | Badge color |
|---|---|---|
| `pending` | Queued | Gray |
| `processing` | Processing | Blue |
| `completed` | Completed | Green |
| `completed_with_errors` | With Errors | Amber |
| `failed` | Failed | Red |

**Card header:** "Email Batches" title + "View all →" link navigating to `/admin/email/batches`.

### 2. EmailBatchList Page

**Route:** `/admin/email/batches`

**Sidebar:** Add "Batches" entry to the Email System group in `AppSidebar.tsx`.

**Table columns:**
- Batch ID (first 8 chars, monospace)
- Template name
- Requested By
- Sent (sent_count/total_items)
- Errors (error_count)
- Status (color-coded badge)
- Created (relative time)

**Status toggle filter:** All | Pending | Processing | Completed | With Errors | Failed — same `AdminToggleGroup` pattern as `EmailQueueList.tsx`.

**Pagination:** Same pattern as EmailQueueList (rows per page selector, previous/next).

**Row click:** Opens the batch detail drawer (right side). Selected row is highlighted.

### 3. Batch Detail Drawer

A right-anchored Drawer that slides in when a batch row is clicked.

**Header:** Template name, batch ID (truncated), total email count, close (✕) button.

**Summary bar:** Status badge, sent_count/total_items, error_count.

**To filter combobox:** Free-text input that filters the email list by recipient address. This is a reusable `EmailToFilter` component.

**Email list rows:**
- To (recipient email)
- Subject
- Status badge (sent/failed/pending etc.)
- Sent time, or error snippet if failed
- ↗ icon — clicking the row opens `/admin/email/queue/:id` in a **new browser tab**

**Scrollable** email list with "Showing X of Y" indicator.

### 4. Reusable EmailToFilter Component

A free-text combobox component for filtering emails by "To" address. Used in:
- Batch detail drawer (filters emails within a batch)
- `EmailQueueList.tsx` (filters the global queue)

**Behavior:** User types freely, input filters results as-they-go (client-side for drawer, query param for queue list).

## Backend API

### New: Batch List/Detail Admin Endpoints

Add a `EmailBatchAdminViewSet` to `email_system/views.py` (or a new `batch_admin_views.py`) with JWT authentication (same as other admin viewsets, `IsSuperUser` permission).

**Endpoints:**

| Method | URL | Description |
|---|---|---|
| GET | `/api/email/batches/` | List batches (paginated, filterable by status) |
| GET | `/api/email/batches/{batch_id}/` | Batch detail |
| GET | `/api/email/batches/{batch_id}/emails/` | Emails in batch (paginated, filterable by to_email) |

**List response fields:** batch_id, template (id + name), requested_by, status, total_items, sent_count, error_count, created_at, completed_at.

**Emails response fields:** id, queue_id, to_emails, subject, status, sent_at, error_message.

**Query params:**
- `batches/`: `status` (filter), `page`, `page_size`, `limit` (for dashboard card: `?limit=5`)
- `batches/{id}/emails/`: `to_email` (free-text search), `page`, `page_size`

### Serializers

- `EmailBatchListSerializer` — batch list with template name (nested read-only)
- `EmailBatchEmailSerializer` — queue items belonging to a batch (slim fields only)

## Frontend Architecture

### File Structure

```
src/
  components/admin/email/
    batch/
      EmailBatchList.tsx          # Batch list page
      useEmailBatchListVM.ts      # ViewModel for batch list
      EmailBatchDrawer.tsx         # Right-side drawer with email list
      useEmailBatchDrawerVM.ts     # ViewModel for drawer
    queue/
      EmailQueueList.tsx           # Existing — add EmailToFilter
      useEmailQueueListVM.ts       # Existing — add to_email filter param
    shared/
      EmailToFilter.tsx            # Reusable To address filter combobox
  pages/
    Dashboard.tsx                  # Add EmailBatchCard
  services/
    emailService.ts               # Add batch list/detail/emails methods
  types/email/
    emailBatch.types.ts            # New batch types
```

### MVVM Pattern

Following the existing `useEmailQueueListVM` pattern:
- `useEmailBatchListVM` manages batch list state, status filter, pagination, selected batch
- `useEmailBatchDrawerVM` manages drawer state, email list, to_email filter, pagination

### Routing

Add to `App.js`:
```
/admin/email/batches → EmailBatchList
```

### Dashboard Integration

Add `EmailBatchCard` component to `Dashboard.tsx` alongside existing placeholder cards. Fetches batches with `?limit=5` on mount.

## Decisions

- **JWT auth only** for admin batch endpoints (not external API key)
- **5 distinct statuses** displayed (pending, processing, completed, completed_with_errors, failed)
- **Drawer approach** for batch detail (preserves batch list context)
- **Free-text filter** for To address (not pre-populated dropdown)
- **New tab** for individual email detail navigation
- **Reusable EmailToFilter** component shared between drawer and EmailQueueList
