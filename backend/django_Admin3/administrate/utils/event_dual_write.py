"""
Dual-write helpers for the event importer.

Creates local tutorial records (acted schema) before or alongside
Administrate API calls, and bridge records (adm schema) after
successful API responses.

Functions:
    create_tutorial_event   – TutorialEvents record
    create_tutorial_session – TutorialSessions record + M2M instructors
    create_event_bridge_record – adm.Event linking both systems
"""
import logging
import uuid
from datetime import date, datetime

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _resolve_tutorial_location(row_data, debug=False):
    """Resolve TutorialLocation via the adm.Location bridge table."""
    from administrate.models import Location as AdmLocation
    location_id = row_data.get('location_id')
    if not location_id:
        return None
    try:
        adm_loc = AdmLocation.objects.select_related(
            'tutorial_location').get(external_id=location_id)
        return adm_loc.tutorial_location
    except AdmLocation.DoesNotExist:
        if debug:
            logger.debug(f"No adm.Location for external_id {location_id}")
        return None


def _resolve_tutorial_venue(row_data, debug=False):
    """Resolve TutorialVenue via the adm.Venue bridge table."""
    from administrate.models.venues import Venue as AdmVenue
    venue_id = row_data.get('venue_id')
    if not venue_id:
        return None
    try:
        adm_venue = AdmVenue.objects.select_related(
            'tutorial_venue').get(external_id=venue_id)
        return adm_venue.tutorial_venue
    except AdmVenue.DoesNotExist:
        if debug:
            logger.debug(f"No adm.Venue for external_id {venue_id}")
        return None


def _normalize_sitting(sitting):
    """Convert Excel sitting format to session_code search term.

    Excel uses '{year}{letter}' (e.g. '2026A' for April 2026).
    DB uses '{year}-{month}' (e.g. '2026-04').
    """
    if not sitting:
        return ''
    sitting = sitting.strip()

    month_map = {
        'A': '04',   # April
        'S': '09',   # September
    }

    if len(sitting) >= 4 and sitting[-1].isalpha():
        year = sitting[:-1]
        letter = sitting[-1].upper()
        month = month_map.get(letter)
        if month:
            return f"{year}-{month}"
        return year

    return sitting


def _resolve_store_product(row_data, debug=False):
    """
    Resolve store.Product from course template code and sitting.

    Chain: adm.CourseTemplate → tutorial_course_template.code (= subject code)
           → ExamSessionSubject → store.Product
    """
    from store.models import Product as StoreProduct
    from catalog.models import ExamSessionSubject
    from administrate.models import CourseTemplate as AdmCourseTemplate

    ct_id = row_data.get('course_template_id')
    raw_sitting = row_data.get('sitting', row_data.get('Sitting', ''))
    sitting = _normalize_sitting(raw_sitting)

    if not ct_id:
        return None

    try:
        adm_ct = AdmCourseTemplate.objects.select_related(
            'tutorial_course_template').get(external_id=ct_id)
        if not adm_ct.tutorial_course_template:
            if debug:
                logger.debug(f"adm.CourseTemplate {ct_id} has no tutorial link")
            return None
        subject_code = adm_ct.tutorial_course_template.code
    except AdmCourseTemplate.DoesNotExist:
        if debug:
            logger.debug(f"No adm.CourseTemplate for external_id {ct_id}")
        return None

    try:
        ess_qs = ExamSessionSubject.objects.filter(
            subject__code__iexact=subject_code,
            is_active=True,
        )
        if sitting:
            ess_qs = ess_qs.filter(
                exam_session__session_code__icontains=sitting,
            )
        ess = ess_qs.first()
        if not ess:
            if debug:
                logger.debug(
                    f"No ExamSessionSubject for "
                    f"subject={subject_code} sitting={sitting}")
            return None

        product = StoreProduct.objects.filter(
            exam_session_subject=ess,
            is_active=True,
        ).first()
        return product
    except Exception as e:
        if debug:
            logger.debug(f"Error resolving store product: {e}")
        return None


