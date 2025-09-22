# Epic 2: Order Details and Address Management

**Epic Goal**: Implement comprehensive order details management functionality including invoice/delivery address selection, contact information collection, and seamless profile integration during the checkout process.

**Integration Requirements**: All stories must integrate seamlessly with existing checkout flow, user profile management, and address components while maintaining existing functionality.

### Story 2.1: Enhanced Cart Review with Address Management Layout

As a customer during checkout,
I want to see my order summary alongside my delivery and invoice address options,
so that I can review and confirm all order details in a single, organized view.

**Acceptance Criteria**:
1. Cart review step displays checkout summary in left 1/3 of card body
2. Right 2/3 of card body split into two equal sections for delivery and invoice addresses
3. Layout remains responsive across desktop, tablet, and mobile devices
4. Address sections clearly labeled and visually distinct
5. Checkout summary includes all cart items, prices, and totals

**Integration Verification**:
- IV1: Existing cart functionality and calculations remain unchanged
- IV2: Current checkout flow progression maintains existing behavior
- IV3: Mobile responsiveness preserved for all screen sizes

**Implementation Details**:
- **Layout**: CSS Grid/Flexbox for responsive 1/3 + 2/3 split
- **Components**: Enhanced `CartReview` component with address panels
- **Styling**: Material-UI responsive grid system
- **Location**: `frontend/react-Admin3/src/components/Checkout/CartReview.js`

### Story 2.2: Dynamic Address Selection with Profile Integration

As a registered user,
I want to select delivery and invoice addresses from my profile settings,
so that I can quickly choose appropriate addresses without re-entering information.

**Acceptance Criteria**:
1. Delivery address panel displays dropdown with "Home" and "Work" options
2. Invoice address panel displays dropdown with "Home" and "Work" options
3. Address selection respects `acted_user_profile.send_study_material_to` setting
4. Invoice selection respects `acted_user_profile.send_invoices_to` setting
5. Address fields auto-populate when dropdown selection changes
6. Address display uses existing `DynamicAddressForm` component for consistent formatting
7. Address fields are initially read-only (non-editable)

**Integration Verification**:
- IV1: Existing user profile data structure remains intact
- IV2: Current address storage in `acted_user_profile_address` preserved
- IV3: Profile settings API endpoints continue to function unchanged

**Implementation Details**:
- **Models**:
  - `acted_user_profile.send_invoices_to` (choice: home/work)
  - `acted_user_profile.send_study_material_to` (choice: home/work)
  - `acted_user_profile_address` (existing address storage)
- **Components**:
  - `AddressSelectionPanel` with dropdown integration
  - Integration with `DynamicAddressForm` for display
- **API**:
  - `GET /api/users/profile/addresses/` - retrieve user addresses
  - Profile preference endpoints for address selection

### Story 2.3: Modal Address Editor with Smart Input Integration

As a user reviewing my checkout details,
I want to edit my delivery or invoice addresses through an intuitive modal interface,
so that I can update incorrect information or add new addresses during checkout.

**Acceptance Criteria**:
1. "Edit" button below each address panel opens modal dialog
2. Modal displays `SmartAddressInput` component for country/postcode selection
3. After country/postcode selection, modal shows `DynamicAddressForm`
4. "Enter address manually" option pre-fills form with current address data
5. Modal footer contains "Cancel" (left) and "Update Address" (right) buttons
6. Update Address button triggers profile update confirmation prompt
7. Profile update affects corresponding `acted_user_profile.send_xxx_to` setting
8. Address changes update `acted_user_profile_address` records
9. Modal closes and refreshes address display after successful update

**Integration Verification**:
- IV1: Existing `SmartAddressInput` and `DynamicAddressForm` components work unchanged
- IV2: Current address validation and formatting logic preserved
- IV3: Profile update mechanisms maintain existing functionality

**Implementation Details**:
- **Components**:
  - `AddressEditModal` with `SmartAddressInput` integration
  - State management for modal visibility and address editing
  - Integration with existing address validation services
- **Modal Workflow**:
  1. Open modal → Show `SmartAddressInput`
  2. Country selection → Show `DynamicAddressForm`
  3. Form completion → Confirmation prompt
  4. Update → Profile sync → Close modal
- **API Integration**:
  - `PUT /api/users/profile/addresses/{id}/` - update address
  - `PATCH /api/users/profile/` - update address preferences

### Story 2.4: Communication Details Panel with Profile Synchronization

As a customer completing my order,
I want to provide and edit my contact information during checkout,
so that I can ensure accurate communication and delivery coordination.

**Acceptance Criteria**:
1. Communication Details panel displays below address sections
2. Panel includes fields: Home Phone, Mobile Phone, Work Phone, Email Address
3. Mobile Phone and Email Address are mandatory fields
4. Phone number validation follows international formatting standards
5. Email validation ensures valid email format
6. Edit functionality triggers profile update confirmation prompt
7. Profile updates sync with user's main profile data
8. Clear visual indicators for required vs optional fields
9. Real-time validation with helpful error messages

**Integration Verification**:
- IV1: Existing user profile contact fields remain unchanged
- IV2: Current email/phone validation logic preserved
- IV3: Profile update mechanisms maintain consistency

