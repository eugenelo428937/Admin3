# Modular MJML Email Templates with Includes

## 🎯 **Overview**

This system demonstrates a professional, modular approach to email template development using MJML with includes for maximum reusability and maintainability.

## 📁 **Template Structure**

```
utils/templates/emails/mjml/
├── styles.mjml           # 🎨 Reusable CSS styles
├── banner.mjml           # 🏷️ Header/banner component  
├── footer.mjml           # 📄 Footer component
├── sample_email.mjml     # ✉️ Demo template using all includes
├── order_confirmation.mjml
├── password_reset.mjml
└── email_header.mjml     # Legacy header (for order_confirmation)
```

## ✨ **Key Features**

### **1. CSS Includes (`styles.mjml`)**
- **Centralized Styling**: All common styles in one reusable file
- **Typography**: Consistent headings, paragraphs, and text styles
- **Components**: Button, table, banner, footer, and utility classes
- **Outlook Compatibility**: MSO-specific styles and media queries
- **Responsive Design**: Mobile-first responsive styles

### **2. Banner Component (`banner.mjml`)**
- **Dynamic Content**: Customizable company name and tagline via Django variables
- **Optional Messaging**: Conditional banner messages
- **Brand Consistency**: Consistent header across all emails
- **Responsive**: Adapts to different screen sizes

### **3. Footer Component (`footer.mjml`)**
- **Comprehensive**: Company info, contact details, legal links
- **Social Media**: Optional social media links
- **Legal Compliance**: Unsubscribe links and privacy policy
- **Customizable**: All content configurable via Django template variables

## 🛠️ **Usage Examples**

### **Basic MJML Template with Includes**

```mjml
<mjml>
  <mj-head>
    <mj-title>{{ email_title }}</mj-title>
    <mj-preview>{{ email_preview }}</mj-preview>
    
    <!-- Include CSS Styles -->
    <mj-include path="./styles.mjml" />
  </mj-head>
  
  <mj-body background-color="#f3f3f3">
    <!-- Include Banner -->
    <mj-include path="./banner.mjml" />
    
    <!-- Your content here -->
    <mj-section background-color="#ffffff" css-class="content-section">
      <mj-column>
        <mj-text css-class="content-text">
          Hello {{ first_name }}!
        </mj-text>
      </mj-column>
    </mj-section>
    
    <!-- Include Footer -->
    <mj-include path="./footer.mjml" />
  </mj-body>
</mjml>
```

### **Django Template Context Variables**

```python
context = {
    # Email meta
    'email_title': 'Your Custom Email',
    'email_preview': 'Preview text for email clients',
    'first_name': 'John',
    
    # Banner customization
    'company_name': 'BPP',
    'company_tagline': 'ACTUARIAL EDUCATION',
    'banner_message': 'Special announcement text',
    
    # Footer customization
    'company_description': 'Leading provider of professional education',
    'support_email': 'support@bpp.com',
    'support_phone': '+44 (0) 20 7430 4000',
    'show_social_links': True,
    'facebook_url': 'https://facebook.com/bpp',
    'twitter_url': 'https://twitter.com/bpp',
    'linkedin_url': 'https://linkedin.com/company/bpp',
    
    # Content
    'main_message': 'Your email content here...',
    'cta_text': 'Call to Action',
    'cta_url': 'https://example.com/action',
}
```

## 🧪 **Testing Commands**

### **Preview Templates**
```bash
# Preview with includes
python manage.py test_emails preview --template sample_email --format html --save

# Test Outlook compatibility
python manage.py test_emails preview --template sample_email --format outlook --save

# Compare versions
python manage.py test_emails outlook-test --template sample_email
```

### **Send Test Emails**
```bash
# Send sample email
python manage.py test_emails send --template sample_email --email your@email.com

# All available templates
python manage.py test_emails send --template [order_confirmation|password_reset|account_activation|sample_email]
```

## 🎨 **Available CSS Classes**

### **Typography**
- `h1`, `h2`, `h3` - Styled headings with MSO compatibility
- `p` - Standard paragraph with proper spacing
- `.content-text` - Main content text styling

### **Components**
- `.btn-primary` - Primary button styling with hover effects
- `.banner` - Header banner styling
- `.footer` - Footer section styling
- `.data-table` - Responsive table styling

### **Layout**
- `.content-section` - Main content area padding
- `.text-center`, `.text-left`, `.text-right` - Text alignment
- `.mb-20`, `.mt-20` - Margin utilities

### **Tables**
- `.data-table` - Main table wrapper
- `.table-header` - Table header styling
- `.table-row` - Table row styling
- `.table-cell` - Table cell styling

## 🎯 **Benefits of This Approach**

### **1. Maintainability**
- **Single Source of Truth**: All styles in one place
- **Easy Updates**: Change once, apply everywhere
- **Consistent Branding**: Guaranteed visual consistency

### **2. Reusability**
- **Component-Based**: Mix and match components
- **Template Inheritance**: Build on existing patterns
- **Rapid Development**: Faster email creation

### **3. Professional Quality**
- **Cross-Client Compatibility**: Tested across email clients
- **Outlook Optimization**: Enhanced compatibility via Premailer
- **Responsive Design**: Works on desktop and mobile

### **4. Developer Experience**
- **Modular Structure**: Organized and logical file structure
- **Django Integration**: Full Django template variable support
- **Testing Tools**: Comprehensive preview and testing commands

## 🔧 **Technical Implementation**

### **Include Loader**
The system uses a custom include loader that:
- Resolves include paths relative to the MJML template directory
- Provides error handling for missing includes
- Logs include loading for debugging
- Supports nested includes

### **Processing Pipeline**
1. **Django Template Rendering**: Process Django variables in MJML
2. **MJML Include Resolution**: Load and inject included components
3. **MJML Compilation**: Convert to responsive HTML
4. **Premailer Enhancement**: Apply Outlook compatibility fixes
5. **Email Delivery**: Send as multi-part email (HTML + text)

### **Error Handling**
- **Graceful Fallback**: Falls back to HTML templates if MJML fails
- **Include Recovery**: Continues with placeholder if include missing
- **Comprehensive Logging**: Detailed error reporting for debugging

## 📧 **Example Output**

The `sample_email` template demonstrates:
- ✅ **Header with logo and tagline**
- ✅ **Professional content layout**
- ✅ **Data tables with responsive design**
- ✅ **Call-to-action buttons**
- ✅ **Comprehensive footer with all links**
- ✅ **Cross-client compatibility**
- ✅ **Mobile responsiveness**

## 🚀 **Getting Started**

1. **Use existing templates** as starting points
2. **Copy sample_email.mjml** for new templates
3. **Customize banner/footer** via Django context variables
4. **Add new CSS classes** to `styles.mjml` as needed
5. **Test thoroughly** using the provided commands

## 💡 **Best Practices**

1. **Always use includes** for shared components
2. **Test in multiple email clients** using preview commands
3. **Keep CSS in styles.mjml** for maintainability
4. **Use semantic class names** for better organization
5. **Provide fallback values** for all Django variables
6. **Include MSO-specific styles** for Outlook compatibility

This modular approach ensures professional, maintainable, and cross-compatible email templates that scale with your application's needs. 