from .custom_fields import CustomField
from .course_templates import CourseTemplate
from .price_levels import PriceLevel
from .course_template_price_levels import CourseTemplatePriceLevel
from .locations import Location
from .instructors import Instructor
from .venues import Venue
from .events import Event, Session
from .contacts import Contact  # noqa: F401
from .learners import Learner  # noqa: F401
from .api_audit_log import ApiAuditLog
from .webhook_inbox import WebhookInbox  # noqa: F401
from .webhook_registration import WebhookRegistration  # noqa: F401
# Import any other models to maintain backward compatibility
# This ensures that imports like `from administrate.models import CustomField` still work
