# Generated by Django 5.1.1 on 2025-05-02 15:38

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('exam_sessions_subjects_products', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MarkingPaper',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=10)),
                ('deadline', models.DateTimeField()),
                ('recommended_submit_date', models.DateTimeField()),
                ('exam_session_subject_product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='marking_papers', to='exam_sessions_subjects_products.examsessionsubjectproduct')),
            ],
            options={
                'db_table': 'acted_marking_paper',
            },
        ),
    ]
