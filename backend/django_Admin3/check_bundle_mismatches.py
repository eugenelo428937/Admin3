import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from exam_sessions_subjects_products.models import ExamSessionSubjectBundle

print('=== Exam Session Bundle Subject Mismatches ===\n')
exam_bundles = ExamSessionSubjectBundle.objects.filter(is_active=True).select_related(
    'bundle__subject',
    'exam_session_subject__subject'
)

mismatches = 0
matches = 0

for eb in exam_bundles:
    master_subject = eb.bundle.subject.code
    exam_subject = eb.exam_session_subject.subject.code

    if master_subject != exam_subject:
        mismatches += 1
        print(f'[MISMATCH] ID={eb.id} | Bundle: {eb.bundle.bundle_name} | Master: {master_subject} | Exam: {exam_subject}')
    else:
        matches += 1

print(f'\nTotal bundles: {exam_bundles.count()}')
print(f'Matches: {matches}')
print(f'Mismatches: {mismatches}')
