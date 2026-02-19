from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from administrate.models import CourseTemplate, Location, Venue, Instructor
from tutorials.models import (
    TutorialCourseTemplate, TutorialLocation, TutorialVenue,
    TutorialInstructor, Staff,
)


class TestValidateCourseTemplate(TestCase):
    """Tests for validate_course_template with bridge FK queries."""

    def test_finds_course_template_via_bridge_fk(self):
        """Local query finds course template through tutorial FK."""
        from administrate.utils.event_importer import validate_course_template

        tct = TutorialCourseTemplate.objects.create(
            code='CM2', title='CM2 Models', is_active=True
        )
        CourseTemplate.objects.create(
            external_id='CT_123', tutorial_course_template=tct
        )

        result = validate_course_template(None, 'CM2')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'CT_123')
        self.assertEqual(result['code'], 'CM2')
        self.assertEqual(result['title'], 'CM2 Models')

    def test_case_insensitive_match(self):
        """Code matching is case-insensitive."""
        from administrate.utils.event_importer import validate_course_template

        tct = TutorialCourseTemplate.objects.create(
            code='SA1', title='SA1 Actuarial', is_active=True
        )
        CourseTemplate.objects.create(
            external_id='CT_456', tutorial_course_template=tct
        )

        result = validate_course_template(None, 'sa1')
        self.assertIsNotNone(result)
        self.assertEqual(result['code'], 'SA1')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_tutorial_and_bridge_records(self, mock_load):
        """When not found locally, API fallback auto-creates records."""
        from administrate.utils.event_importer import validate_course_template

        mock_load.return_value = 'query { courseTemplates }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'courseTemplates': {
                    'edges': [{
                        'node': {
                            'id': 'CT_789',
                            'code': 'CB1',
                            'title': 'CB1 Business'
                        }
                    }]
                }
            }
        }

        result = validate_course_template(api_service, 'CB1')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'CT_789')

        # Verify tutorial record was auto-created
        tct = TutorialCourseTemplate.objects.get(code='CB1')
        self.assertEqual(tct.title, 'CB1 Business')
        self.assertTrue(tct.is_active)

        # Verify bridge record was auto-created with FK link
        ct = CourseTemplate.objects.get(external_id='CT_789')
        self.assertEqual(ct.tutorial_course_template, tct)

    def test_returns_none_for_nonexistent(self):
        """Returns None when not found locally and no API service."""
        from administrate.utils.event_importer import validate_course_template

        result = validate_course_template(None, 'NONEXISTENT')
        self.assertIsNone(result)


class TestValidateLocation(TestCase):
    """Tests for validate_location with bridge FK queries."""

    def test_finds_location_via_bridge_fk(self):
        from administrate.utils.event_importer import validate_location

        tl = TutorialLocation.objects.create(name='London', is_active=True)
        Location.objects.create(
            external_id='LOC_123', tutorial_location=tl
        )

        result = validate_location(None, 'London')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'LOC_123')
        self.assertEqual(result['name'], 'London')

    def test_case_insensitive_match(self):
        from administrate.utils.event_importer import validate_location

        tl = TutorialLocation.objects.create(name='Edinburgh', is_active=True)
        Location.objects.create(
            external_id='LOC_456', tutorial_location=tl
        )

        result = validate_location(None, 'edinburgh')
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Edinburgh')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_tutorial_and_bridge_records(self, mock_load):
        from administrate.utils.event_importer import validate_location

        mock_load.return_value = 'query { locations }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'locations': {
                    'edges': [{
                        'node': {
                            'id': 'LOC_789',
                            'name': 'Manchester'
                        }
                    }]
                }
            }
        }

        result = validate_location(api_service, 'Manchester')

        self.assertIsNotNone(result)

        tl = TutorialLocation.objects.get(name='Manchester')
        self.assertTrue(tl.is_active)

        loc = Location.objects.get(external_id='LOC_789')
        self.assertEqual(loc.tutorial_location, tl)

    def test_returns_none_for_nonexistent(self):
        from administrate.utils.event_importer import validate_location

        result = validate_location(None, 'NONEXISTENT')
        self.assertIsNone(result)