**Implementation Details**:
- **Components**:
  - `CommunicationDetailsPanel` with form validation
  - Phone number formatting with international support
  - Email validation with real-time feedback
- **Validation**:
  - Phone: International format validation
  - Email: RFC 5322 compliant validation
  - Required field highlighting and error states
- **Profile Fields**:
  - `user_profile.home_phone`
  - `user_profile.mobile_phone` (required)
  - `user_profile.work_phone`
  - `user.email` (required)

### Story 2.5: Checkout Validation and Progression Controls

As a customer proceeding through checkout,
I want clear validation of required address and contact information,
so that I can complete my order without encountering errors.

**Acceptance Criteria**:
1. Delivery address dropdown must have valid selection to proceed
2. Invoice address dropdown must have valid selection to proceed
3. Both address fields must contain complete, valid address data
4. Mobile Phone field must contain valid phone number
5. Email Address field must contain valid email address
6. Delivery and Invoice addresses can be identical (same values allowed)
7. "Continue to Payment" button disabled until all requirements met
8. Clear error messaging for incomplete or invalid fields
9. Visual indicators (colors, icons) show completion status
10. Progress persists if user navigates back and forward in checkout

**Integration Verification**:
- IV1: Existing checkout progression logic remains intact
- IV2: Current validation patterns and error handling preserved
- IV3: Payment step integration maintains existing functionality

**Implementation Details**:
- **Validation Logic**:
  - Address completeness validation using existing address service
  - Phone/email format validation with error messaging
  - Real-time validation feedback with visual indicators
- **State Management**:
  - Checkout context tracks validation status
  - Progress persistence across navigation
  - Integration with existing checkout stepper
- **UI/UX**:
  - Disabled state styling for "Continue" button
  - Clear error messaging with specific field guidance
  - Success indicators for completed sections

---

## 📊 **Implementation Status Summary**

**Created**: 2025-09-22
**Status**: ✅ PLANNING COMPLETE - READY FOR DEVELOPMENT

### **📋 DEVELOPMENT PRIORITIES**

1. **Story 2.1**: Enhanced Cart Review Layout - **Foundation**
2. **Story 2.2**: Address Selection Integration - **Core Functionality**
3. **Story 2.3**: Modal Address Editor - **User Experience**
4. **Story 2.4**: Communication Details Panel - **Contact Management**
5. **Story 2.5**: Validation and Progression - **Quality Assurance**

### **🔗 COMPONENT DEPENDENCIES**

| **Component** | **Dependencies** | **Integration Points** |
|---------------|------------------|----------------------|
| `CartReview` (Enhanced) | Existing cart logic | Layout restructuring only |
| `AddressSelectionPanel` | `DynamicAddressForm`, Profile API | Read-only address display |
| `AddressEditModal` | `SmartAddressInput`, `DynamicAddressForm` | Modal workflow integration |
| `CommunicationDetailsPanel` | Validation services | Profile synchronization |
| Checkout Validation | All above components | Progression control logic |

### **🗄️ DATABASE SCHEMA REQUIREMENTS**

**Existing Tables** (No modifications required):
- `acted_user_profile` - Address preference fields exist
- `acted_user_profile_address` - Address storage exists
- `auth_user` - Email field exists

**New Table Required**:
- `acted_order_user_preferences` - Store order-specific address and contact details

**acted_order_user_preferences Schema**:
```sql
CREATE TABLE acted_order_user_preferences (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,

    -- Delivery Address
    delivery_address_type VARCHAR(10) CHECK (delivery_address_type IN ('home', 'work')),
    delivery_address_line1 VARCHAR(255),
    delivery_address_line2 VARCHAR(255),
    delivery_city VARCHAR(100),
    delivery_state VARCHAR(100),
    delivery_postal_code VARCHAR(20),
    delivery_country VARCHAR(100),

    -- Invoice Address
    invoice_address_type VARCHAR(10) CHECK (invoice_address_type IN ('home', 'work')),
    invoice_address_line1 VARCHAR(255),
    invoice_address_line2 VARCHAR(255),
    invoice_city VARCHAR(100),
    invoice_state VARCHAR(100),
    invoice_postal_code VARCHAR(20),
    invoice_country VARCHAR(100),

    -- Contact Information
    home_phone VARCHAR(20),
    mobile_phone VARCHAR(20) NOT NULL,
    work_phone VARCHAR(20),
    email_address VARCHAR(254) NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_order_user_preferences_order_id ON acted_order_user_preferences(order_id);
```

### **📱 RESPONSIVE DESIGN CONSIDERATIONS**

| **Breakpoint** | **Layout Behavior** |
|----------------|-------------------|
| **Desktop (>1200px)** | 1/3 summary + 2/3 addresses (side-by-side) |
| **Tablet (768-1200px)** | Stacked layout: summary → addresses |
| **Mobile (<768px)** | Full-width stacked: summary → delivery → invoice |

### **🔒 SECURITY & VALIDATION**

- **Address Data**: Server-side validation using existing address service
- **Phone Numbers**: International format validation with sanitization
- **Email Addresses**: RFC 5322 compliance checking
- **Profile Updates**: Authorization checks for profile modification
- **Data Persistence**: Transaction-safe updates with rollback capability

---

**Document Version**: 1.0
**Created**: 2025-09-22
**Owner**: John (Product Manager)
**Next Review**: 2025-10-06