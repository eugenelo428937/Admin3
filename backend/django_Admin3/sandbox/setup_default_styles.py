#!/usr/bin/env python
"""
Setup default styles for the JSON content system
"""
import os
import sys
import django

# Add the project directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

from rules_engine.models import ContentStyleTheme, ContentStyle, MessageTemplate, MessageTemplateStyle

def create_default_themes():
    """Create default style themes"""
    themes_data = [
        {
            'name': 'Default Theme',
            'description': 'Standard styling for all content types'
        },
        {
            'name': 'Warning Theme',
            'description': 'Orange/yellow theme for warnings and alerts'
        },
        {
            'name': 'Holiday Theme',
            'description': 'Special styling for holiday notices'
        },
        {
            'name': 'Terms Theme',
            'description': 'Professional styling for Terms & Conditions'
        }
    ]
    
    created_themes = {}
    for theme_data in themes_data:
        theme, created = ContentStyleTheme.objects.get_or_create(
            name=theme_data['name'],
            defaults={'description': theme_data['description']}
        )
        created_themes[theme.name] = theme
        print(f"{'Created' if created else 'Found existing'} theme: {theme.name}")
    
    return created_themes

def create_default_styles(themes):
    """Create default content styles"""
    default_theme = themes['Default Theme']
    warning_theme = themes['Warning Theme']
    holiday_theme = themes['Holiday Theme']
    terms_theme = themes['Terms Theme']
    
    styles_data = [
        # Warning styles
        {
            'name': 'Warning Alert Box',
            'element_type': 'box',
            'category': 'warning',
            'css_class_selector': 'alert alert-warning',
            'theme': warning_theme,
            'background_color': '#fff3cd',
            'text_color': '#856404',
            'border_color': '#ffeaa7',
            'border_width': '1px',
            'border_radius': '6px',
            'padding': '16px 20px',
            'margin': '0 0 20px 0',
            'custom_styles': {
                'boxShadow': '0 2px 8px rgba(255, 193, 7, 0.15)',
                'borderStyle': 'solid'
            }
        },
        {
            'name': 'Holiday Alert Box',
            'element_type': 'box',
            'category': 'holiday',
            'css_class_selector': 'holiday-alert',
            'theme': holiday_theme,
            'background_color': '#f8f9fa',
            'text_color': '#495057',
            'border_color': '#dee2e6',
            'border_width': '2px',
            'border_radius': '8px',
            'padding': '20px',
            'margin': '0 0 24px 0',
            'custom_styles': {
                'borderStyle': 'dashed',
                'boxShadow': '0 4px 12px rgba(0, 0, 0, 0.1)'
            }
        },
        {
            'name': 'Holiday Tips Section',
            'element_type': 'box',
            'category': 'holiday',
            'css_class_selector': 'holiday-tips',
            'theme': holiday_theme,
            'background_color': '#e9ecef',
            'text_color': '#495057',
            'border_color': '#adb5bd',
            'border_width': '1px',
            'border_radius': '4px',
            'padding': '16px',
            'margin': '16px 0',
        },
        {
            'name': 'Terms & Conditions Container',
            'element_type': 'container',
            'category': 'terms',
            'css_class_selector': 'terms-conditions-content',
            'theme': terms_theme,
            'padding': '0',
            'margin': '0',
        },
        {
            'name': 'Default Paragraph',
            'element_type': 'p',
            'category': 'general',
            'theme': default_theme,
            'margin': '0 0 16px 0',
            'font_size': '14px',
            'custom_styles': {
                'lineHeight': '1.6'
            },
        },
        {
            'name': 'Default Heading 4',
            'element_type': 'h4',
            'category': 'general',
            'theme': default_theme,
            'margin': '0 0 16px 0',
            'font_weight': '600',
            'font_size': '18px',
        },
        {
            'name': 'Default Heading 5',
            'element_type': 'h5',
            'category': 'general',
            'theme': default_theme,
            'margin': '0 0 12px 0',
            'font_weight': '600',
            'font_size': '16px',
        },
        {
            'name': 'Default List',
            'element_type': 'ul',
            'category': 'general',
            'theme': default_theme,
            'margin': '0 0 16px 0',
            'padding': '0',
        }
    ]
    
    for style_data in styles_data:
        style, created = ContentStyle.objects.get_or_create(
            name=style_data['name'],
            defaults=style_data
        )
        print(f"{'Created' if created else 'Found existing'} style: {style.name}")

def assign_template_styles():
    """Assign themes to existing message templates"""
    template_assignments = [
        ('general_terms_conditions', 'Terms Theme'),
        ('summer_holiday_2025', 'Holiday Theme'),
        ('holiday_delivery_warning', 'Warning Theme'),
    ]
    
    for template_name, theme_name in template_assignments:
        try:
            template = MessageTemplate.objects.get(name=template_name)
            theme = ContentStyleTheme.objects.get(name=theme_name)
            
            template_style, created = MessageTemplateStyle.objects.get_or_create(
                message_template=template,
                defaults={'theme': theme}
            )
            
            if created:
                print(f"Assigned {theme_name} to template: {template_name}")
            else:
                print(f"Template {template_name} already has styling configured")
                
        except MessageTemplate.DoesNotExist:
            print(f"Template {template_name} not found")
        except ContentStyleTheme.DoesNotExist:
            print(f"Theme {theme_name} not found")

def main():
    """Main setup function"""
    print("Setting up default styles for JSON content system...")
    print("=" * 60)
    
    # Create themes
    themes = create_default_themes()
    print()
    
    # Create styles
    create_default_styles(themes)
    print()
    
    # Assign templates to themes
    assign_template_styles()
    print()
    
    print("=" * 60)
    print("[SUCCESS] Default styles setup completed!")
    print("[INFO] You can now customize these styles through Django admin")
    print("[INFO] Staff can modify colors, spacing, and styling through the admin interface")
    print("[INFO] Templates will automatically use the assigned themes")

if __name__ == '__main__':
    main()