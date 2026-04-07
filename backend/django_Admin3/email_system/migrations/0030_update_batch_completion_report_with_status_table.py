# Generated migration to update batch_completion_report template
# Adds a table of all batch recipients with color-coded Success/Failed status

from django.db import migrations


def update_batch_completion_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    try:
        template = EmailTemplate.objects.get(name='batch_completion_report')
        template.mjml_content = BATCH_COMPLETION_MJML
        template.save(update_fields=['mjml_content'])
    except EmailTemplate.DoesNotExist:
        pass


def reverse_migration(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    try:
        template = EmailTemplate.objects.get(name='batch_completion_report')
        template.mjml_content = OLD_BATCH_COMPLETION_MJML
        template.save(update_fields=['mjml_content'])
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

        {% if all_items %}
        <!-- All Recipients Status Table -->
        <mj-text padding-bottom="8px" align="left" css-class="content-text">
            <span style="font-size: 18px; font-weight: 600; color: #2c3e50;">Recipient Status</span>
        </mj-text>

        <mj-text padding="0 24px 24px 24px" align="left" css-class="content-text">
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
                <thead>
                    <tr style="background-color: #ececee; color: #2c3e50;">
                        <th style="padding: 10px; text-align: left; border: none;">#</th>
                        <th style="padding: 10px; text-align: left; border: none;">Recipient</th>
                        <th style="padding: 10px; text-align: center; border: none;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {% for item in all_items %}
                    <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 10px; border: none; text-align: left;">{{ forloop.counter }}</td>
                        <td style="padding: 10px; border: none; text-align: left;">{{ item.to_email }}</td>
                        {% if item.is_success %}
                        <td style="padding: 8px 10px; border: none; text-align: center; background-color: #d4edda; color: #155724; font-weight: 600; border-radius: 4px;">Success</td>
                        {% else %}
                        <td style="padding: 8px 10px; border: none; text-align: center; background-color: #f8d7da; color: #721c24; font-weight: 600; border-radius: 4px;">Failed</td>
                        {% endif %}
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </mj-text>
        {% endif %}

        {% if error_items %}
        <!-- Error Details -->
        <mj-text padding-bottom="8px" align="left" css-class="content-text">
            <span style="font-size: 18px; font-weight: 600; color: #2c3e50;">Error Details</span>
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


# Previous template content for reverse migration
OLD_BATCH_COMPLETION_MJML = """
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
        ("email_system", "0029_add_email_variable_and_payload_schema"),
    ]

    operations = [
        migrations.RunPython(update_batch_completion_template, reverse_migration),
    ]
