# Email Setup Instructions for ActEd Admin3

## Overview
This guide explains how to set up and test the email functionality for order confirmations in the ActEd Admin3 system.

## What's Been Implemented

### 1. Django Email Configuration
- Added email settings to `backend/django_Admin3/django_Admin3/settings/base.py`
- Console backend for development (emails print to console)
- SMTP backend configuration for production

### 2. Email Service Module
- Created `backend/django_Admin3/core_auth/email_service.py`
- Contains methods for:
  - Order confirmation emails
  - Test emails

### 3. Order Confirmation Integration
- Modified `backend/django_Admin3/cart/views.py` checkout endpoint
- Automatically sends email when order is completed
- Currently sends to `eugenelo1030@gmail.com` for testing

### 4. Test Email Endpoint
- Added `/auth/test-email/` endpoint for testing
- Accessible to authenticated users only

### 5. Frontend Test Button
- Added test email button in CheckoutSteps.js
- Allows testing email functionality before placing orders

## How to Test

### Option 1: Console Output (Current Default)
Since `DEBUG=True`, emails are printed to the Django console:

1. Start the Django server: `python manage.py runserver localhost:8888`
2. Go to checkout page in the frontend
3. Click "Send Test Email" button
4. Check the Django console for email output

### Option 2: Real Email (Production Setup)
To send actual emails, you need to:

1. Create a `.env.development` file in `backend/django_Admin3/` with:
```
# Email Settings
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@acted.com
```

2. For Gmail, you need an "App Password":
   - Go to Google Account settings
   - Enable 2-factor authentication 
   - Generate an App Password for "Mail" 
   - Use that password in EMAIL_HOST_PASSWORD

3. Update `backend/django_Admin3/django_Admin3/settings/base.py`:
```python
# For production email sending, comment out this line:
# if DEBUG:
#     EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

## Testing the Order Confirmation Email

### Method 1: Use Test Button
1. Login to the frontend
2. Add items to cart
3. Go to checkout page
4. Click "Send Test Email" button in the first step
5. Check console output or your email

### Method 2: Complete an Order
1. Login to the frontend
2. Add items to cart
3. Complete the checkout process
4. Click "Complete Order" button
5. Email will be sent automatically

## Current Email Recipients

**For Testing**: All emails currently go to `eugenelo1030@gmail.com`

To change this:
1. Edit `backend/django_Admin3/core_auth/email_service.py`
2. Update the `test_email` variable in `send_order_confirmation` method
3. Replace with your email address

## Email Content

### Order Confirmation Email Includes:
- Order number
- Order date
- Customer name
- List of ordered items with:
  - Product name
  - Subject code
  - Session code
  - Quantity
  - Price
- Total amount

### Test Email Includes:
- System information
- Confirmation that email system is working

## Troubleshooting

### Emails Not Sending
1. Check Django console for error messages
2. Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in environment
3. For Gmail, ensure App Password is used (not regular password)
4. Check that 2-factor authentication is enabled for Gmail

### Console Email Not Showing
1. Ensure DEBUG=True in settings
2. Check that EMAIL_BACKEND is set to console backend
3. Look for email output in the Django runserver console

### Authentication Errors
1. Ensure user is logged in before testing
2. Check that JWT tokens are valid
3. Verify CORS settings if testing from frontend

## Next Steps

1. **Customize Email Template**: Create HTML templates for better-looking emails
2. **Email Attachments**: Add PDF receipts or invoices
3. **Email Queue**: Implement async email sending for better performance
4. **Multiple Recipients**: Send copies to admin/sales team
5. **Email Logging**: Track sent emails in database

## File Locations

- Email Service: `backend/django_Admin3/core_auth/email_service.py`
- Settings: `backend/django_Admin3/django_Admin3/settings/base.py`
- Checkout View: `backend/django_Admin3/cart/views.py`
- Test Endpoint: `backend/django_Admin3/core_auth/views.py`
- Frontend Test: `frontend/react-Admin3/src/components/CheckoutSteps.js`

## Security Notes

- Never commit email passwords to version control
- Use environment variables for sensitive data
- Consider using email services like SendGrid for production
- Implement rate limiting for email endpoints 