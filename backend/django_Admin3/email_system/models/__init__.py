# Email system models
from .template import EmailTemplate, EmailAttachment, EmailTemplateAttachment
from .master_component import EmailMasterComponent
from .queue import EmailQueue
from .log import EmailLog
from .settings import EmailSettings
from .content_rule import EmailContentRule, EmailTemplateContentRule
from .placeholder import EmailContentPlaceholder
from .closing_salutation import ClosingSalutation
from .email_mjml_element import EmailMjmlElement
from .api_key import ExternalApiKey
from .batch import EmailBatch

__all__ = [
    'EmailTemplate',
    'EmailAttachment',
    'EmailTemplateAttachment',
    'EmailMasterComponent',
    'EmailQueue',
    'EmailLog',
    'EmailSettings',
    'EmailContentRule',
    'EmailTemplateContentRule',
    'EmailContentPlaceholder',
    'ClosingSalutation',
    'EmailMjmlElement',
    'ExternalApiKey',
    'EmailBatch',
]
