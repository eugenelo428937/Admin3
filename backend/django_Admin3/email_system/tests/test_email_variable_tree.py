"""Backend tests for Section 1 (schema + validation + migration + admin) and
Section 2 (tree API) of the email variable picker design spec
(docs/superpowers/specs/2026-04-08-email-variable-picker-design.md).
"""
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase, RequestFactory
from django.urls import reverse
from rest_framework.test import APITestCase

from email_system.admin import EmailVariableAdmin  # noqa: F401  (registered via admin package)
from email_system.models import EmailVariable
from django.contrib.admin.sites import AdminSite


# ---------------------------------------------------------------------------
# Section 1 — schema + clean()
# ---------------------------------------------------------------------------


class EmailVariableSchemaTest(TestCase):
    """data_type accepts new container types and rejects unknown values."""

    def test_accepts_object_data_type(self):
        v = EmailVariable(
            display_name='User',
            variable_path='user_obj',
            data_type='object',
        )
        v.full_clean()  # should not raise

    def test_accepts_array_data_type(self):
        v = EmailVariable(
            display_name='Items',
            variable_path='items_arr[]',
            data_type='array',
        )
        v.full_clean()

    def test_rejects_unknown_data_type(self):
        v = EmailVariable(
            display_name='Bad',
            variable_path='bad',
            data_type='bogus',
        )
        with self.assertRaises(ValidationError):
            v.full_clean()


class EmailVariablePathValidationTest(TestCase):
    """clean() enforces the three path-shape rules."""

    def test_malformed_bracket_suffix_rejected(self):
        for bad in ('items[]x', 'items[', 'items[]]', '[]', 'items[0]'):
            v = EmailVariable(
                display_name='Bad',
                variable_path=bad,
                data_type='string',
            )
            with self.assertRaises(ValidationError, msg=f'path={bad!r} should fail'):
                v.full_clean()

    def test_array_segment_without_array_row_rejected(self):
        # No 'order.items[]' array row exists; saving a descendant must fail.
        EmailVariable.objects.create(
            display_name='Order',
            variable_path='order',
            data_type='object',
        )
        v = EmailVariable(
            display_name='Amount',
            variable_path='order.items[].amount',
            data_type='float',
        )
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_array_segment_with_correct_array_row_accepted(self):
        EmailVariable.objects.create(
            display_name='Order',
            variable_path='order',
            data_type='object',
        )
        EmailVariable.objects.create(
            display_name='Items',
            variable_path='order.items[]',
            data_type='array',
        )
        v = EmailVariable(
            display_name='Amount',
            variable_path='order.items[].amount',
            data_type='float',
        )
        v.full_clean()  # should not raise

    def test_array_row_itself_must_have_array_type(self):
        # Saving the foo[] path with a non-array type should fail.
        EmailVariable.objects.create(
            display_name='Order',
            variable_path='order',
            data_type='object',
        )
        v = EmailVariable(
            display_name='Items',
            variable_path='order.items[]',
            data_type='object',  # wrong — foo[] path must be 'array'
        )
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_array_row_at_foo_bracket_saves_cleanly(self):
        EmailVariable.objects.create(
            display_name='Order',
            variable_path='order',
            data_type='object',
        )
        v = EmailVariable(
            display_name='Items',
            variable_path='order.items[]',
            data_type='array',
        )
        v.full_clean()  # self-reference short-circuits rule 2
        v.save()
        self.assertEqual(v.data_type, 'array')

    def test_container_rows_reject_nonempty_default(self):
        v = EmailVariable(
            display_name='User',
            variable_path='user_obj2',
            data_type='object',
            default_value='something',
        )
        with self.assertRaises(ValidationError):
            v.full_clean()

        v2 = EmailVariable(
            display_name='Items',
            variable_path='items_arr2[]',
            data_type='array',
            default_value='something',
        )
        with self.assertRaises(ValidationError):
            v2.full_clean()


# ---------------------------------------------------------------------------
# Migration 0032 — backfill container rows
# ---------------------------------------------------------------------------


