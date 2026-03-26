# Email Batch Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email batch visibility to the admin panel with a dashboard card, batch list page, and detail drawer.

**Architecture:** Backend adds a read-only ViewSet for batches with JWT auth (matching existing email admin pattern). Frontend adds MVVM components following the EmailQueueList pattern — a batch list page with status filter/pagination, a right-side drawer for batch email details, and a reusable To-address filter component.

**Tech Stack:** Django REST Framework ViewSet, React 19 + TypeScript, Lucide icons, shadcn-style admin UI components (AdminPage, AdminToggleGroup, Table, Badge, Button, Sheet).

---

## File Structure

### Backend (new files)
- `backend/django_Admin3/email_system/batch_admin_serializers.py` — Serializers for admin batch list and batch emails
- `backend/django_Admin3/email_system/batch_admin_views.py` — Read-only ViewSet with JWT/IsSuperUser auth
- `backend/django_Admin3/email_system/tests/test_batch_admin_views.py` — API tests

### Backend (modify)
- `backend/django_Admin3/email_system/urls.py` — Register new batch admin router

### Frontend (new files)
- `frontend/react-Admin3/src/types/email/emailBatch.types.ts` — Batch and batch-email type definitions
- `frontend/react-Admin3/src/components/admin/email/shared/EmailToFilter.tsx` — Reusable To address free-text filter
- `frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchListVM.ts` — ViewModel for batch list
- `frontend/react-Admin3/src/components/admin/email/batch/EmailBatchList.tsx` — Batch list page
- `frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchDrawerVM.ts` — ViewModel for drawer
- `frontend/react-Admin3/src/components/admin/email/batch/EmailBatchDrawer.tsx` — Right-side drawer

### Frontend (modify)
- `frontend/react-Admin3/src/types/email/index.ts` — Add barrel export for batch types
- `frontend/react-Admin3/src/services/emailService.ts` — Add batch API methods
- `frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx` — Add Batches nav item
- `frontend/react-Admin3/src/App.js` — Add lazy import and route
- `frontend/react-Admin3/src/pages/Dashboard.tsx` — Add EmailBatchCard
- `frontend/react-Admin3/src/components/admin/email/queue/EmailQueueList.tsx` — Add EmailToFilter
- `frontend/react-Admin3/src/components/admin/email/queue/useEmailQueueListVM.ts` — Add toFilter state + param

---

## Task 1: Backend Serializers

**Files:**
- Create: `backend/django_Admin3/email_system/batch_admin_serializers.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_admin_views.py`

- [ ] **Step 1: Write serializer tests**

Create `backend/django_Admin3/email_system/tests/test_batch_admin_views.py`:

```python
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from email_system.models import ExternalApiKey, EmailBatch, EmailTemplate, EmailQueue


class EmailBatchAdminSerializerTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.api_key = ExternalApiKey.objects.create(
            key_hash='test_hash_001',
            key_prefix='test0001',
            name='Test System',
        )
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject {{name}}',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='admin@acted.co.uk',
            notify_email='admin@acted.co.uk',
            status='completed',
            total_items=3,
            sent_count=3,
            error_count=0,
            api_key=self.api_key,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            batch=self.batch,
            to_emails=['user1@example.com'],
            subject='Test Subject User1',
            status='sent',
        )

    def test_batch_list_returns_template_name(self):
        response = self.client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 200)
        batch_data = response.data['results'][0]
        self.assertEqual(batch_data['template_name'], 'Test Template')

    def test_batch_list_fields(self):
        response = self.client.get('/api/email/batches/')
        batch_data = response.data['results'][0]
        expected_fields = {
            'batch_id', 'template', 'template_name', 'requested_by',
            'status', 'total_items', 'sent_count', 'error_count',
            'created_at', 'completed_at',
        }
        self.assertEqual(set(batch_data.keys()), expected_fields)

    def test_batch_emails_fields(self):
        response = self.client.get(f'/api/email/batches/{self.batch.batch_id}/emails/')
        self.assertEqual(response.status_code, 200)
        email_data = response.data['results'][0]
        expected_fields = {
            'id', 'queue_id', 'to_emails', 'subject',
            'status', 'sent_at', 'error_message',
        }
        self.assertEqual(set(email_data.keys()), expected_fields)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin_views.py -v`

Expected: FAIL — `/api/email/batches/` returns 404 (endpoint not registered yet)

- [ ] **Step 3: Write the serializers**

Create `backend/django_Admin3/email_system/batch_admin_serializers.py`:

