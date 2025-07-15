from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions_subjects_products', '0007_examsessionsubjectbundle_and_more'),
        ('products', '0007_new_bundle_structure'),
        ('exam_sessions_subjects', '0001_initial'),
    ]

    operations = [
        # Step 1: Drop existing bundle tables since this is a new project
        migrations.RunSQL(
            "DROP TABLE IF EXISTS acted_exam_session_subject_bundle_products CASCADE;",
            reverse_sql=migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            "DROP TABLE IF EXISTS acted_exam_session_subject_bundles CASCADE;",
            reverse_sql=migrations.RunSQL.noop
        ),
        
        # Step 2: Create new ExamSessionSubjectBundle table
        migrations.CreateModel(
            name='ExamSessionSubjectBundle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this bundle is currently available for the exam session')),
                ('override_name', models.CharField(blank=True, help_text='Optional override for the bundle name (defaults to master bundle name)', max_length=255, null=True)),
                ('override_description', models.TextField(blank=True, help_text='Optional override for the bundle description', null=True)),
                ('display_order', models.PositiveIntegerField(default=0, help_text='Order in which to display this bundle for the exam session')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bundle', models.ForeignKey(help_text='The master bundle template this is based on', on_delete=django.db.models.deletion.CASCADE, related_name='exam_session_bundles', to='products.productbundle')),
                ('exam_session_subject', models.ForeignKey(help_text='The specific exam session and subject this bundle is for', on_delete=django.db.models.deletion.CASCADE, related_name='bundles', to='exam_sessions_subjects.examsessionsubject')),
            ],
            options={
                'verbose_name': 'Exam Session Subject Bundle',
                'verbose_name_plural': 'Exam Session Subject Bundles',
                'db_table': 'acted_exam_session_subject_bundles',
                'ordering': ['exam_session_subject__exam_session__session_code', 'display_order', 'bundle__bundle_name'],
            },
        ),
        
        # Step 3: Create new ExamSessionSubjectBundleProduct table
        migrations.CreateModel(
            name='ExamSessionSubjectBundleProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('default_price_type', models.CharField(choices=[('standard', 'Standard'), ('retaker', 'Retaker'), ('additional', 'Additional Copy')], default='standard', help_text='Default price type for this product when added via bundle', max_length=20)),
                ('quantity', models.PositiveIntegerField(default=1, help_text='Number of this product to add when bundle is selected')),
                ('sort_order', models.PositiveIntegerField(default=0, help_text='Display order of this product within the bundle')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this product is currently active in the bundle')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bundle', models.ForeignKey(help_text='The exam session bundle this product belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='bundle_products', to='exam_sessions_subjects_products.examsessionsubjectbundle')),
                ('exam_session_subject_product_variation', models.ForeignKey(help_text='The specific exam session product variation included in the bundle', on_delete=django.db.models.deletion.CASCADE, to='exam_sessions_subjects_products.examsessionsubjectproductvariation')),
            ],
            options={
                'verbose_name': 'Exam Session Bundle Product',
                'verbose_name_plural': 'Exam Session Bundle Products',
                'db_table': 'acted_exam_session_subject_bundle_products',
                'ordering': ['sort_order', 'exam_session_subject_product_variation__exam_session_subject_product__product__shortname'],
            },
        ),
        
        # Step 4: Add unique constraints
        migrations.AlterUniqueTogether(
            name='examsessionsubjectbundle',
            unique_together={('bundle', 'exam_session_subject')},
        ),
        
        migrations.AlterUniqueTogether(
            name='examsessionsubjectbundleproduct',
            unique_together={('bundle', 'exam_session_subject_product_variation')},
        ),
        
        # Step 5: Add many-to-many relationship
        migrations.AddField(
            model_name='examsessionsubjectbundle',
            name='product_variations',
            field=models.ManyToManyField(help_text='Exam session product variations included in this bundle', related_name='bundles', through='exam_sessions_subjects_products.ExamSessionSubjectBundleProduct', to='exam_sessions_subjects_products.examsessionsubjectproductvariation'),
        ),
    ] 