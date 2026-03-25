# Email system models
from .template import EmailTemplate, EmailAttachment, EmailTemplateAttachment
from .queue import EmailQueue
from .log import EmailLog
from .settings import EmailSettings
from .content_rule import EmailContentRule, EmailTemplateContentRule
from .placeholder import EmailContentPlaceholder
from .closing_salutation import ClosingSalutation, ClosingSalutationStaff
from .email_mjml_element import EmailMjmlElement
from .api_key import ExternalApiKey
from .batch import EmailBatch

__all__ = [
    'EmailTemplate',
    'EmailAttachment',
    'EmailTemplateAttachment',
    'EmailQueue',
    'EmailLog',
    'EmailSettings',
    'EmailContentRule',
    'EmailTemplateContentRule',
    'EmailContentPlaceholder',
    'ClosingSalutation',
    'ClosingSalutationStaff',
    'EmailMjmlElement',
    'ExternalApiKey',
    'EmailBatch',
]
