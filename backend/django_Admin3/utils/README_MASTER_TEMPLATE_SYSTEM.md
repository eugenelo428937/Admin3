# Master Template Email System

The Admin3 email system now uses a **master template approach** where all emails are derived from a common base template (`master_template.mjml`) with dynamic content injection. This provides consistency across all email types while allowing for flexible content customization.

## Architecture Overview

### Core Components

1. **`master_template.mjml`** - Base template with banner, footer, and styles
2. **Content Templates** - Specific content for each email type
3. **Dynamic Content Injection** - Programmatic insertion of content into master template
4. **Fallback System** - Graceful degradation to HTML templates if needed

## File Structure

```
utils/templates/emails/mjml/
├── master_template.mjml              # Base template with dynamic content injection
├── styles.mjml                       # Shared CSS includes
├── banner.mjml                       # Header component
├── footer.mjml                       # Footer component
├── order_confirmation_content.mjml   # Order confirmation specific content
├── password_reset_content.mjml       # Password reset specific content
└── account_activation_content.mjml   # Account activation specific content
```

## How It Works

### 1. Master Template Structure

```mjml
<mjml>
  <mj-head>
    <mj-title>{{ email_title|default:"Email from ActEd" }}</mj-title>
    <mj-preview>{{ email_preview|default:"Email from ActEd" }}</mj-preview>
    <mj-include path="./styles.mjml" />
  </mj-head>
  
  <mj-body background-color="#f3f3f3" width="600px">
    <mj-include path="./banner.mjml" />
    
    <!-- Dynamic Content Section -->
    {{ email_content|safe }}
    
    <mj-include path="./footer.mjml" />
  </mj-body>
</mjml>
```

### 2. Content Template Example

```mjml
<!-- order_confirmation_content.mjml -->
<mj-section background-color="#ffffff" css-class="content-section">
  <mj-column width="100%" padding="11px 22px">
    <mj-text padding-bottom="16px" align="left">
      Name: <b>{{ first_name }} {{ last_name }}</b><br />
      ActEd Student Number: <b>{{ student_number }}</b><br />
      Order Reference: <b>{{ order_number }}</b>
    </mj-text>
    <!-- Additional content specific to order confirmation -->
  </mj-column>
</mj-section>
```

## Email Types Supported

### 1. Order Confirmation
- **Content Template**: `order_confirmation_content.mjml`
- **Method**: `send_order_confirmation()`
- **Features**: Order details, product list, contact information

### 2. Password Reset
- **Content Template**: `password_reset_content.mjml`
- **Method**: `send_password_reset()`
- **Features**: Reset button, security warnings, expiry information

### 3. Account Activation
- **Content Template**: `account_activation_content.mjml`
- **Method**: `send_account_activation()`
- **Features**: Welcome message, activation button, feature overview

## Testing

### Send Test Emails

```bash
# Test order confirmation
python manage.py test_emails send --template order_confirmation --email test@example.com

# Test password reset  
python manage.py test_emails send --template password_reset --email test@example.com

# Test account activation
python manage.py test_emails send --template account_activation --email test@example.com
```

### Generate Previews

```bash
# Generate all preview formats
python manage.py test_emails preview --template order_confirmation --save

# Test specific format
python manage.py test_emails preview --template password_reset --format html
```

## Key Benefits

1. **Consistency** - All emails share the same banner, footer, and styling
2. **Maintainability** - Changes to banner/footer apply to all emails
3. **Flexibility** - Each email type can have completely different content
4. **Modularity** - Content templates can be reused and composed
5. **Fallback Support** - Graceful degradation to HTML templates
6. **Testing** - Comprehensive preview and testing system 