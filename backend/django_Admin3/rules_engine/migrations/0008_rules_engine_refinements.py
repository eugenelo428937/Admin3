# Generated migration for rules engine refinements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rules_engine', '0007_add_entry_points'),
    ]

    operations = [
        # Add rule chain execution order model
        migrations.CreateModel(
            name='RuleChain',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('entry_point', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chains', to='rules_engine.ruleentrypoint')),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('stop_on_failure', models.BooleanField(default=True, help_text='Stop chain execution if any rule fails')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Rule Chain',
                'verbose_name_plural': 'Rule Chains',
                'db_table': 'acted_rule_chains',
                'ordering': ['entry_point__code', 'name'],
            },
        ),
        
        migrations.CreateModel(
            name='RuleChainLink',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('execution_order', models.IntegerField(help_text='Order of execution within the chain')),
                ('is_active', models.BooleanField(default=True)),
                ('continue_on_failure', models.BooleanField(default=False, help_text='Continue to next rule even if this one fails')),
                ('chain', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='links', to='rules_engine.rulechain')),
                ('rule', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chain_links', to='rules_engine.rule')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Rule Chain Link',
                'verbose_name_plural': 'Rule Chain Links',
                'db_table': 'acted_rule_chain_links',
                'ordering': ['chain', 'execution_order'],
                'unique_together': {('chain', 'rule')},
            },
        ),
        
        # Add composite condition support
        migrations.CreateModel(
            name='RuleConditionGroup',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('rule', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='condition_groups',
                    to='rules_engine.rule'
                )),
                ('logical_operator', models.CharField(
                    choices=[('AND', 'All conditions must be true'), ('OR', 'At least one condition must be true')],
                    default='AND',
                    max_length=3
                )),
                ('parent_group', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='child_groups',
                    to='rules_engine.ruleconditiongroup'
                )),
                ('execution_order', models.IntegerField(default=1)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Rule Condition Group',
                'verbose_name_plural': 'Rule Condition Groups',
                'db_table': 'acted_rule_condition_groups',
                'ordering': ['rule', 'execution_order'],
            },
        ),
        
        # Add condition group reference to existing conditions
        migrations.AddField(
            model_name='rulecondition',
            name='condition_group',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='conditions',
                to='rules_engine.ruleconditiongroup'
            ),
        ),
        
        # Add success/failure criteria to rules
        migrations.AddField(
            model_name='rule',
            name='success_criteria',
            field=models.CharField(
                choices=[
                    ('all_conditions', 'All conditions must pass'),
                    ('any_condition', 'At least one condition must pass'),
                    ('custom_function', 'Use custom function to determine success')
                ],
                default='all_conditions',
                max_length=20,
                help_text='Criteria for determining if this rule succeeds'
            ),
        ),
        
        migrations.AddField(
            model_name='rule',
            name='success_function',
            field=models.CharField(
                blank=True,
                help_text='Custom function name for success criteria evaluation',
                max_length=100
            ),
        ),
        
        migrations.AddField(
            model_name='rule',
            name='return_on_failure',
            field=models.BooleanField(
                default=False,
                help_text='Return false and stop chain execution if this rule fails'
            ),
        ),
        
        # Update condition types to include new refined types
        migrations.AlterField(
            model_name='rulecondition',
            name='condition_type',
            field=models.CharField(
                choices=[
                    ('product_category', 'Product Category'),
                    ('product_code', 'Product Code'),
                    ('product_type', 'Product Type'),
                    ('user_type', 'User Type'),
                    ('date_range', 'Date Range'),
                    ('holiday_proximity', 'Holiday Proximity'),
                    ('cart_value', 'Cart Value'),
                    ('cart_item_count', 'Cart Item Count'),
                    ('user_order_history', 'User Order History'),
                    ('custom_field', 'Custom Field'),
                    # New condition types from refinement requirements
                    ('user_country', 'User Country'),
                    ('user_home_address', 'User Home Address'),
                    ('user_home_email', 'User Home Email'),
                    ('user_work_address', 'User Work Address'),
                    ('user_work_email', 'User Work Email'),
                    ('user_is_reduced_rate', 'User Is Reduced Rate'),
                    ('user_is_apprentice', 'User Is Apprentice'),
                    ('user_is_caa', 'User Is CAA'),
                    ('user_is_study_plus', 'User Is Study Plus'),
                    ('cart_has_material', 'Cart Has Material'),
                    ('cart_has_marking', 'Cart Has Marking'),
                    ('cart_has_tutorial', 'Cart Has Tutorial'),
                    ('product_variations', 'Product Variations'),
                    ('material_despatch_date', 'Material Despatch Date'),
                    ('marking_expired_deadlines', 'Marking Expired Deadlines'),
                    ('tutorial_has_started', 'Tutorial Has Started'),
                    ('exam_session_transition_period', 'Exam Session Transition Period'),
                    ('date_xmas', 'Christmas Period'),
                    ('date_easter', 'Easter Period'),
                    ('checkout_payment_method', 'Checkout Payment Method'),
                    ('checkout_employer_code', 'Checkout Employer Code'),
                ],
                max_length=30
            ),
        ),
        
        # Enhanced action types
        migrations.AlterField(
            model_name='ruleaction',
            name='action_type',
            field=models.CharField(
                choices=[
                    # New refined action types
                    ('display', 'Display Message'),
                    ('acknowledge', 'Require Acknowledgment'),
                    ('update', 'Update Values'),
                    ('custom', 'Custom Function'),
                    # Legacy types for backward compatibility
                    ('show_message', 'Show Message'),
                    ('require_acknowledgment', 'Require Acknowledgment'),
                    ('redirect', 'Redirect'),
                    ('send_email', 'Send Email'),
                    ('log_event', 'Log Event'),
                    ('custom_function', 'Custom Function'),
                    ('calculate_vat', 'Calculate VAT'),
                    ('apply_discount', 'Apply Discount'),
                    ('calculate_fee', 'Calculate Fee'),
                ],
                max_length=30
            ),
        ),
    ]