def _parse_iso_date(date_str):
    """Parse an ISO datetime string and return a date object."""
    if not date_str:
        return None
    try:
        if isinstance(date_str, date) and not isinstance(date_str, datetime):
            return date_str
        if isinstance(date_str, datetime):
            return date_str.date()
        return datetime.fromisoformat(date_str).date()
    except (ValueError, TypeError):
        return None


def _generate_event_code(row_data):
    """Generate a unique event code from row data."""
    course_code = row_data.get('Course template code', 'UNKNOWN')
    sitting = row_data.get('sitting', row_data.get('Sitting', ''))
    short_id = uuid.uuid4().hex[:6].upper()
    parts = [p for p in [course_code, sitting, short_id] if p]
    return '-'.join(parts)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_tutorial_event(row_data, debug=False):
    """
    Create a TutorialEvents record from validated Excel row data.

    Resolves store_product, location, and venue FKs through
    the adm bridge tables.  Returns the created TutorialEvents
    instance, or None if a required FK cannot be resolved.
    """
    from tutorials.models import TutorialEvents

    tutorial_location = _resolve_tutorial_location(row_data, debug)
    tutorial_venue = _resolve_tutorial_venue(row_data, debug)
    store_product = _resolve_store_product(row_data, debug)

    if not store_product:
        logger.warning(
            f"Row {row_data.get('row_number', '?')}: "
            f"Cannot create tutorial event — store_product not resolved"
        )
        return None

    # Use LMS dates as outer bounds; fall back to classroom dates
    start_date = _parse_iso_date(
        row_data.get('formatted_lms_start_datetime')
        or row_data.get('formatted_classroom_start_datetime')
    )
    end_date = _parse_iso_date(
        row_data.get('formatted_lms_end_datetime')
        or row_data.get('formatted_classroom_end_datetime')
    )

    if not start_date or not end_date:
        logger.warning(
            f"Row {row_data.get('row_number', '?')}: "
            f"Cannot create tutorial event — dates not available"
        )
        return None

    code = _generate_event_code(row_data)
    finalisation_date = _parse_iso_date(row_data.get('finalisation_datetime'))

    try:
        tutorial_event = TutorialEvents.objects.create(
            code=code,
            store_product=store_product,
            location=tutorial_location,
            venue=tutorial_venue,
            start_date=start_date,
            end_date=end_date,
            remain_space=row_data.get('Max places', 0),
            finalisation_date=finalisation_date,
        )
        if debug:
            logger.debug(f"Created tutorial event: {tutorial_event.code}")
        return tutorial_event
    except Exception as e:
        logger.error(f"Failed to create tutorial event: {e}")
        if debug:
            logger.exception(e)
        return None


