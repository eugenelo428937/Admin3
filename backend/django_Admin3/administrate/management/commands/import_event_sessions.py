import csv
import os
from datetime import datetime, time
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date, parse_time

from administrate.models import Event, Session, CourseTemplate, Location, Venue, Instructor


class Command(BaseCommand):
    help = 'Import events and sessions from CSV file'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Path to the CSV file containing event session data'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes to the database'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        dry_run = options['dry_run']
        
        if not os.path.exists(csv_file):
            raise CommandError(f'CSV file "{csv_file}" does not exist.')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made to the database'))
        
        self.stdout.write(f'Processing CSV file: {csv_file}')
        
        try:
            with transaction.atomic():
                self.import_data(csv_file, dry_run)
                if dry_run:
                    transaction.set_rollback(True)
        except Exception as e:
            raise CommandError(f'Error importing data: {str(e)}')

    def import_data(self, csv_file, dry_run):
        events_created = 0
        sessions_created = 0
        events_updated = 0
        errors = []
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Skip header rows and example rows
            rows = list(reader)
            data_rows = []
            
            for row in rows:
                # Skip empty rows and header/example rows
                if not row.get('Link') or row['Link'].startswith('Link') or not row.get('Course Code', '').strip():
                    continue
                data_rows.append(row)
            
            current_event = None
            
            for row_num, row in enumerate(data_rows, 1):
                try:
                    # Check if this is a new event (has Link and Course Code)
                    if row.get('Link') and row.get('Course Code'):
                        current_event = self.process_event(row, dry_run)
                        if current_event:
                            if hasattr(current_event, '_created'):
                                events_created += 1
                            else:
                                events_updated += 1
                    
                    # Process session for current event
                    if current_event and row.get('Session title'):
                        session = self.process_session(current_event, row, dry_run)
                        if session:
                            sessions_created += 1
                            
                except Exception as e:
                    error_msg = f'Row {row_num}: {str(e)}'
                    errors.append(error_msg)
                    self.stdout.write(self.style.ERROR(error_msg))
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'Import completed:'))
        self.stdout.write(f'  Events created: {events_created}')
        self.stdout.write(f'  Events updated: {events_updated}')
        self.stdout.write(f'  Sessions created: {sessions_created}')
        
        if errors:
            self.stdout.write(self.style.ERROR(f'  Errors: {len(errors)}'))
            for error in errors[:10]:  # Show first 10 errors
                self.stdout.write(f'    {error}')

    def process_event(self, row, dry_run):
        """Process and create/update an Event from CSV row"""
        course_code = row.get('Course Code', '').strip()
        title = row.get('Title', '').strip()
        external_id = row.get('Link', '').strip()
        
        if not course_code:
            raise ValueError('Missing course code')
        
        # Get or create course template
        try:
            course_template = CourseTemplate.objects.get(code=course_code)
        except CourseTemplate.DoesNotExist:
            raise ValueError(f'Course template not found for code: {course_code}')
        
        # Get location
        location_name = row.get('Location', '').strip()
        if not location_name:
            raise ValueError('Missing location')
        
        try:
            location = Location.objects.get(name=location_name)
        except Location.DoesNotExist:
            raise ValueError(f'Location not found: {location_name}')
        
        # Get venue (optional)
        venue = None
        venue_name = row.get('Venue', '').strip()
        if venue_name and venue_name != 'To be confirmed':
            try:
                venue = Venue.objects.get(name=venue_name, location=location)
            except Venue.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Venue not found: {venue_name} at {location_name}'))
        
        # Get primary instructor
        instructor_name = row.get('Instructor', '').strip()
        if not instructor_name:
            raise ValueError('Missing instructor')
        
        try:
            instructor = Instructor.objects.get(name=instructor_name)
        except Instructor.DoesNotExist:
            raise ValueError(f'Instructor not found: {instructor_name}')
        
        # Parse dates
        registration_deadline = self.parse_datetime_field(row.get('Registration Deadline Date'), row.get('LMS Start Time', '16:00'))
        lms_start_date = self.parse_datetime_field(row.get('LMS Start Date'), row.get('LMS Start Time', '16:00'))
        lms_end_date = self.parse_datetime_field(row.get('LMS End Date'), row.get('LMS End Time', '00:00'))
        finalisation_date = self.parse_datetime_field(row.get('Finalisation date'), '16:00')
        
        # Parse learning mode
        learning_mode = self.parse_learning_mode(row.get('Learning Mode', ''))
        
        # Parse boolean fields
        sold_out = self.parse_boolean(row.get('Sold Out', ''))
        cancelled = self.parse_boolean(row.get('Cancelled', ''))
        web_sale = self.parse_boolean(row.get('Web sale', 'Y'))
        recordings = self.parse_boolean(row.get('Recordings', ''))
        
        # Parse integer fields
        max_places = self.parse_integer(row.get('Max Places', '0'))
        min_places = self.parse_integer(row.get('Min Places', '0'))
        
        if dry_run:
            self.stdout.write(f'Would create/update event: {title or course_code}')
            return type('MockEvent', (), {'external_id': external_id, '_created': True})()
        
        # Create or update event
        event_data = {
            'course_template': course_template,
            'title': title or course_template.title,
            'session_title': row.get('Session title', '').strip(),
            'learning_mode': learning_mode,
            'location': location,
            'venue': venue,
            'primary_instructor': instructor,
            'administrator': row.get('Administrator', '').strip(),
            'max_places': max_places,
            'min_places': min_places,
            'registration_deadline': registration_deadline,
            'lms_start_date': lms_start_date,
            'lms_end_date': lms_end_date,
            'access_duration': row.get('Access Duration', '').strip(),
            'event_url': row.get('URL', '').strip(),
            'virtual_classroom': row.get('Virtual Classroom', '').strip(),
            'sold_out': sold_out,
            'cancelled': cancelled,
            'web_sale': web_sale,
            'sitting': row.get('Sitting', '').strip(),
            'finalisation_date': finalisation_date,
            'ocr_moodle_code': row.get('OCR Moodle Code', '').strip(),
            'sage_code': row.get('Sage code', '').strip(),
            'recordings': recordings,
            'recording_pin': row.get('Recording pin', '').strip(),
            'extra_information': row.get('Extra information', '').strip(),
            'tutors': row.get('Tutors', '').strip(),
            'timezone': row.get('Time Zone', 'Europe/London').strip() or 'Europe/London',
        }
        
        event, created = Event.objects.update_or_create(
            external_id=external_id,
            defaults=event_data
        )
        
        if created:
            event._created = True
        
        return event

    def process_session(self, event, row, dry_run):
        """Process and create a Session from CSV row"""
        session_title = row.get('Session title', '').strip()
        if not session_title:
            return None
        
        # Parse day number from session title (e.g., "CB1-01-25A-1" -> day 1)
        day_number = self.parse_day_number(session_title, row.get('Day', ''))
        
        # Parse classroom dates and times
        classroom_start_date = self.parse_date_field(row.get('Classroom Start Date'))
        classroom_start_time = self.parse_time_field(row.get('Classroom Start Time', '09:00'))
        classroom_end_date = self.parse_date_field(row.get('Classroom End Date')) or classroom_start_date
        classroom_end_time = self.parse_time_field(row.get('Classroom End Time', '17:00'))
        
        if not classroom_start_date:
            raise ValueError('Missing classroom start date')
        
        # Get session instructor
        session_instructor_name = row.get('Session Instructor', '').strip()
        if not session_instructor_name:
            session_instructor = event.primary_instructor
        else:
            try:
                session_instructor = Instructor.objects.get(name=session_instructor_name)
            except Instructor.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Session instructor not found: {session_instructor_name}, using primary instructor'))
                session_instructor = event.primary_instructor
        
        # Parse session URL
        session_url = row.get('Session URL', '').strip()
        
        # Parse cancelled status
        cancelled = self.parse_boolean(row.get('Cancelled', ''))
        
        if dry_run:
            self.stdout.write(f'Would create session: {session_title} on {classroom_start_date}')
            return type('MockSession', (), {'title': session_title})()
        
        # Create or update session
        session_data = {
            'title': session_title,
            'classroom_start_date': classroom_start_date,
            'classroom_start_time': classroom_start_time,
            'classroom_end_date': classroom_end_date,
            'classroom_end_time': classroom_end_time,
            'session_instructor': session_instructor,
            'session_url': session_url,
            'cancelled': cancelled,
        }
        
        session, created = Session.objects.update_or_create(
            event=event,
            day_number=day_number,
            defaults=session_data
        )
        
        return session if created else None

    def parse_learning_mode(self, value):
        """Parse learning mode from CSV value"""
        value = value.lower().strip()
        if 'classroom' in value or 'f2f' in value:
            return 'CLASSROOM'
        elif 'blended' in value or 'live online' in value:
            return 'BLENDED'
        elif 'lms' in value or 'self paced' in value:
            return 'LMS'
        return 'BLENDED'  # default

    def parse_boolean(self, value):
        """Parse boolean from CSV value"""
        if not value:
            return False
        value = value.strip().upper()
        return value in ['Y', 'YES', 'TRUE', '1']

    def parse_integer(self, value):
        """Parse integer from CSV value"""
        if not value or not value.strip():
            return 0
        try:
            return int(value.strip())
        except ValueError:
            return 0

    def parse_date_field(self, value):
        """Parse date from CSV value (DD/MM/YYYY format)"""
        if not value or not value.strip():
            return None
        
        try:
            # Try DD/MM/YYYY format first
            return datetime.strptime(value.strip(), '%d/%m/%Y').date()
        except ValueError:
            try:
                # Try YYYY-MM-DD format
                return parse_date(value.strip())
            except:
                return None

    def parse_time_field(self, value):
        """Parse time from CSV value (HH:MM format)"""
        if not value or not value.strip():
            return time(9, 0)  # default 09:00
        
        try:
            return datetime.strptime(value.strip(), '%H:%M').time()
        except ValueError:
            return time(9, 0)  # default 09:00

    def parse_datetime_field(self, date_value, time_value):
        """Parse datetime from separate date and time CSV values"""
        date_obj = self.parse_date_field(date_value)
        if not date_obj:
            return None
        
        time_obj = self.parse_time_field(time_value)
        return datetime.combine(date_obj, time_obj)

    def parse_day_number(self, session_title, day_field):
        """Parse day number from session title or day field"""
        if day_field and day_field.strip().isdigit():
            return int(day_field.strip())
        
        # Extract from session title (e.g., "CB1-01-25A-1" -> 1)
        if session_title:
            parts = session_title.split('-')
            if len(parts) >= 4:
                try:
                    return int(parts[-1])
                except ValueError:
                    pass
        
        return 1  # default to day 1
