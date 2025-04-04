# Generated by Django 5.1.7 on 2025-04-04 23:04

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions', '0003_alter_examsession_table'),
        ('products', '0003_alter_product_table'),
        ('subjects', '0003_alter_subject_table'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='examsession',
            table='acted_exam_sessions',
        ),
        migrations.CreateModel(
            name='ExamSessionSubject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('exam_session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='exam_sessions.examsession')),
                ('subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='subjects.subject')),
            ],
            options={
                'verbose_name': 'Exam Session Subject',
                'verbose_name_plural': 'Exam Session Subjects',
                'db_table': 'acted_exam_session_subjects',
            },
        ),
        migrations.CreateModel(
            name='ExamSessionSubjectProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('exam_session_subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='exam_sessions.examsessionsubject')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.product')),
            ],
            options={
                'verbose_name': 'Exam Session Subject Product',
                'verbose_name_plural': 'Exam Session Subject Products',
                'db_table': 'acted_exam_session_subject_products',
                'unique_together': {('exam_session_subject', 'product')},
            },
        ),
        migrations.AddField(
            model_name='examsessionsubject',
            name='products',
            field=models.ManyToManyField(through='exam_sessions.ExamSessionSubjectProduct', to='products.product'),
        ),
        migrations.AlterUniqueTogether(
            name='examsessionsubject',
            unique_together={('exam_session', 'subject')},
        ),
    ]
