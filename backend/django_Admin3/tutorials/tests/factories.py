"""Shared object factories for tutorial-enrolment tests."""
from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from staff.models import Staff
from store.models import TutorialProduct
from students.models import Student
from tutorials.models import (
    TutorialEvents, TutorialInstructor, TutorialLocation, TutorialSessions,
    TutorialVenue,
)


_STUDENT_COUNTER = {'n': 0}


def make_subject(code='CM2'):
    subj, _ = Subject.objects.get_or_create(
        code=code, defaults={'description': f'{code} subject', 'active': True},
    )
    return subj


def make_exam_session(code='APR2026'):
    es, _ = ExamSession.objects.get_or_create(
        session_code=code,
        defaults={
            'start_date': timezone.now() + timedelta(days=30),
            'end_date': timezone.now() + timedelta(days=60),
        },
    )
    return es


def make_store_product(subject=None, exam_session=None,
                       variation_type='Tutorial', variation_code='F2F_3F',
                       cat_product_code='Live', format='F2F_3F'):
    """Return a TutorialProduct for use in TutorialEvents fixtures.

    Phase 4b: TutorialEvents.store_product is now typed as TutorialProduct.
    The `format` parameter defaults to 'F2F_3F' (a valid TutorialProduct.Format
    choice). Pass any valid TutorialProduct.Format value to override.
    """
    subject = subject or make_subject()
    exam_session = exam_session or make_exam_session()
    ess, _ = ExamSessionSubject.objects.get_or_create(
        exam_session=exam_session, subject=subject,
    )
    cat_prod, _ = CatProduct.objects.get_or_create(
        code=cat_product_code,
        defaults={'fullname': f'Tutorial - {cat_product_code}', 'shortname': cat_product_code},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code=variation_code,
        defaults={'name': variation_code, 'description': '',
                  'description_short': variation_code, 'variation_type': variation_type},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=cat_prod, product_variation=pv,
    )
    tp = TutorialProduct(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=f'{subject.code}/{cat_product_code}/{variation_code}/{exam_session.session_code}',
        format=format,
    )
    tp.save()
    return tp


def make_event(store_product=None, code='EV-001'):
    # Phase 5b (2026-05-16): legacy start_date/end_date dropped; the
    # canonical fields are lms_start_date / lms_end_date (DateTime).
    sp = store_product or make_store_product()
    return TutorialEvents.objects.create(
        code=code, store_product=sp,
        lms_start_date=timezone.now(),
        lms_end_date=timezone.now() + timedelta(days=2),
    )


def make_session(event=None, sequence=1, title=None):
    event = event or make_event()
    title = title or f'{event.code} Day {sequence}'
    return TutorialSessions.objects.create(
        tutorial_event=event,
        title=title,
        sequence=sequence,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(hours=6),
    )


def make_student(username=None):
    if username is None:
        _STUDENT_COUNTER['n'] += 1
        username = f'student{_STUDENT_COUNTER["n"]}'
    user = User.objects.create_user(username=username, email=f'{username}@test.com')
    return Student.objects.create(user=user)


_INSTRUCTOR_COUNTER = {'n': 0}


def make_location(name='London', code='LON'):
    loc, _ = TutorialLocation.objects.get_or_create(
        name=name, defaults={'code': code, 'is_active': True},
    )
    return loc


def make_venue(name='BPP Centre', location=None):
    return TutorialVenue.objects.create(name=name, location=location)


def make_instructor(first_name='Karen', last_name='Smith'):
    _INSTRUCTOR_COUNTER['n'] += 1
    n = _INSTRUCTOR_COUNTER['n']
    user = User.objects.create_user(
        username=f'instr{n}',
        first_name=first_name,
        last_name=last_name,
        email=f'instr{n}@test.com',
    )
    staff = Staff.objects.create(user=user)
    return TutorialInstructor.objects.create(staff=staff, is_active=True)
