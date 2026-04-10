cd backend/django_Admin3

# Anonymize + import in one go
python manage.py import_students --csv ../../docs/misc/students.csv --anonymize --batch-size 100

# Anonymize + import with dry-run (inspect tables, then press Enter to rollback)
python manage.py import_students --csv ../../docs/misc/students.csv --anonymize --dry-run

# Anonymize only (review CSV first)
python manage.py import_students --csv ../../docs/misc/students.csv --anonymize-only

# Import pre-anonymized CSV
python manage.py import_students --csv ../../docs/misc/students_anonymized.csv --batch-size 100

# Resume from row 500
python manage.py import_students --csv ../../docs/misc/students_anonymized.csv --offset 500