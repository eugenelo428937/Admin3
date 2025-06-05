# Generated migration for simplified tutorial events

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('exam_sessions_subjects_products', '0006_price_price_type_alter_price_variation_and_more'),
        ('tutorials', '0002_event_exam_session_subject_product_alter_event_table_and_more'),
    ]

    operations = [
        # Remove old models first (this will handle all dependencies)
        migrations.DeleteModel(
            name='Session',
        ),
        migrations.DeleteModel(
            name='Event',
        ),
        
        # Create new simplified model
        migrations.CreateModel(
            name='TutorialEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=100, unique=True)),
                ('venue', models.CharField(max_length=255)),
                ('is_soldout', models.BooleanField(default=False)),
                ('finalisation_date', models.DateField(blank=True, null=True)),
                ('remain_space', models.IntegerField(default=0)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('exam_session_subject_product_variation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tutorial_events', to='exam_sessions_subjects_products.examsessionsubjectproductvariation')),
            ],
            options={
                'verbose_name': 'Tutorial Event',
                'verbose_name_plural': 'Tutorial Events',
                'db_table': 'tutorial_events',
                'ordering': ['start_date', 'code'],
            },
        ),
    ]
