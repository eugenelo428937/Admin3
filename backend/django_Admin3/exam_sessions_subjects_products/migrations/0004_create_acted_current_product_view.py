from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions_subjects_products', '0003_examsessionsubjectproductvariation_product_code'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE VIEW acted_current_product AS
            SELECT es.id as exam_session_id, es.session_code, s.id as subject_id, s.code as subject_code, p.id as product_id, p.code as product_code, p.fullname, essp.id as essp_id,
                   s.code || '/' || pv.code || p.code || '/' || es.session_code as full_product_code,
                   esspv.id AS esspv_id
            FROM acted_exam_session_subject_product_variations esspv
            LEFT JOIN acted_exam_session_subject_products essp ON essp.id = esspv.exam_session_subject_product_id
            LEFT JOIN acted_exam_session_subjects ess ON essp.exam_session_subject_id = ess.id
            LEFT JOIN acted_subjects s ON s.id = ess.subject_id
            LEFT JOIN acted_exam_sessions es ON es.id = ess.exam_session_id
            LEFT JOIN acted_products p ON p.id = essp.product_id 
            LEFT JOIN acted_product_productvariation ppv ON esspv.product_product_variation_id = ppv.id
            LEFT JOIN acted_product_variations pv ON pv.id = ppv.product_variation_id;
            """,
            reverse_sql="DROP VIEW IF EXISTS acted_current_product;"
        )
    ]
