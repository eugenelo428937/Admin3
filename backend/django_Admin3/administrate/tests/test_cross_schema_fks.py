"""
Tests for cross-schema FK relationships from adm to acted tables (US4).

Verifies that adm models (CourseTemplate, Instructor, Location, Venue) can
reference their acted counterparts via nullable FK columns.
"""
from django.contrib.auth.models import User
from django.test import TestCase

from administrate.models import CourseTemplate, Instructor, Location, Venue
from tutorials.models import (
    TutorialCourseTemplate, Staff, TutorialInstructor,
    TutorialLocation, TutorialVenue,
)


class CourseTemplateCrossSchemaFKTest(TestCase):
    """Test cross-schema FK: adm.CourseTemplate → acted.TutorialCourseTemplate (T028)."""

    def test_set_fk_to_tutorial_course_template(self):
        """Verify adm CourseTemplate can reference acted TutorialCourseTemplate."""
        tct = TutorialCourseTemplate.objects.create(code='CM2-WKD', title='CM2 Weekend')
        ct = CourseTemplate.objects.create(
            external_id='ext-ct-001',
            tutorial_course_template=tct,
        )
        ct.refresh_from_db()
        self.assertEqual(ct.tutorial_course_template, tct)

    def test_fk_nullable(self):
        """Verify tutorial_course_template FK is nullable."""
        ct = CourseTemplate.objects.create(
            external_id='ext-ct-002',
            tutorial_course_template=None,
        )
        self.assertIsNone(ct.tutorial_course_template)

    def test_set_null_on_acted_delete(self):
        """Verify SET_NULL when acted record is deleted."""
        tct = TutorialCourseTemplate.objects.create(code='CB1-DAY', title='CB1 Day')
        ct = CourseTemplate.objects.create(
            external_id='ext-ct-003',
            tutorial_course_template=tct,
        )
        tct.delete()
        ct.refresh_from_db()
        self.assertIsNone(ct.tutorial_course_template)

    def test_reverse_relation(self):
        """Verify acted record can access adm records via related_name."""
        tct = TutorialCourseTemplate.objects.create(code='CS1-WK', title='CS1 Week')
        ct = CourseTemplate.objects.create(
            external_id='ext-ct-004',
            tutorial_course_template=tct,
        )
        self.assertIn(ct, tct.adm_course_templates.all())


class InstructorCrossSchemaFKTest(TestCase):
    """Test cross-schema FK: adm.Instructor → acted.TutorialInstructor (T029)."""

    def test_set_fk_to_tutorial_instructor(self):
        """Verify adm Instructor can reference acted TutorialInstructor."""
        ti = TutorialInstructor.objects.create(staff=None)
        instr = Instructor.objects.create(
            external_id='ext-instr-001',
            tutorial_instructor=ti,
        )
        instr.refresh_from_db()
        self.assertEqual(instr.tutorial_instructor, ti)

    def test_fk_nullable(self):
        """Verify tutorial_instructor FK is nullable."""
        instr = Instructor.objects.create(
            external_id='ext-instr-002',
            tutorial_instructor=None,
        )
        self.assertIsNone(instr.tutorial_instructor)

    def test_set_null_on_acted_delete(self):
        """Verify SET_NULL when acted record is deleted."""
        ti = TutorialInstructor.objects.create(staff=None)
        instr = Instructor.objects.create(
            external_id='ext-instr-003',
            tutorial_instructor=ti,
        )
        ti.delete()
        instr.refresh_from_db()
        self.assertIsNone(instr.tutorial_instructor)

    def test_reverse_relation(self):
        """Verify acted record can access adm records via related_name."""
        ti = TutorialInstructor.objects.create(staff=None)
        instr = Instructor.objects.create(
            external_id='ext-instr-004',
            tutorial_instructor=ti,
        )
        self.assertIn(instr, ti.adm_instructors.all())


class LocationCrossSchemaFKTest(TestCase):
    """Test cross-schema FK: adm.Location → acted.TutorialLocation (T030)."""

    def test_set_fk_to_tutorial_location(self):
        """Verify adm Location can reference acted TutorialLocation."""
        tl = TutorialLocation.objects.create(name='London', code='LON')
        loc = Location.objects.create(
            external_id='ext-loc-001',
            tutorial_location=tl,
        )
        loc.refresh_from_db()
        self.assertEqual(loc.tutorial_location, tl)

    def test_fk_nullable(self):
        """Verify tutorial_location FK is nullable."""
        loc = Location.objects.create(
            external_id='ext-loc-002',
            tutorial_location=None,
        )
        self.assertIsNone(loc.tutorial_location)

    def test_set_null_on_acted_delete(self):
        """Verify SET_NULL when acted record is deleted."""
        tl = TutorialLocation.objects.create(name='Manchester', code='MAN')
        loc = Location.objects.create(
            external_id='ext-loc-003',
            tutorial_location=tl,
        )
        tl.delete()
        loc.refresh_from_db()
        self.assertIsNone(loc.tutorial_location)

    def test_reverse_relation(self):
        """Verify acted record can access adm records via related_name."""
        tl = TutorialLocation.objects.create(name='Bristol', code='BRI')
        loc = Location.objects.create(
            external_id='ext-loc-004',
            tutorial_location=tl,
        )
        self.assertIn(loc, tl.adm_locations.all())


class VenueCrossSchemaFKTest(TestCase):
    """Test cross-schema FK: adm.Venue → acted.TutorialVenue (T031)."""

    def test_set_fk_to_tutorial_venue(self):
        """Verify adm Venue can reference acted TutorialVenue."""
        tv = TutorialVenue.objects.create(name='Hotel A')
        venue = Venue.objects.create(
            external_id='ext-ven-001',
            tutorial_venue=tv,
        )
        venue.refresh_from_db()
        self.assertEqual(venue.tutorial_venue, tv)

    def test_fk_nullable(self):
        """Verify tutorial_venue FK is nullable."""
        venue = Venue.objects.create(
            external_id='ext-ven-002',
            tutorial_venue=None,
        )
        self.assertIsNone(venue.tutorial_venue)

    def test_set_null_on_acted_delete(self):
        """Verify SET_NULL when acted record is deleted."""
        tv = TutorialVenue.objects.create(name='Hotel C')
        venue = Venue.objects.create(
            external_id='ext-ven-003',
            tutorial_venue=tv,
        )
        tv.delete()
        venue.refresh_from_db()
        self.assertIsNone(venue.tutorial_venue)

    def test_reverse_relation(self):
        """Verify acted record can access adm records via related_name."""
        tv = TutorialVenue.objects.create(name='Hotel D')
        venue = Venue.objects.create(
            external_id='ext-ven-004',
            tutorial_venue=tv,
        )
        self.assertIn(venue, tv.adm_venues.all())
