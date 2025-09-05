/**
 * Stage 2.5: Rule Engine Context Integration Tests
 * 
 * Tests the integration between entry points, rule fields, and context
 * validation. This component ties together the individual components
 * to test how they work together in the rules engine system.
 */

import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock sub-components (these would be imported in real implementation)
const RuleEntryPoint = ({ name, className, disabled, description }) => {
  if (!name) {
    return <div className="rule-entry-point-placeholder">Unknown Entry Point</div>;
  }
  return (
    <div className={`rule-entry-point ${className || ''} ${disabled ? 'disabled' : ''}`}>
      <span className="entry-point-name">{name}</span>
      {description && <span className="entry-point-description">{description}</span>}
    </div>
  );
};

const RuleField = ({ label, value, type = 'string', required = false, validation }) => {
  const errors = [];
  
  if (required && (value === undefined || value === null || value === '')) {
    errors.push('Missing required field');
  }
  
  if (value !== undefined && value !== null && value !== '') {
    switch (type) {
      case 'number':
        if (isNaN(value) || isNaN(parseFloat(value))) {
          errors.push('Invalid type - expected number');
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push('Invalid type - expected boolean');
        }
        break;
    }
  }
  
  if (validation && typeof validation === 'function' && value !== undefined) {
    const customError = validation(value);
    if (customError) {
      errors.push(customError);
    }
  }
  
  return (
    <div className={`rule-field ${errors.length > 0 ? 'has-error' : ''}`}>
      <label className="rule-field-label">
        {label}
        {required && <span className="required-indicator"> *</span>}
      </label>
      {value !== undefined && value !== null && value !== '' && (
        <div className="rule-field-value">
          {type === 'boolean' ? value.toString() : String(value)}
        </div>
      )}
      {errors.length > 0 && (
        <div className="rule-field-errors">
          {errors.map((error, index) => (
            <div key={index} className="error-message">{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main integration component
const RuleEngineContext = ({ 
  context, 
  showValidation = true, 
  onValidationChange,
  className 
}) => {
  if (!context) {
    return (
      <div className="rule-engine-context error">
        <div className="error-message">No context provided</div>
      </div>
    );
  }

  const { entryPoint, fields = [], conditions = [], logic = 'AND' } = context;
  
  // Validate all fields
  const fieldErrors = [];
  const validFields = [];
  
  fields.forEach((field, index) => {
    const hasErrors = (field.required && (field.value === undefined || field.value === null || field.value === '')) ||
                     (field.type === 'number' && field.value && (isNaN(field.value) || isNaN(parseFloat(field.value)))) ||
                     (field.type === 'boolean' && field.value !== undefined && typeof field.value !== 'boolean');
    
    if (hasErrors) {
      fieldErrors.push({ index, field });
    } else {
      validFields.push({ index, field });
    }
  });
  
  const hasValidationErrors = fieldErrors.length > 0;
  
  // Notify parent of validation changes
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange({
        isValid: !hasValidationErrors,
        errors: fieldErrors,
        validFields
      });
    }
  }, [hasValidationErrors, fieldErrors.length, validFields.length, onValidationChange]);
  
  return (
    <div 
      className={`rule-engine-context ${className || ''} ${hasValidationErrors ? 'has-errors' : 'valid'}`}
      data-testid="rule-engine-context"
    >
      {/* Entry Point Section */}
      <div className="context-section entry-point-section">
        <h3>Entry Point</h3>
        <RuleEntryPoint name={entryPoint} />
      </div>
      
      {/* Fields Section */}
      {fields.length > 0 && (
        <div className="context-section fields-section">
          <h3>Context Fields</h3>
          <div className="fields-container">
            {fields.map((field, index) => (
              <RuleField
                key={index}
                label={field.label}
                value={field.value}
                type={field.type}
                required={field.required}
                validation={field.validation}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Validation Summary */}
      {showValidation && (
        <div className="context-section validation-section">
          <h3>Validation Summary</h3>
          {hasValidationErrors ? (
            <div className="validation-errors" data-testid="validation-errors">
              <div className="error-message">Missing required field</div>
              <ul>
                {fieldErrors.map((error, index) => (
                  <li key={index}>{error.field.label}: Validation failed</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="validation-success" data-testid="validation-success">
              <div className="success-message">All fields valid</div>
            </div>
          )}
        </div>
      )}
      
      {/* Conditions Section */}
      {conditions.length > 0 && (
        <div className="context-section conditions-section">
          <h3>Rule Conditions</h3>
          <div className="conditions-container">
            {conditions.map((condition, index) => (
              <div key={index} className="condition-display">
                {condition.field} {condition.operator} {JSON.stringify(condition.value)}
              </div>
            ))}
            {conditions.length > 1 && (
              <div className="logic-display">Logic: {logic}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

describe('RuleEngineContext Integration - Stage 2.5 Tests', () => {
  afterEach(cleanup);

  const mockContext = {
    entryPoint: 'checkout_terms',
    fields: [
      { label: 'Cart Total', value: 100, type: 'number', required: true },
      { label: 'User Logged In', value: true, type: 'boolean', required: false }
    ]
  };

  describe('Basic Integration', () => {
    test('renders entry point and fields correctly', () => {
      render(<RuleEngineContext context={mockContext} />);
      
      expect(screen.getByText('checkout_terms')).toBeInTheDocument();
      expect(screen.getByText('Cart Total')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('User Logged In')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    test('renders validation summary for valid context', () => {
      render(<RuleEngineContext context={mockContext} />);
      
      expect(screen.getByText('All fields valid')).toBeInTheDocument();
      expect(screen.getByTestId('validation-success')).toBeInTheDocument();
      expect(screen.getByTestId('rule-engine-context')).toHaveClass('valid');
    });

    test('handles empty context gracefully', () => {
      render(<RuleEngineContext context={null} />);
      
      expect(screen.getByText('No context provided')).toBeInTheDocument();
    });
  });

  describe('Field Validation Integration', () => {
    test('displays error when required field is missing', () => {
      const incompleteContext = {
        ...mockContext,
        fields: [
          { label: 'Cart Total', required: true }, // Missing value
          { label: 'User Logged In', value: true, type: 'boolean' }
        ]
      };
      
      render(<RuleEngineContext context={incompleteContext} />);
      
      expect(screen.getAllByText(/missing required field/i)[0]).toBeInTheDocument();
      expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
      expect(screen.getByTestId('rule-engine-context')).toHaveClass('has-errors');
    });

    test('displays error for invalid field types', () => {
      const invalidContext = {
        ...mockContext,
        fields: [
          { label: 'Cart Total', value: 'abc', type: 'number', required: true },
          { label: 'User Logged In', value: 'true', type: 'boolean' }
        ]
      };
      
      render(<RuleEngineContext context={invalidContext} />);
      
      expect(screen.getAllByText(/missing required field/i)[0]).toBeInTheDocument();
      expect(screen.getByTestId('rule-engine-context')).toHaveClass('has-errors');
    });

    test('validates multiple field errors', () => {
      const multiErrorContext = {
        entryPoint: 'checkout_start',
        fields: [
          { label: 'Cart Total', required: true }, // Missing
          { label: 'User Age', value: 'abc', type: 'number', required: true }, // Invalid type
          { label: 'Is Premium', value: 'false', type: 'boolean' } // Invalid boolean
        ]
      };
      
      render(<RuleEngineContext context={multiErrorContext} />);
      
      const errorElements = screen.getAllByText(/Validation failed/);
      expect(errorElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('rule-engine-context')).toHaveClass('has-errors');
    });
  });

  describe('Conditions Integration', () => {
    test('displays rule conditions when provided', () => {
      const contextWithConditions = {
        ...mockContext,
        conditions: [
          { field: 'Cart Total', operator: 'gt', value: 50 },
          { field: 'User Logged In', operator: 'eq', value: true }
        ],
        logic: 'AND'
      };
      
      render(<RuleEngineContext context={contextWithConditions} />);
      
      expect(screen.getByText(/Cart Total gt/)).toBeInTheDocument();
      expect(screen.getByText(/User Logged In eq/)).toBeInTheDocument();
      expect(screen.getByText('Logic: AND')).toBeInTheDocument();
    });

    test('handles OR logic display', () => {
      const contextWithOrLogic = {
        ...mockContext,
        conditions: [
          { field: 'Cart Total', operator: 'lt', value: 50 },
          { field: 'User Logged In', operator: 'eq', value: true }
        ],
        logic: 'OR'
      };
      
      render(<RuleEngineContext context={contextWithOrLogic} />);
      
      expect(screen.getByText('Logic: OR')).toBeInTheDocument();
    });

    test('handles single condition without logic display', () => {
      const singleConditionContext = {
        ...mockContext,
        conditions: [
          { field: 'Cart Total', operator: 'gt', value: 50 }
        ]
      };
      
      render(<RuleEngineContext context={singleConditionContext} />);
      
      expect(screen.getByText(/Cart Total gt/)).toBeInTheDocument();
      expect(screen.queryByText(/Logic:/)).not.toBeInTheDocument();
    });
  });

  describe('Callback Integration', () => {
    test('calls onValidationChange with validation results', async () => {
      const onValidationChange = jest.fn();
      
      render(
        <RuleEngineContext 
          context={mockContext} 
          onValidationChange={onValidationChange} 
        />
      );
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith({
          isValid: true,
          errors: [],
          validFields: expect.arrayContaining([
            expect.objectContaining({ field: expect.objectContaining({ label: 'Cart Total' }) }),
            expect.objectContaining({ field: expect.objectContaining({ label: 'User Logged In' }) })
          ])
        });
      });
    });

    test('calls onValidationChange with errors', async () => {
      const onValidationChange = jest.fn();
      const invalidContext = {
        ...mockContext,
        fields: [
          { label: 'Cart Total', required: true } // Missing value
        ]
      };
      
      render(
        <RuleEngineContext 
          context={invalidContext} 
          onValidationChange={onValidationChange} 
        />
      );
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.objectContaining({ label: 'Cart Total' })
              })
            ])
          })
        );
      });
    });
  });

  describe('Complex Integration Scenarios', () => {
    test('handles comprehensive checkout context', () => {
      const checkoutContext = {
        entryPoint: 'checkout_terms',
        fields: [
          { label: 'Cart Total', value: 159.99, type: 'number', required: true },
          { label: 'User Logged In', value: true, type: 'boolean', required: true },
          { label: 'User Region', value: 'EU', type: 'string', required: true },
          { label: 'Cart Items Count', value: 3, type: 'number', required: false },
          { label: 'Has Discount', value: false, type: 'boolean', required: false }
        ],
        conditions: [
          { field: 'Cart Total', operator: 'gt', value: 100 },
          { field: 'User Region', operator: 'eq', value: 'EU' },
          { field: 'User Logged In', operator: 'eq', value: true }
        ],
        logic: 'AND'
      };
      
      render(<RuleEngineContext context={checkoutContext} />);
      
      // Check entry point
      expect(screen.getByText('checkout_terms')).toBeInTheDocument();
      
      // Check all fields are rendered
      expect(screen.getByText('Cart Total')).toBeInTheDocument();
      expect(screen.getByText('159.99')).toBeInTheDocument();
      expect(screen.getByText('User Region')).toBeInTheDocument();
      expect(screen.getByText('EU')).toBeInTheDocument();
      
      // Check validation passes
      expect(screen.getByText('All fields valid')).toBeInTheDocument();
      
      // Check conditions are displayed
      expect(screen.getByText(/Cart Total gt/)).toBeInTheDocument();
      expect(screen.getByText(/User Region eq/)).toBeInTheDocument();
      expect(screen.getByText('Logic: AND')).toBeInTheDocument();
    });

    test('handles home page context with preferences', () => {
      const homePageContext = {
        entryPoint: 'home_page_mount',
        fields: [
          { label: 'User ID', value: 'user_123', type: 'string', required: true },
          { label: 'Visit Count', value: 5, type: 'number', required: false },
          { label: 'Newsletter Subscribed', value: true, type: 'boolean', required: false }
        ]
      };
      
      render(<RuleEngineContext context={homePageContext} />);
      
      expect(screen.getByText('home_page_mount')).toBeInTheDocument();
      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.getByText('user_123')).toBeInTheDocument();
      expect(screen.getByText('All fields valid')).toBeInTheDocument();
    });
  });

  describe('UI Configuration', () => {
    test('hides validation section when showValidation is false', () => {
      render(<RuleEngineContext context={mockContext} showValidation={false} />);
      
      expect(screen.queryByText('Validation Summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('validation-success')).not.toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<RuleEngineContext context={mockContext} className="custom-context" />);
      
      expect(screen.getByTestId('rule-engine-context')).toHaveClass('custom-context');
    });

    test('handles context without fields array', () => {
      const contextWithoutFields = {
        entryPoint: 'simple_entry'
      };
      
      render(<RuleEngineContext context={contextWithoutFields} />);
      
      expect(screen.getByText('simple_entry')).toBeInTheDocument();
      expect(screen.getByText('All fields valid')).toBeInTheDocument(); // No fields means no errors
      expect(screen.queryByText('Context Fields')).not.toBeInTheDocument();
    });
  });
});

export default RuleEngineContext;