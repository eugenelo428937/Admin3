"""
Data migration: copy ADM records to Acted schema tables.

Uses apps.get_model() for historical model state so it works regardless
of future field removals on the adm models.
"""
from django.db import migrations


def forwards(apps, schema_editor):
    """Migrate data from ADM to Acted schema tables."""
    User = apps.get_model('auth', 'User')
    Location = apps.get_model('administrate', 'Location')
    Venue = apps.get_model('administrate', 'Venue')
    CourseTemplate = apps.get_model('administrate', 'CourseTemplate')
    Instructor = apps.get_model('administrate', 'Instructor')
    TutorialLocation = apps.get_model('tutorials', 'TutorialLocation')
    TutorialVenue = apps.get_model('tutorials', 'TutorialVenue')
    TutorialCourseTemplate = apps.get_model('tutorials', 'TutorialCourseTemplate')
    TutorialInstructor = apps.get_model('tutorials', 'TutorialInstructor')
    Staff = apps.get_model('tutorials', 'Staff')

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

    # Step 2: Venues
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

    # Step 4: Instructors
    instr_count = 0
    staff_count = 0
    for adm_instr in Instructor.objects.all():
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


def backwards(apps, schema_editor):
    """Reverse: clear cross-schema FKs."""
    Location = apps.get_model('administrate', 'Location')
    Venue = apps.get_model('administrate', 'Venue')
    CourseTemplate = apps.get_model('administrate', 'CourseTemplate')
    Instructor = apps.get_model('administrate', 'Instructor')

    Location.objects.update(tutorial_location=None)
    Venue.objects.update(tutorial_venue=None)
    CourseTemplate.objects.update(tutorial_course_template=None)
    Instructor.objects.update(tutorial_instructor=None)


class Migration(migrations.Migration):

    dependencies = [
        ("tutorials", "0005_add_fks_to_events_sessions"),
        ("administrate", "0005_add_cross_schema_fks_to_acted"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