class BackfillMigrationTest(TestCase):
    """The migration ran as part of the test DB setup. Verify its invariants
    by invoking the helper directly on runtime data."""

    def test_helper_creates_title_cased_ancestor_rows(self):
        # Seed raw via _base_manager to bypass clean() — simulates pre-strict data.
        EmailVariable.objects.filter(variable_path__startswith='acct').delete()
        EmailVariable(
            display_name='First Name',
            variable_path='acct.profile.first_name',
            data_type='string',
        )
        # Use bulk_create to bypass the save() → full_clean() guard so we can
        # simulate the pre-migration state of having a leaf with no ancestors.
        EmailVariable.objects.bulk_create([
            EmailVariable(
                display_name='First Name',
                variable_path='acct.profile.first_name',
                data_type='string',
            ),
        ])

        from email_system.models.variable import ensure_ancestor_rows
        created = ensure_ancestor_rows(EmailVariable, 'acct.profile.first_name')
        self.assertEqual(created, 2)

        acct = EmailVariable.objects.get(variable_path='acct')
        self.assertEqual(acct.data_type, 'object')
        self.assertEqual(acct.display_name, 'Acct')

        profile = EmailVariable.objects.get(variable_path='acct.profile')
        self.assertEqual(profile.data_type, 'object')
        self.assertEqual(profile.display_name, 'Profile')

    def test_helper_is_idempotent(self):
        from email_system.models.variable import ensure_ancestor_rows
        EmailVariable.objects.filter(variable_path__startswith='idem').delete()
        EmailVariable.objects.bulk_create([
            EmailVariable(
                display_name='Field',
                variable_path='idem.inner.field',
                data_type='string',
            ),
        ])
        created_first = ensure_ancestor_rows(EmailVariable, 'idem.inner.field')
        created_second = ensure_ancestor_rows(EmailVariable, 'idem.inner.field')
        self.assertEqual(created_first, 2)
        self.assertEqual(created_second, 0)

    def test_title_case_handles_underscores(self):
        from email_system.models.variable import _title_case_segment
        self.assertEqual(_title_case_segment('first_name'), 'First Name')
        self.assertEqual(_title_case_segment('items[]'), 'Items')
        self.assertEqual(_title_case_segment('order'), 'Order')


# ---------------------------------------------------------------------------
# Admin — save_model auto-creates ancestors
# ---------------------------------------------------------------------------


class EmailVariableAdminSaveModelTest(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = EmailVariableAdmin(EmailVariable, self.site)
        self.factory = RequestFactory()
        self.user = User.objects.create_superuser('admin', 'a@a.com', 'pw')

    def _request(self):
        req = self.factory.post('/admin/email_system/emailvariable/add/')
        req.user = self.user
        return req

    def test_saving_leaf_with_missing_ancestors_creates_them(self):
        EmailVariable.objects.filter(variable_path__startswith='newroot').delete()
        obj = EmailVariable(
            display_name='Email',
            variable_path='newroot.profile.email',
            data_type='string',
        )
        self.admin.save_model(self._request(), obj, form=None, change=False)

        self.assertTrue(EmailVariable.objects.filter(variable_path='newroot').exists())
        self.assertTrue(EmailVariable.objects.filter(variable_path='newroot.profile').exists())
        self.assertTrue(EmailVariable.objects.filter(variable_path='newroot.profile.email').exists())
        self.assertEqual(
            EmailVariable.objects.get(variable_path='newroot').data_type,
            'object',
        )

    def test_saving_leaf_with_existing_ancestors_creates_no_extras(self):
        EmailVariable.objects.filter(variable_path__startswith='present').delete()
        EmailVariable.objects.create(
            display_name='Present',
            variable_path='present',
            data_type='object',
        )
        EmailVariable.objects.create(
            display_name='Profile',
            variable_path='present.profile',
            data_type='object',
        )
        before = EmailVariable.objects.filter(variable_path__startswith='present').count()

        obj = EmailVariable(
            display_name='Email',
            variable_path='present.profile.email',
            data_type='string',
        )
        self.admin.save_model(self._request(), obj, form=None, change=False)

        after = EmailVariable.objects.filter(variable_path__startswith='present').count()
        self.assertEqual(after, before + 1)  # only the leaf was added


# ---------------------------------------------------------------------------
# Section 2 — /api/email/variables/tree/
# ---------------------------------------------------------------------------


class EmailVariableTreeViewTest(APITestCase):
    url = '/api/email/variables/tree/'

    @classmethod
    def setUpTestData(cls):
        EmailVariable.objects.filter(variable_path__startswith='apiz').delete()
        EmailVariable.objects.create(
            display_name='Apiz',
            variable_path='apiz',
            data_type='object',
        )
        EmailVariable.objects.create(
            display_name='First Name',
            variable_path='apiz.first_name',
            data_type='string',
        )
        # Inactive — must not appear.
        EmailVariable.objects.create(
            display_name='Hidden',
            variable_path='apiz.hidden',
            data_type='string',
            is_active=False,
        )

    def test_anonymous_request_rejected(self):
        res = self.client.get(self.url)
        self.assertIn(res.status_code, (401, 403))

    def test_non_staff_user_rejected(self):
        user = User.objects.create_user('joe', 'j@j.com', 'pw')
        self.client.force_authenticate(user=user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 403)

    def test_staff_request_returns_flat_list_ordered_by_path(self):
        admin = User.objects.create_superuser('root', 'r@r.com', 'pw')
        self.client.force_authenticate(user=admin)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)

        payload = res.json()
        self.assertIn('variables', payload)
        paths = [row['path'] for row in payload['variables']]

        # Ordered alphabetically.
        self.assertEqual(paths, sorted(paths))
        # Active row present, inactive absent.
        self.assertIn('apiz.first_name', paths)
        self.assertNotIn('apiz.hidden', paths)

        row = next(r for r in payload['variables'] if r['path'] == 'apiz.first_name')
        self.assertEqual(set(row.keys()), {'path', 'display_name', 'data_type', 'description'})
        self.assertEqual(row['data_type'], 'string')
