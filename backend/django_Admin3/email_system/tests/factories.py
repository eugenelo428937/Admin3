"""Test factories for the email_system app.

Since the versioning refactor, ``EmailTemplate`` no longer carries content
fields directly — all content lives on ``EmailTemplateVersion``. Tests that
just need "a template with this subject and this MJML" should go through
``make_template`` so the first version is created in one call.
"""
from email_system.models import EmailTemplate


def make_template(
    *,
    name='tpl',
    display_name=None,
    template_type='ORDER',
    subject_template='',
    mjml_content='',
    basic_mode_content='',
    closing_salutation=None,
    user=None,
    change_note='test initial version',
    **template_kwargs,
) -> EmailTemplate:
    """Create an EmailTemplate plus an initial EmailTemplateVersion.

    Returns the template. Its ``current_version`` is the freshly-created v1.
    Any extra ``template_kwargs`` are forwarded to ``EmailTemplate.objects.create``
    (e.g. ``from_email``, ``reply_to_email``, ``default_priority``, ``is_active``).
    """
    template = EmailTemplate.objects.create(
        name=name,
        display_name=display_name or name,
        template_type=template_type,
        **template_kwargs,
    )
    template.create_version(
        subject_template=subject_template,
        mjml_content=mjml_content,
        basic_mode_content=basic_mode_content,
        closing_salutation=closing_salutation,
        user=user,
        change_note=change_note,
    )
    return template


def update_template_content(
    template: EmailTemplate,
    *,
    subject_template=None,
    mjml_content=None,
    basic_mode_content=None,
    closing_salutation=None,
    user=None,
    change_note='test update',
):
    """Create a new version for ``template``, falling back to the prior
    version's values for any field not supplied. Mirrors what the admin
    ViewSet does in ``perform_update``.
    """
    cur = template.current_version

    def _pick(value, fallback):
        return value if value is not None else fallback

    return template.create_version(
        subject_template=_pick(
            subject_template, cur.subject_template if cur else '',
        ),
        mjml_content=_pick(
            mjml_content, cur.mjml_content if cur else '',
        ),
        basic_mode_content=_pick(
            basic_mode_content, cur.basic_mode_content if cur else '',
        ),
        closing_salutation=_pick(
            closing_salutation, cur.closing_salutation if cur else None,
        ),
        user=user,
        change_note=change_note,
    )