```python
from rest_framework import serializers
from email_system.models import EmailBatch, EmailQueue


class EmailBatchListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(
        source='template.display_name', read_only=True, default=None
    )

    class Meta:
        model = EmailBatch
        fields = [
            'batch_id', 'template', 'template_name', 'requested_by',
            'status', 'total_items', 'sent_count', 'error_count',
            'created_at', 'completed_at',
        ]
        read_only_fields = fields


class EmailBatchEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailQueue
        fields = [
            'id', 'queue_id', 'to_emails', 'subject',
            'status', 'sent_at', 'error_message',
        ]
        read_only_fields = fields
```

- [ ] **Step 4: Commit serializers (tests still fail — endpoint not wired)**

```bash
git add backend/django_Admin3/email_system/batch_admin_serializers.py backend/django_Admin3/email_system/tests/test_batch_admin_views.py
git commit -m "feat(email): add batch admin serializers and test scaffolding"
```

---

## Task 2: Backend ViewSet and URL Routing

**Files:**
- Create: `backend/django_Admin3/email_system/batch_admin_views.py`
- Modify: `backend/django_Admin3/email_system/urls.py`
- Test: `backend/django_Admin3/email_system/tests/test_batch_admin_views.py`

- [ ] **Step 1: Add more tests for filtering, pagination, permissions**

Append to `test_batch_admin_views.py`:

```python
class EmailBatchAdminViewSetTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.regular_user = User.objects.create_user('regular', 'regular@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.api_key = ExternalApiKey.objects.create(
            key_hash='test_hash_002',
            key_prefix='test0002',
            name='Test System 2',
        )
        self.template = EmailTemplate.objects.create(
            name='viewset_template',
            display_name='ViewSet Template',
            subject_template='Subject',
        )
        self.batch_completed = EmailBatch.objects.create(
            template=self.template,
            requested_by='admin@acted.co.uk',
            notify_email='admin@acted.co.uk',
            status='completed',
            total_items=2,
            sent_count=2,
            error_count=0,
            api_key=self.api_key,
        )
        self.batch_failed = EmailBatch.objects.create(
            template=self.template,
            requested_by='system',
            notify_email='admin@acted.co.uk',
            status='failed',
            total_items=1,
            sent_count=0,
            error_count=1,
            api_key=self.api_key,
        )
        EmailQueue.objects.create(
            template=self.template,
            batch=self.batch_completed,
            to_emails=['alice@example.com'],
            subject='Hello Alice',
            status='sent',
        )
        EmailQueue.objects.create(
            template=self.template,
            batch=self.batch_completed,
            to_emails=['bob@example.com'],
            subject='Hello Bob',
            status='sent',
        )

    def test_list_returns_all_batches(self):
        response = self.client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)

    def test_list_filter_by_status(self):
        response = self.client.get('/api/email/batches/', {'status': 'failed'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['status'], 'failed')

    def test_list_limit_param(self):
        response = self.client.get('/api/email/batches/', {'limit': 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_batch(self):
        response = self.client.get(f'/api/email/batches/{self.batch_completed.batch_id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'completed')

    def test_emails_endpoint(self):
        response = self.client.get(f'/api/email/batches/{self.batch_completed.batch_id}/emails/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)

    def test_emails_filter_by_to(self):
        response = self.client.get(
            f'/api/email/batches/{self.batch_completed.batch_id}/emails/',
            {'to_email': 'alice'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertIn('alice@example.com', response.data['results'][0]['to_emails'])

    def test_non_superuser_denied(self):
        client = APIClient()
        client.force_authenticate(user=self.regular_user)
        response = client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_denied(self):
        client = APIClient()
        response = client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 401)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin_views.py -v`

Expected: FAIL — endpoint 404

- [ ] **Step 3: Write the ViewSet**

Create `backend/django_Admin3/email_system/batch_admin_views.py`:

```python
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from catalog.permissions import IsSuperUser
from email_system.models import EmailBatch, EmailQueue
from email_system.batch_admin_serializers import (
    EmailBatchListSerializer,
    EmailBatchEmailSerializer,
)


class EmailBatchAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only ViewSet for email batches in the admin panel."""

    queryset = EmailBatch.objects.select_related('template').all()
    serializer_class = EmailBatchListSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def list(self, request, *args, **kwargs):
        limit = request.query_params.get('limit')
        if limit:
            queryset = self.filter_queryset(self.get_queryset())[:int(limit)]
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data, 'count': len(serializer.data)})
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def emails(self, request, pk=None):
        batch = self.get_object()
        qs = EmailQueue.objects.filter(batch=batch).order_by('-created_at')

        to_email = request.query_params.get('to_email')
        if to_email:
            qs = qs.filter(to_emails__icontains=to_email)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = EmailBatchEmailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = EmailBatchEmailSerializer(qs, many=True)
        return Response({'results': serializer.data, 'count': qs.count()})
```