def create_tutorial_session(row_data, tutorial_event, debug=False):
    """
    Create a TutorialSessions record linked to the parent tutorial event.

    Resolves instructor M2M links through the adm.Instructor bridge.
    Returns the created TutorialSessions instance, or None on failure.
    """
    from tutorials.models import TutorialSessions
    from administrate.models import Instructor as AdmInstructor

    title = row_data.get('event_title', row_data.get('Session title', ''))
    sequence = row_data.get('session_day', 1)

    start_dt_str = row_data.get('formatted_classroom_start_datetime')
    end_dt_str = row_data.get('formatted_classroom_end_datetime')

    if not start_dt_str or not end_dt_str:
        logger.warning(
            f"Row {row_data.get('row_number', '?')}: "
            f"Cannot create tutorial session — dates not available"
        )
        return None

    try:
        from django.utils import timezone as tz
        start_dt = (datetime.fromisoformat(start_dt_str)
                    if isinstance(start_dt_str, str) else start_dt_str)
        end_dt = (datetime.fromisoformat(end_dt_str)
                  if isinstance(end_dt_str, str) else end_dt_str)
        # Ensure timezone-aware datetimes
        if start_dt and tz.is_naive(start_dt):
            start_dt = tz.make_aware(start_dt)
        if end_dt and tz.is_naive(end_dt):
            end_dt = tz.make_aware(end_dt)
    except (ValueError, TypeError) as e:
        logger.warning(f"Invalid session dates: {e}")
        return None

    try:
        session = TutorialSessions.objects.create(
            tutorial_event=tutorial_event,
            title=title,
            start_date=start_dt,
            end_date=end_dt,
            sequence=sequence,
            location=tutorial_event.location,
            venue=tutorial_event.venue,
            url=row_data.get('Session_url', '') or '',
        )

        # Link instructors via M2M through bridge tables
        instructor_ids = row_data.get('session_instructor_ids', [])
        for ext_id in instructor_ids:
            try:
                adm_instr = AdmInstructor.objects.select_related(
                    'tutorial_instructor').get(external_id=ext_id)
                if adm_instr.tutorial_instructor:
                    session.instructors.add(adm_instr.tutorial_instructor)
            except AdmInstructor.DoesNotExist:
                if debug:
                    logger.debug(
                        f"No adm.Instructor for external_id {ext_id}")

        if debug:
            logger.debug(
                f"Created tutorial session: {session.title} "
                f"(seq {session.sequence})")
        return session
    except Exception as e:
        logger.error(f"Failed to create tutorial session: {e}")
        if debug:
            logger.exception(e)
        return None


def create_event_bridge_record(tutorial_event, api_event_id, row_data,
                               debug=False):
    """
    Create an adm.Event bridge record linking a tutorial event to
    its Administrate counterpart.

    Returns the created adm.Event, or None on failure.
    """
    from administrate.models import (
        Event as AdmEvent, CourseTemplate as AdmCourseTemplate,
        Location as AdmLocation, Instructor as AdmInstructor,
    )
    from administrate.models.venues import Venue as AdmVenue

    if not api_event_id:
        logger.warning("Cannot create bridge record: no API event ID")
        return None

    try:
        course_template = AdmCourseTemplate.objects.get(
            external_id=row_data['course_template_id'])
        location = AdmLocation.objects.get(
            external_id=row_data['location_id'])

        # Primary instructor — first from event, fall back to session list
        primary_instructor = None
        for id_list_key in ('instructor_ids', 'session_instructor_ids'):
            ids = row_data.get(id_list_key, [])
            if ids:
                primary_instructor = AdmInstructor.objects.filter(
                    external_id=ids[0]).first()
                if primary_instructor:
                    break

        if not primary_instructor:
            logger.warning(
                "Cannot create bridge record: no instructor resolved")
            return None

        venue = None
        if row_data.get('venue_id'):
            venue = AdmVenue.objects.filter(
                external_id=row_data['venue_id']).first()

        learning_mode_map = {
            'blended': 'BLENDED',
            'lms': 'LMS',
            'classroom': 'CLASSROOM',
        }
        learning_mode = learning_mode_map.get(
            row_data.get('event_mode', 'blended'), 'BLENDED')

        bridge_event = AdmEvent.objects.create(
            external_id=api_event_id,
            tutorial_event=tutorial_event,
            course_template=course_template,
            title=row_data.get(
                'event_title', row_data.get('Event title', '')),
            location=location,
            venue=venue,
            primary_instructor=primary_instructor,
            learning_mode=learning_mode,
            max_places=row_data.get('Max places', 0),
            sitting=row_data.get('sitting', row_data.get('Sitting', '')),
            web_sale=row_data.get('Web sale', True),
        )

        if debug:
            logger.debug(
                f"Created bridge record: {bridge_event.external_id}")
        return bridge_event
    except Exception as e:
        logger.error(f"Failed to create bridge record: {e}")
        if debug:
            logger.exception(e)
        return None
