"""
User Preference Action Handler for Rules Engine
"""
import logging
from typing import Dict, Any

from rules_engine.models import MessageTemplate

logger = logging.getLogger(__name__)


class UserPreferenceHandler:
    """Handler for user_preference action type"""

    def save_preference(self, action: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Save a user preference to OrderUserPreference"""
        try:
            # For checkout preferences, we don't save immediately
            # The frontend will collect the preference and save it with the order
            # This method is kept for potential future use with logged-in users

            return {
                'success': True,
                'message': 'Preference will be saved with order'
            }

        except Exception as e:
            logger.error(f"Error preparing preference: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def format_preference_for_response(self, action: Dict[str, Any], template_content: Any) -> Dict[str, Any]:
        """Format preference action for API response"""
        response = {
            'type': 'user_preference',
            'preferenceKey': action.get('preferenceKey'),
            'title': action.get('title'),
            'content': template_content,
            'inputType': action.get('inputType', 'text'),
            'options': action.get('options', []),
            'default': action.get('default'),
            'placeholder': action.get('placeholder'),
            'displayMode': action.get('displayMode', 'inline'),
            'blocking': action.get('blocking', False),
            'required': action.get('required', False),
            'template_id': action.get('messageTemplateId')
        }

        # Add additional fields for combined_checkbox_textarea type
        if action.get('inputType') == 'combined_checkbox_textarea':
            response['checkboxLabel'] = action.get('checkboxLabel')
            response['textareaLabel'] = action.get('textareaLabel')
            response['textareaPlaceholder'] = action.get('textareaPlaceholder')

        return response