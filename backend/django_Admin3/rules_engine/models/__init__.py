# Rules Engine Models
from .rule_entry_point import RuleEntryPoint
from .message_template import MessageTemplate
from .rule import Rule
from .rule_condition import RuleCondition
from .rule_action import RuleAction
from .rule_condition_group import RuleConditionGroup
from .holiday_calendar import HolidayCalendar
from .rule_execution_legacy import RuleExecution as RuleExecutionLegacy
from .user_acknowledgment import UserAcknowledgment
from .rule_chain import RuleChain
from .rule_chain_link import RuleChainLink
from .content_style_theme import ContentStyleTheme
from .content_style import ContentStyle
from .message_template_style import MessageTemplateStyle

# New JSONB-based models with acted_ prefix
from .acted_rules_fields import ActedRulesFields
from .acted_rule import ActedRule
from .acted_rule_execution import ActedRuleExecution

# Backward compatibility - keep old names available but point to new models
RulesFields = ActedRulesFields
RuleNew = ActedRule
RuleExecution = ActedRuleExecution

__all__ = [
    'RuleEntryPoint',
    'MessageTemplate', 
    'Rule',
    'RuleCondition',
    'RuleAction',
    'RuleConditionGroup',
    'HolidayCalendar',
    'RuleExecutionLegacy',
    'UserAcknowledgment',
    'RuleChain',
    'RuleChainLink',
    'ContentStyleTheme',
    'ContentStyle',
    'MessageTemplateStyle',
    # New JSONB-based models
    'ActedRulesFields',
    'ActedRule', 
    'ActedRuleExecution',
    # Backward compatibility aliases
    'RulesFields',
    'RuleNew',
    'RuleExecution',
]