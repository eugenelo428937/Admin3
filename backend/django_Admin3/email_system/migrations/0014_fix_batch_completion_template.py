# Generated migration to fix batch_completion_report template
# Root cause: template had use_master_template=False and empty mjml_content,
# causing mjml2html('') to fail with "unable to find mjml element"

from django.db import migrations


def fix_batch_completion_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    try:
        template = EmailTemplate.objects.get(name='batch_completion_report')
        template.use_master_template = True
        template.mjml_content = BATCH_COMPLETION_MJML
        template.save()
    except EmailTemplate.DoesNotExist:
        pass


def reverse_migration(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    try:
        template = EmailTemplate.objects.get(name='batch_completion_report')
        template.use_master_template = False
        template.mjml_content = ''
        template.save()
    except EmailTemplate.DoesNotExist:
        pass


BATCH_COMPLETION_MJML = """
<mj-section css-class="content-section" text-align="center" background-color="#ffffff">
    <mj-column width="100%" padding="0" css-class="content-column">
        <!-- Header -->
        <mj-text
            padding-top="32px"
            padding-bottom="16px"
            align="center"
            css-class="email-title"
            font-size="21px">
            <span style="color: #2c3e50; margin: 0; font-size: 21px; font-weight: 600;">
                Email Batch Report
            </span>
        </mj-text>

        <!-- Batch Details -->
        <mj-text padding-bottom="16px" align="left" css-class="content-text">
            <span><strong>Requested by:</strong> {{ requested_by }}</span><br/>
            <span><strong>Batch ID:</strong> {{ batch_id }}</span>
        </mj-text>

        <!-- Results Summary -->
        <mj-text padding-bottom="24px" align="left" css-class="content-text">
            <span><strong>Results:</strong> {{ sent_count }} sent, {{ error_count }} errors out of {{ total_items }} total</span>
        </mj-text>

        {% if error_items %}
        <!-- Error Details -->
        <mj-text padding-bottom="8px" align="left" css-class="content-text">
            <span style="font-size: 18px; font-weight: 600; color: #2c3e50;">Errors</span>
        </mj-text>

        <mj-text padding="0 24px 24px 24px" align="left" css-class="content-text">
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
                <thead>
                    <tr style="background-color: #ececee; color: #2c3e50;">
                        <th style="padding: 10px; text-align: left; border: none;">Recipient</th>
                        <th style="padding: 10px; text-align: center; border: none;">Attempts</th>
                        <th style="padding: 10px; text-align: left; border: none;">Error</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in error_items %}
                    <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 10px; border: none; text-align: left;">{{ item.to_email }}</td>
                        <td style="padding: 10px; border: none; text-align: center;">{{ item.attempts }}</td>
                        <td style="padding: 10px; border: none; text-align: left;">{{ item.error_response.error_message }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </mj-text>
        {% endif %}
    </mj-column>
</mj-section>
""".strip()


class Migration(migrations.Migration):

    dependencies = [
        ("email_system", "0013_create_batch_completion_template"),
    ]

    operations = [
        migrations.RunPython(fix_batch_completion_template, reverse_migration),
    ]
