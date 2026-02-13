from .custom_fields import CustomField
from .course_templates import CourseTemplate
from .price_levels import PriceLevel
from .course_template_price_levels import CourseTemplatePriceLevel
from .locations import Location
from .instructors import Instructor
from .venues import Venue
from .events import Event, Session
# Import any other models to maintain backward compatibility
# This ensures that imports like `from administrate.models import CustomField` still work