class TestValidateVenue(TestCase):
    """Tests for validate_venue with bridge FK queries."""

    def test_finds_venue_via_bridge_fk(self):
        from administrate.utils.event_importer import validate_venue

        tl = TutorialLocation.objects.create(name='London', is_active=True)
        loc = Location.objects.create(
            external_id='LOC_1', tutorial_location=tl
        )
        tv = TutorialVenue.objects.create(name='BPP Waterloo', location=tl)
        Venue.objects.create(
            external_id='VEN_1', location=loc, tutorial_venue=tv
        )

        result = validate_venue(None, 'BPP Waterloo', 'LOC_1')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'VEN_1')
        self.assertEqual(result['name'], 'BPP Waterloo')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_tutorial_and_bridge_records(self, mock_load):
        from administrate.utils.event_importer import validate_venue

        # Pre-create location chain (venue needs a location)
        tl = TutorialLocation.objects.create(name='London', is_active=True)
        loc = Location.objects.create(
            external_id='LOC_1', tutorial_location=tl
        )

        mock_load.return_value = 'query { locations }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'locations': {
                    'edges': [{
                        'node': {
                            'id': 'VEN_99',
                            'name': 'New Venue'
                        }
                    }]
                }
            }
        }

        result = validate_venue(api_service, 'New Venue', 'LOC_1')

        self.assertIsNotNone(result)

        tv = TutorialVenue.objects.get(name='New Venue')
        self.assertEqual(tv.location, tl)

        ven = Venue.objects.get(external_id='VEN_99')
        self.assertEqual(ven.tutorial_venue, tv)

    def test_tbc_venue_returns_dict(self):
        """TBC venue names return a dict with None id."""
        from administrate.utils.event_importer import validate_venue

        result = validate_venue(None, 'TBC', 'LOC_1')
        self.assertIsNotNone(result)
        self.assertIsNone(result['id'])


class TestValidateInstructor(TestCase):
    """Tests for validate_instructor with bridge FK queries."""

    def test_finds_instructor_via_bridge_fk(self):
        from administrate.utils.event_importer import validate_instructor

        user = User.objects.create_user(
            username='jsmith', first_name='John', last_name='Smith'
        )
        staff = Staff.objects.create(user=user)
        ti = TutorialInstructor.objects.create(staff=staff, is_active=True)
        Instructor.objects.create(
            external_id='INS_1', tutorial_instructor=ti, is_active=True
        )

        result = validate_instructor(None, 'John Smith')

        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'INS_1')

    def test_case_insensitive_match(self):
        from administrate.utils.event_importer import validate_instructor

        user = User.objects.create_user(
            username='alee', first_name='Alice', last_name='Lee'
        )
        staff = Staff.objects.create(user=user)
        ti = TutorialInstructor.objects.create(staff=staff, is_active=True)
        Instructor.objects.create(
            external_id='INS_2', tutorial_instructor=ti, is_active=True
        )

        result = validate_instructor(None, 'alice lee')
        self.assertIsNotNone(result)
        self.assertEqual(result['id'], 'INS_2')

    @patch('administrate.utils.event_importer.load_graphql_query')
    def test_api_fallback_creates_full_chain(self, mock_load):
        """API fallback creates User + Staff + TutorialInstructor + bridge."""
        from administrate.utils.event_importer import validate_instructor

        mock_load.return_value = 'query { contacts }'

        api_service = MagicMock()
        api_service.execute_query.return_value = {
            'data': {
                'contacts': {
                    'edges': [{
                        'node': {
                            'id': 'INS_99',
                            'firstName': 'Bob',
                            'lastName': 'Jones'
                        }
                    }]
                }
            }
        }

        result = validate_instructor(api_service, 'Bob Jones')

        self.assertIsNotNone(result)

        # Verify full chain was auto-created
        user = User.objects.get(first_name='Bob', last_name='Jones')
        staff = Staff.objects.get(user=user)
        ti = TutorialInstructor.objects.get(staff=staff)
        ins = Instructor.objects.get(external_id='INS_99')
        self.assertEqual(ins.tutorial_instructor, ti)

    def test_returns_none_for_nonexistent(self):
        from administrate.utils.event_importer import validate_instructor

        result = validate_instructor(None, 'Nobody Here')
        self.assertIsNone(result)
