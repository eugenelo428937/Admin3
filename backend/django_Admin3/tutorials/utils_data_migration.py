"""
Data migration utility: copy ADM records to Acted schema tables.

Called by migration 0006 and directly by tests.
Uses get_or_create for idempotency.
"""
from django.contrib.auth.models import User


def migrate_adm_to_acted():
    """Migrate data from adm schema to acted schema tables."""
    from administrate.models import (
        CourseTemplate, Instructor, Location, Venue,
    )
    from tutorials.models import (
        TutorialCourseTemplate, Staff, TutorialInstructor,
        TutorialLocation, TutorialVenue,
    )

    # Step 1: Locations
    loc_count = 0
    for adm_loc in Location.objects.all():
        tl, _ = TutorialLocation.objects.get_or_create(
            name=adm_loc.name,
            defaults={
                'code': adm_loc.code or '',
                'is_active': adm_loc.active,
            },
        )
        adm_loc.tutorial_location = tl
        adm_loc.save(update_fields=['tutorial_location'])
        loc_count += 1
    print(f"  Migrated {loc_count} locations")

    # Step 2: Venues (after locations, so we can resolve location FK)
    ven_count = 0
    for adm_ven in Venue.objects.select_related('location').all():
        acted_location = None
        if adm_ven.location and adm_ven.location.tutorial_location:
            acted_location = adm_ven.location.tutorial_location

        tv, _ = TutorialVenue.objects.get_or_create(
            name=adm_ven.name,
            defaults={
                'description': adm_ven.description or '',
                'location': acted_location,
            },
        )
        adm_ven.tutorial_venue = tv
        adm_ven.save(update_fields=['tutorial_venue'])
        ven_count += 1
    print(f"  Migrated {ven_count} venues")

    # Step 3: Course templates
    ct_count = 0
    for adm_ct in CourseTemplate.objects.all():
        tct, _ = TutorialCourseTemplate.objects.get_or_create(
            code=adm_ct.code,
            defaults={
                'title': adm_ct.title,
                'is_active': adm_ct.active,
            },
        )
        adm_ct.tutorial_course_template = tct
        adm_ct.save(update_fields=['tutorial_course_template'])
        ct_count += 1
    print(f"  Migrated {ct_count} course templates")

    # Step 4: Instructors (with optional Staff + auth_user linkage)
    instr_count = 0
    staff_count = 0
    for adm_instr in Instructor.objects.all():
        # Try to find matching auth_user by email
        staff_obj = None
        if adm_instr.email:
            auth_user = User.objects.filter(email=adm_instr.email).first()
            if auth_user:
                staff_obj, created = Staff.objects.get_or_create(user=auth_user)
                if created:
                    staff_count += 1

        ti, _ = TutorialInstructor.objects.get_or_create(
            staff=staff_obj,
            defaults={'is_active': adm_instr.is_active},
        )
        adm_instr.tutorial_instructor = ti
        adm_instr.save(update_fields=['tutorial_instructor'])
        instr_count += 1
    print(f"  Migrated {instr_count} instructors ({staff_count} new staff records)")