- [ ] **Step 4: Register the URL**

In `backend/django_Admin3/email_system/urls.py`, add import and registration:

Add after existing imports:
```python
from email_system import batch_admin_views
```

Add before `urlpatterns`:
```python
router.register(r'batches', batch_admin_views.EmailBatchAdminViewSet)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin_views.py -v`

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/email_system/batch_admin_views.py backend/django_Admin3/email_system/urls.py backend/django_Admin3/email_system/tests/test_batch_admin_views.py
git commit -m "feat(email): add batch admin viewset with list, detail, emails endpoints"
```

---

## Task 3: Frontend Types and Service Methods

**Files:**
- Create: `frontend/react-Admin3/src/types/email/emailBatch.types.ts`
- Modify: `frontend/react-Admin3/src/types/email/index.ts`
- Modify: `frontend/react-Admin3/src/services/emailService.ts`

- [ ] **Step 1: Create batch types**

Create `frontend/react-Admin3/src/types/email/emailBatch.types.ts`:

```typescript
export type BatchStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'completed_with_errors'
    | 'failed';

export interface EmailBatch {
    batch_id: string;
    template: number;
    template_name: string | null;
    requested_by: string;
    status: BatchStatus;
    total_items: number;
    sent_count: number;
    error_count: number;
    created_at: string;
    completed_at: string | null;
}

export interface EmailBatchEmail {
    id: number;
    queue_id: string;
    to_emails: string[];
    subject: string;
    status: string;
    sent_at: string | null;
    error_message: string;
}
```

- [ ] **Step 2: Add barrel export**

In `frontend/react-Admin3/src/types/email/index.ts`, add:

```typescript
export * from './emailBatch.types';
```

- [ ] **Step 3: Add service methods**

In `frontend/react-Admin3/src/services/emailService.ts`, add before the closing `};`:

```typescript
    // ─── Batches (Admin) ───────────────────────────────────────
    getBatches: async (params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/batches/`, { params });
        return parsePaginatedResponse(response.data);
    },

    getBatchById: async (batchId: string) => {
        const response = await httpService.get(`${BASE_URL}/batches/${batchId}/`);
        return response.data;
    },

    getBatchEmails: async (batchId: string, params: Record<string, any> = {}) => {
        const response = await httpService.get(`${BASE_URL}/batches/${batchId}/emails/`, { params });
        return parsePaginatedResponse(response.data);
    },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/types/email/emailBatch.types.ts frontend/react-Admin3/src/types/email/index.ts frontend/react-Admin3/src/services/emailService.ts
git commit -m "feat(email): add batch types and service methods"
```

---

## Task 4: Reusable EmailToFilter Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/shared/EmailToFilter.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/react-Admin3/src/components/admin/email/shared/EmailToFilter.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface EmailToFilterProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
}

const EmailToFilter: React.FC<EmailToFilterProps> = ({
    value,
    onChange,
    placeholder = 'Filter by recipient...',
    debounceMs = 300,
}) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, debounceMs);
        return () => clearTimeout(timer);
    }, [localValue, debounceMs, onChange, value]);

    return (
        <div className="tw:flex tw:items-center tw:gap-2">
            <Search className="tw:size-4 tw:text-admin-fg-muted tw:shrink-0" />
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                className="tw:h-8 tw:w-full tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-3 tw:text-sm tw:placeholder:text-admin-fg-muted focus:tw:outline-none focus:tw:ring-1 focus:tw:ring-admin-ring"
            />
        </div>
    );
};

export default EmailToFilter;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/shared/EmailToFilter.tsx
git commit -m "feat(email): add reusable EmailToFilter component"
```

---

## Task 5: EmailBatchList ViewModel

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchListVM.ts`

- [ ] **Step 1: Create the ViewModel**

Create `frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchListVM.ts`:

```typescript
import { useState, useCallback } from 'react';
import emailService from '../../../../services/emailService';
import type { EmailBatch, BatchStatus } from '../../../../types/email';

interface EmailBatchListVM {
    batches: EmailBatch[];
    loading: boolean;
    error: string | null;
    statusFilter: BatchStatus | 'all';
    page: number;
    rowsPerPage: number;
    totalCount: number;
    selectedBatchId: string | null;
    fetchBatches: () => Promise<void>;
    handleStatusFilter: (status: BatchStatus | 'all') => void;
    handleSelectBatch: (batchId: string) => void;
    handleCloseDrawer: () => void;
    handleChangePage: (event: unknown, newPage: number) => void;
    handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const useEmailBatchListVM = (): EmailBatchListVM => {
    const [batches, setBatches] = useState<EmailBatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    const fetchBatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = {
                page: page + 1,
                page_size: rowsPerPage,
            };
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            const response = await emailService.getBatches(params);
            setBatches(response.results);
            setTotalCount(response.count);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load batches');
            setBatches([]);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, statusFilter]);

    const handleStatusFilter = useCallback((status: BatchStatus | 'all') => {
        setStatusFilter(status);
        setPage(0);
    }, []);

    const handleSelectBatch = useCallback((batchId: string) => {
        setSelectedBatchId(batchId);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setSelectedBatchId(null);
    }, []);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    return {
        batches,
        loading,
        error,
        statusFilter,
        page,
        rowsPerPage,
        totalCount,
        selectedBatchId,
        fetchBatches,
        handleStatusFilter,
        handleSelectBatch,
        handleCloseDrawer,
        handleChangePage,
        handleChangeRowsPerPage,
    };
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchListVM.ts
git commit -m "feat(email): add EmailBatchList ViewModel"
```

