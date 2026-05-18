"""Phase 3 of the session+learner webhook expansion (2026-05-18).

Verifies the two new mapper bridge models:

  - `adm.Contact` — external_id (unique) + student OneToOne. Matches an
    Administrate `Contact` to our `students.Student` via the
    `personalName.middleName -> student_ref` convention.
  - `adm.Learner` — external_id + tutorial_registration FK.
    Cardinality decision (Option α, 2026-05-18): one bridge row per
    (learner, session) pair. Composite unique on
    (external_id, tutorial_registration); external_id alone is NOT
    unique because one Administrate Learner maps to N of our session-
    level TutorialRegistration rows.

Both follow the `adm.Event` / `adm.Session` thin-bridge pattern:
SET_NULL on delete (so deleting the master row doesn't cascade-kill the
bridge row that webhook receipt history may still reference).

Note: an earlier draft also added `adm.LearnerAttendance`. That bridge
+ its `Learner Attended Session` webhook flow were removed; attendance
flows through the existing TutorialAttendance write paths.
"""
from django.test import TestCase
from django.db import models as djmodels


class AdmContactShapeTest(TestCase):

    def test_contact_model_exists(self):
        from administrate.models import Contact
        self.assertTrue(hasattr(Contact, '_meta'))

    def test_external_id_unique_and_nullable(self):
        from administrate.models import Contact
        field = Contact._meta.get_field('external_id')
        self.assertTrue(field.unique)
        self.assertTrue(field.null)

    def test_student_is_one_to_one_set_null(self):
        from administrate.models import Contact
        field = Contact._meta.get_field('student')
        self.assertIsInstance(field, djmodels.OneToOneField)
        self.assertEqual(field.remote_field.on_delete, djmodels.SET_NULL)
        self.assertTrue(field.null)
        self.assertEqual(
            field.related_model._meta.label_lower,
            'students.student',
        )


class AdmLearnerShapeTest(TestCase):

    def test_learner_model_exists(self):
        from administrate.models import Learner
        self.assertTrue(hasattr(Learner, '_meta'))

    def test_external_id_NOT_unique_alone(self):
        """One Administrate Learner spans N sessions → external_id alone
        cannot be unique. Composite uniqueness is enforced separately."""
        from administrate.models import Learner
        field = Learner._meta.get_field('external_id')
        self.assertFalse(field.unique)

    def test_external_id_is_indexed(self):
        # Bridge lookups by external_id alone (e.g. Learner Cancelled →
        # deactivate N tutorial_registrations) need an index, even though
        # the column isn't unique on its own.
        from administrate.models import Learner
        field = Learner._meta.get_field('external_id')
        self.assertTrue(field.db_index)

    def test_tutorial_registration_fk_set_null(self):
        from administrate.models import Learner
        field = Learner._meta.get_field('tutorial_registration')
        self.assertIsInstance(field, djmodels.ForeignKey)
        self.assertEqual(field.remote_field.on_delete, djmodels.SET_NULL)
        self.assertTrue(field.null)
        self.assertEqual(
            field.related_model._meta.label_lower,
            'tutorials.tutorialregistration',
        )

    def test_composite_unique_external_id_plus_registration(self):
        from administrate.models import Learner
        names = {c.name for c in Learner._meta.constraints}
        self.assertIn('uniq_learner_per_registration', names)
