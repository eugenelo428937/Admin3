# Migration to make email templates fully DB-driven.
# Replaces {% include %} tags in master template with {{ placeholder|safe }}
# so that banner, footer, and styles are loaded from DB records, not files.

from django.db import migrations


NEW_MASTER_TEMPLATE = """<mjml>
  <mj-head>
    <mj-title>{{ email_title|default:"Email from ActEd" }}</mj-title>
    <mj-preview>{{ email_preview|default:"Email from ActEd" }}</mj-preview>

    <!-- Global Attributes -->
    <mj-attributes>
      <mj-all font-family="'Poppins', Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="20px" color="#555555" />
      <mj-section padding="0" />
      <mj-column padding="0" />
    </mj-attributes>

    <!-- Styles loaded from DB -->
    {{ styles_content|safe }}
  </mj-head>

  <mj-body background-color="#f3f3f3" width="600px">

    {% if dev_mode_active %}
    <!-- Development Mode Warning -->
    <mj-section full-width="full-width" background-color="#fadede" >
      <mj-column width="100%">
        <mj-text
          align="center"
          color="#000000"
          font-size="12px"
          font-weight="bold"
        >
          DEVELOPMENT MODE<br/>
          Original recipient: {{ dev_original_recipients|join:", " }}
        </mj-text>
      </mj-column>
    </mj-section>
    {% endif %}
    <mj-wrapper>
      <!-- Banner loaded from DB -->
      {{ banner_content|safe }}

      <!-- Dynamic Content Section -->
      {{ email_content|safe }}

      <!-- Footer loaded from DB -->
      {{ footer_content|safe }}
    </mj-wrapper>
  </mj-body>
</mjml>"""


def update_master_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    try:
        master = EmailTemplate.objects.get(name='master_template', is_master=True)
        # Save old content for reverse migration
        master.basic_mode_content = master.mjml_content  # stash old value
        master.mjml_content = NEW_MASTER_TEMPLATE.strip()
        master.save()
    except EmailTemplate.DoesNotExist:
        pass


def reverse_master_template(apps, schema_editor):
    EmailTemplate = apps.get_model('email_system', 'EmailTemplate')
    try:
        master = EmailTemplate.objects.get(name='master_template', is_master=True)
        if master.basic_mode_content:
            master.mjml_content = master.basic_mode_content
            master.basic_mode_content = ''
            master.save()
    except EmailTemplate.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("email_system", "0014_fix_batch_completion_template"),
    ]

    operations = [
        migrations.RunPython(update_master_template, reverse_master_template),
    ]