---

## Task 6: EmailBatchDrawer ViewModel

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchDrawerVM.ts`

- [ ] **Step 1: Create the ViewModel**

Create `frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchDrawerVM.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react';
import emailService from '../../../../services/emailService';
import type { EmailBatch, EmailBatchEmail } from '../../../../types/email';

interface EmailBatchDrawerVM {
    batch: EmailBatch | null;
    emails: EmailBatchEmail[];
    loading: boolean;
    error: string | null;
    toFilter: string;
    totalCount: number;
    setToFilter: (value: string) => void;
}

export const useEmailBatchDrawerVM = (batchId: string | null): EmailBatchDrawerVM => {
    const [batch, setBatch] = useState<EmailBatch | null>(null);
    const [emails, setEmails] = useState<EmailBatchEmail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toFilter, setToFilter] = useState('');
    const [totalCount, setTotalCount] = useState(0);

    const fetchBatch = useCallback(async () => {
        if (!batchId) return;
        try {
            const data = await emailService.getBatchById(batchId);
            setBatch(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load batch');
        }
    }, [batchId]);

    const fetchEmails = useCallback(async () => {
        if (!batchId) return;
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = { page_size: 50 };
            if (toFilter) {
                params.to_email = toFilter;
            }
            const response = await emailService.getBatchEmails(batchId, params);
            setEmails(response.results);
            setTotalCount(response.count);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load emails');
            setEmails([]);
        } finally {
            setLoading(false);
        }
    }, [batchId, toFilter]);

    useEffect(() => {
        if (batchId) {
            setBatch(null);
            setEmails([]);
            setToFilter('');
            fetchBatch();
            fetchEmails();
        }
    }, [batchId, fetchBatch, fetchEmails]);

    return {
        batch,
        emails,
        loading,
        error,
        toFilter,
        totalCount,
        setToFilter,
    };
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/batch/useEmailBatchDrawerVM.ts
git commit -m "feat(email): add EmailBatchDrawer ViewModel"
```

---

## Task 7: EmailBatchDrawer Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/batch/EmailBatchDrawer.tsx`

- [ ] **Step 1: Create the drawer component**

Create `frontend/react-Admin3/src/components/admin/email/batch/EmailBatchDrawer.tsx`:

```tsx
import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import EmailToFilter from '../shared/EmailToFilter';
import { useEmailBatchDrawerVM } from './useEmailBatchDrawerVM';
import type { BatchStatus } from '../../../../types/email';

const STATUS_BADGE_CLASS: Record<BatchStatus, string> = {
    pending: 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted',
    processing: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    completed: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    completed_with_errors: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    failed: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
    pending: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'With Errors',
    failed: 'Failed',
};

const EMAIL_STATUS_CLASS: Record<string, string> = {
    pending: 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted',
    processing: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    sent: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    failed: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
    cancelled: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    retry: 'tw:border-purple-200 tw:bg-purple-50 tw:text-purple-700',
};

const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
};

interface EmailBatchDrawerProps {
    batchId: string | null;
    onClose: () => void;
}

const EmailBatchDrawer: React.FC<EmailBatchDrawerProps> = ({ batchId, onClose }) => {
    const vm = useEmailBatchDrawerVM(batchId);

    if (!batchId) return null;

    return (
        <div className="tw:fixed tw:inset-y-0 tw:right-0 tw:w-[480px] tw:bg-white tw:border-l tw:border-admin-border tw:shadow-lg tw:z-50 tw:flex tw:flex-col">
            {/* Header */}
            <div className="tw:flex tw:items-center tw:justify-between tw:px-4 tw:py-3 tw:border-b tw:border-admin-border">
                <div>
                    <h3 className="tw:text-sm tw:font-semibold tw:text-admin-fg">
                        {vm.batch?.template_name || 'Loading...'}
                    </h3>
                    <p className="tw:text-xs tw:text-admin-fg-muted tw:mt-0.5">
                        Batch {batchId.substring(0, 8)} · {vm.batch?.total_items ?? '...'} emails
                    </p>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={onClose}>
                    <X className="tw:size-4" />
                </Button>
            </div>

            {/* Summary bar */}
            {vm.batch && (
                <div className="tw:flex tw:items-center tw:gap-4 tw:px-4 tw:py-2 tw:bg-admin-bg-muted tw:border-b tw:border-admin-border tw:text-xs">
                    <div className="tw:flex tw:items-center tw:gap-1.5">
                        <span className="tw:text-admin-fg-muted">Status:</span>
                        <Badge variant="outline" className={STATUS_BADGE_CLASS[vm.batch.status]}>
                            {STATUS_LABEL[vm.batch.status]}
                        </Badge>
                    </div>
                    <div>
                        <span className="tw:text-admin-fg-muted">Sent:</span>{' '}
                        <span className="tw:font-medium">{vm.batch.sent_count}/{vm.batch.total_items}</span>
                    </div>
                    <div>
                        <span className="tw:text-admin-fg-muted">Errors:</span>{' '}
                        <span className="tw:font-medium">{vm.batch.error_count}</span>
                    </div>
                </div>
            )}

            {/* To filter */}
            <div className="tw:px-4 tw:py-2 tw:border-b tw:border-admin-border">
                <EmailToFilter
                    value={vm.toFilter}
                    onChange={vm.setToFilter}
                    placeholder="Filter by recipient..."
                />
            </div>

            {/* Email list */}
            <div className="tw:flex-1 tw:overflow-y-auto">
                {vm.loading ? (
                    <div className="tw:p-4 tw:text-sm tw:text-admin-fg-muted">Loading...</div>
                ) : vm.emails.length === 0 ? (
                    <div className="tw:p-4 tw:text-sm tw:text-admin-fg-muted">No emails found.</div>
                ) : (
                    vm.emails.map((email) => (
                        <a
                            key={email.id}
                            href={`/admin/email/queue/${email.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tw:flex tw:items-center tw:gap-2 tw:px-4 tw:py-2 tw:border-b tw:border-admin-border/50 tw:text-xs hover:tw:bg-admin-bg-muted tw:no-underline tw:text-inherit tw:cursor-pointer"
                        >
                            <div className="tw:flex-1 tw:min-w-0">
                                <div className="tw:text-admin-fg tw:truncate">
                                    {email.to_emails.length > 0 ? email.to_emails[0] : '-'}
                                </div>
                                <div className="tw:text-admin-fg-muted tw:truncate tw:mt-0.5" style={{ fontSize: '10px' }}>
                                    {email.subject || '-'}
                                </div>
                            </div>
                            <Badge variant="outline" className={EMAIL_STATUS_CLASS[email.status] || ''}>
                                {email.status}
                            </Badge>
                            <span className="tw:text-admin-fg-muted tw:whitespace-nowrap">
                                {email.status === 'failed' && email.error_message
                                    ? email.error_message.substring(0, 20)
                                    : formatRelativeTime(email.sent_at)}
                            </span>
                            <ExternalLink className="tw:size-3 tw:text-admin-fg-muted tw:shrink-0" />
                        </a>
                    ))
                )}
                {vm.totalCount > vm.emails.length && (
                    <div className="tw:p-2 tw:text-center tw:text-xs tw:text-admin-fg-muted">
                        Showing {vm.emails.length} of {vm.totalCount}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailBatchDrawer;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/batch/EmailBatchDrawer.tsx
git commit -m "feat(email): add EmailBatchDrawer component"
```

---

## Task 8: EmailBatchList Page Component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/email/batch/EmailBatchList.tsx`

- [ ] **Step 1: Create the page component**

Create `frontend/react-Admin3/src/components/admin/email/batch/EmailBatchList.tsx`:

```tsx
import React, { useEffect } from 'react';
import {
    AdminPage,
    AdminPageHeader,
    AdminErrorAlert,
    AdminLoadingState,
    AdminToggleGroup,
} from '@/components/admin/composed';
import { Badge } from '@/components/admin/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/admin/ui/table';
import { Button } from '@/components/admin/ui/button';
import { useEmailBatchListVM } from './useEmailBatchListVM';
import EmailBatchDrawer from './EmailBatchDrawer';
import type { BatchStatus } from '../../../../types/email';

const STATUS_BADGE_CLASS: Record<BatchStatus, string> = {
    pending: 'tw:border-admin-border tw:bg-admin-bg-muted tw:text-admin-fg-muted',
    processing: 'tw:border-blue-200 tw:bg-blue-50 tw:text-blue-700',
    completed: 'tw:border-admin-success/30 tw:bg-admin-success/10 tw:text-admin-success',
    completed_with_errors: 'tw:border-amber-200 tw:bg-amber-50 tw:text-amber-700',
    failed: 'tw:border-admin-destructive/30 tw:bg-admin-destructive/10 tw:text-admin-destructive',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
    pending: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'With Errors',
    failed: 'Failed',
};

const STATUS_OPTIONS: Array<BatchStatus | 'all'> = [
    'all',
    'pending',
    'processing',
    'completed',
    'completed_with_errors',
    'failed',
];

const STATUS_OPTION_LABELS: Record<string, string> = {
    all: 'All',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'With Errors',
    failed: 'Failed',
};

const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
};

const EmailBatchList: React.FC = () => {
    const vm = useEmailBatchListVM();

    useEffect(() => {
        vm.fetchBatches();
    }, [vm.fetchBatches]);

    return (
        <AdminPage>
            <AdminPageHeader title="Email Batches" />

            <AdminToggleGroup
                options={STATUS_OPTIONS.map(s => ({
                    value: s,
                    label: STATUS_OPTION_LABELS[s] || s,
                }))}
                value={vm.statusFilter}
                onChange={vm.handleStatusFilter}
                className="tw:mb-4"
            />

            <AdminErrorAlert message={vm.error} />

            {vm.loading ? (
                <AdminLoadingState rows={5} columns={7} />
            ) : vm.batches.length === 0 && !vm.error ? (
                <div role="alert" className="tw:rounded-md tw:border tw:border-blue-200 tw:bg-blue-50 tw:p-4 tw:text-sm tw:text-blue-800">
                    No batches found.
                </div>
            ) : (
                <>
                    <div className="tw:rounded-md tw:border tw:border-admin-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead className="tw:text-center">Sent</TableHead>
                                    <TableHead className="tw:text-center">Errors</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vm.batches.map((batch) => (
                                    <TableRow
                                        key={batch.batch_id}
                                        className={`tw:cursor-pointer ${vm.selectedBatchId === batch.batch_id ? 'tw:bg-blue-50' : ''}`}
                                        onClick={() => vm.handleSelectBatch(batch.batch_id)}
                                    >
                                        <TableCell>
                                            <span className="tw:font-mono tw:text-xs" title={batch.batch_id}>
                                                {batch.batch_id.substring(0, 8)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{batch.template_name || '-'}</TableCell>
                                        <TableCell>{batch.requested_by}</TableCell>
                                        <TableCell className="tw:text-center">
                                            {batch.sent_count}/{batch.total_items}
                                        </TableCell>
                                        <TableCell className="tw:text-center">
                                            {batch.error_count}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={STATUS_BADGE_CLASS[batch.status]}>
                                                {STATUS_LABEL[batch.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="tw:text-sm" title={batch.created_at ? new Date(batch.created_at).toLocaleString() : ''}>
                                                {formatRelativeTime(batch.created_at)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="tw:flex tw:items-center tw:justify-between tw:px-2 tw:py-4 tw:text-sm tw:text-admin-fg-muted">
                        <span>
                            Showing {vm.page * vm.rowsPerPage + 1}&ndash;{Math.min((vm.page + 1) * vm.rowsPerPage, vm.totalCount)} of {vm.totalCount}
                        </span>
                        <div className="tw:flex tw:items-center tw:gap-4">
                            <div className="tw:flex tw:items-center tw:gap-2">
                                <span>Rows per page</span>
                                <select
                                    className="tw:h-8 tw:rounded-md tw:border tw:border-admin-border tw:bg-transparent tw:px-2 tw:text-sm"
                                    value={vm.rowsPerPage}
                                    onChange={(e) => vm.handleChangeRowsPerPage(e as any)}
                                >
                                    {[10, 25, 50, 100].map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="tw:flex tw:items-center tw:gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={vm.page === 0}
                                    onClick={(e) => vm.handleChangePage(e, vm.page - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={(vm.page + 1) * vm.rowsPerPage >= vm.totalCount}
                                    onClick={(e) => vm.handleChangePage(e, vm.page + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Batch Detail Drawer */}
            <EmailBatchDrawer
                batchId={vm.selectedBatchId}
                onClose={vm.handleCloseDrawer}
            />
        </AdminPage>
    );
};

export default EmailBatchList;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/batch/EmailBatchList.tsx
git commit -m "feat(email): add EmailBatchList page component"
```

---

## Task 9: Dashboard EmailBatchCard

**Files:**
- Modify: `frontend/react-Admin3/src/pages/Dashboard.tsx`

- [ ] **Step 1: Rewrite Dashboard.tsx to include the batch card**

Replace the contents of `frontend/react-Admin3/src/pages/Dashboard.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import emailService from '../services/emailService';
import type { EmailBatch, BatchStatus } from '../types/email';

const STATUS_BADGE: Record<BatchStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: 'tw:bg-gray-100', text: 'tw:text-gray-600', label: 'Queued' },
    processing: { bg: 'tw:bg-blue-50', text: 'tw:text-blue-700', label: 'Processing' },
    completed: { bg: 'tw:bg-green-50', text: 'tw:text-green-700', label: 'Completed' },
    completed_with_errors: { bg: 'tw:bg-amber-50', text: 'tw:text-amber-700', label: 'With Errors' },
    failed: { bg: 'tw:bg-red-50', text: 'tw:text-red-700', label: 'Failed' },
};

const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
};

export default function Dashboard() {
    const { user } = useAuth() as any;
    const firstName = user?.first_name || 'Admin';
    const [batches, setBatches] = useState<EmailBatch[]>([]);

    useEffect(() => {
        emailService.getBatches({ limit: 5 }).then((res) => {
            setBatches(res.results);
        }).catch(() => {});
    }, []);

    return (
        <div>
            <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-[var(--foreground)]">
                Dashboard
            </h1>
            <p className="tw:text-[var(--muted-foreground)] tw:mt-1">
                Welcome back, {firstName}.
            </p>

            <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:mt-6 md:tw:grid-cols-3">
                {['Total Orders', 'Active Sessions', 'Pending Items'].map((title) => (
                    <div
                        key={title}
                        className="tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)] tw:p-6"
                    >
                        <p className="tw:text-sm tw:text-[var(--muted-foreground)]">{title}</p>
                        <p className="tw:text-2xl tw:font-bold tw:text-[var(--foreground)] tw:mt-1">—</p>
                    </div>
                ))}
            </div>

            {/* Email Batches Card */}
            <div className="tw:mt-6 tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)]">
                <div className="tw:flex tw:items-center tw:justify-between tw:px-4 tw:py-2.5 tw:border-b tw:border-[var(--border)]">
                    <span className="tw:text-sm tw:font-semibold tw:text-[var(--foreground)]">Email Batches</span>
                    <Link
                        to="/admin/email/batches"
                        className="tw:text-xs tw:text-blue-600 hover:tw:underline tw:no-underline"
                    >
                        View all →
                    </Link>
                </div>
                {batches.length === 0 ? (
                    <div className="tw:px-4 tw:py-3 tw:text-xs tw:text-[var(--muted-foreground)]">
                        No recent batches.
                    </div>
                ) : (
                    batches.map((batch, idx) => {
                        const style = STATUS_BADGE[batch.status];
                        return (
                            <div
                                key={batch.batch_id}
                                className={`tw:flex tw:items-center tw:gap-2 tw:px-4 tw:py-2 ${idx < batches.length - 1 ? 'tw:border-b tw:border-[var(--border)]/50' : ''}`}
                            >
                                <div className="tw:flex-1 tw:min-w-0">
                                    <div className="tw:flex tw:items-center tw:gap-1.5">
                                        <span className="tw:text-xs tw:text-[var(--foreground)] tw:font-medium tw:truncate">
                                            {batch.template_name || 'Unknown'}
                                        </span>
                                        <span className="tw:text-[10px] tw:text-[var(--muted-foreground)]">
                                            {batch.sent_count}/{batch.total_items}
                                        </span>
                                    </div>
                                    <div className="tw:text-[10px] tw:text-[var(--muted-foreground)] tw:mt-0.5">
                                        {batch.requested_by} · {formatRelativeTime(batch.created_at)}
                                    </div>
                                </div>
                                <span
                                    className={`tw:text-[10px] tw:px-1.5 tw:py-0.5 tw:rounded-full tw:font-medium tw:whitespace-nowrap ${style.bg} ${style.text}`}
                                >
                                    {style.label}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/react-Admin3/src/pages/Dashboard.tsx
git commit -m "feat(email): add EmailBatchCard to dashboard"
```

---

## Task 10: Routing and Sidebar

**Files:**
- Modify: `frontend/react-Admin3/src/App.js`
- Modify: `frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx`

- [ ] **Step 1: Add lazy import to App.js**

In `frontend/react-Admin3/src/App.js`, after line 93 (`EmailQueueDuplicateForm`), add:

```javascript
const EmailBatchList = React.lazy(() => import("./components/admin/email/batch/EmailBatchList"));
```

- [ ] **Step 2: Add route to App.js**

In the routes section (after the queue routes around line 304), add:

```jsx
<Route path="/admin/email/batches" element={<EmailBatchList />} />
```

- [ ] **Step 3: Add sidebar nav item**

In `frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx`, add the import for `Layers` icon (already imported) and add a new item to the Email System group. After the Queue entry `{ label: 'Queue', path: '/admin/email/queue', icon: ListOrdered }`, add:

```typescript
{ label: 'Batches', path: '/admin/email/batches', icon: Layers },
```

Note: `Layers` is already imported. If you want a distinct icon, use `Package` instead — but `Layers` fits well for batches. Actually, let's use a more fitting icon. Add `Mail` to the imports from lucide-react and use:

```typescript
{ label: 'Batches', path: '/admin/email/batches', icon: Mail },
```

Add `Mail` to the import line at the top of AppSidebar.tsx:

```typescript
import {
  // ... existing imports ...
  Mail,
} from 'lucide-react';
```

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/App.js frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx
git commit -m "feat(email): add batch list route and sidebar navigation"
```

---

## Task 11: Integrate EmailToFilter into EmailQueueList

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/email/queue/useEmailQueueListVM.ts`
- Modify: `frontend/react-Admin3/src/components/admin/email/queue/EmailQueueList.tsx`

- [ ] **Step 1: Add toFilter state to the ViewModel**

In `frontend/react-Admin3/src/components/admin/email/queue/useEmailQueueListVM.ts`:

Add `toFilter` state and expose it. Add to the interface:

```typescript
toFilter: string;
handleToFilter: (value: string) => void;
```

Add state:

```typescript
const [toFilter, setToFilter] = useState('');
```

In `fetchQueue`, add `to_email` param if set:

```typescript
if (toFilter) {
    params.to_email = toFilter;
}
```

Add `toFilter` to the `useCallback` dependency array for `fetchQueue`.

Add handler:

```typescript
const handleToFilter = useCallback((value: string) => {
    setToFilter(value);
    setPage(0);
}, []);
```

Return `toFilter` and `handleToFilter` from the hook.

- [ ] **Step 2: Add EmailToFilter to EmailQueueList.tsx**

In `frontend/react-Admin3/src/components/admin/email/queue/EmailQueueList.tsx`, add import:

```typescript
import EmailToFilter from '../shared/EmailToFilter';
```

Add the filter below the `AdminToggleGroup`, before `AdminErrorAlert`:

```tsx
<div className="tw:mb-4 tw:max-w-sm">
    <EmailToFilter
        value={vm.toFilter}
        onChange={vm.handleToFilter}
        placeholder="Filter by recipient email..."
    />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/email/queue/useEmailQueueListVM.ts frontend/react-Admin3/src/components/admin/email/queue/EmailQueueList.tsx
git commit -m "feat(email): integrate EmailToFilter into EmailQueueList"
```

---

## Task 12: Backend to_email Filter for Queue

**Files:**
- Modify: `backend/django_Admin3/email_system/views.py` (EmailQueueViewSet.get_queryset)
- Test: `backend/django_Admin3/email_system/tests/test_batch_admin_views.py`

- [ ] **Step 1: Write a test for queue to_email filtering**

Append to `test_batch_admin_views.py`:

```python
class EmailQueueToFilterTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin3', 'admin3@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.template = EmailTemplate.objects.create(
            name='queue_filter_template',
            display_name='Queue Filter',
            subject_template='Subject',
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['alice@example.com'],
            subject='Hello Alice',
            status='sent',
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['bob@example.com'],
            subject='Hello Bob',
            status='sent',
        )

    def test_queue_filter_by_to_email(self):
        response = self.client.get('/api/email/queue/', {'to_email': 'alice'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_queue_no_filter_returns_all(self):
        response = self.client.get('/api/email/queue/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)
```

- [ ] **Step 2: Run test to verify filter test fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin_views.py::EmailQueueToFilterTest -v`

Expected: `test_queue_filter_by_to_email` FAILS (filter not implemented)

- [ ] **Step 3: Add to_email filter to EmailQueueViewSet**

In `backend/django_Admin3/email_system/views.py`, in `EmailQueueViewSet.get_queryset()`, after the existing status filter, add:

```python
to_email = self.request.query_params.get('to_email')
if to_email:
    qs = qs.filter(to_emails__icontains=to_email)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/test_batch_admin_views.py -v`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/email_system/views.py backend/django_Admin3/email_system/tests/test_batch_admin_views.py
git commit -m "feat(email): add to_email filter to queue and batch email endpoints"
```

---

## Task 13: Final Integration Test

- [ ] **Step 1: Run full backend test suite for email_system**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest email_system/tests/ -v`

Expected: All tests PASS (existing + new)

- [ ] **Step 2: Run frontend build to check for TypeScript errors**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Final commit if any fixes needed**

Fix any issues discovered, commit with appropriate message.
