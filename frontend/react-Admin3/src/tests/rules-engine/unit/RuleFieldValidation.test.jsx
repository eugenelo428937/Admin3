/**
 * Stage 2: Rule Field Validation Component Tests
 * 
 * Tests the validation and display of rule fields including type checking,
 * required field validation, and proper error handling.
 * These tests follow TDD principles for rule field management.
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component - will be implemented when tests turn GREEN
const RuleField = ({ 
  label, 
  value, 
  type = 'string', 
  required = false, 
  className,
  description,
  validation
}) => {
  const errors = [];
  
  // Required field validation
  if (required && (value === undefined || value === null || value === '')) {
    errors.push('Missing required field');
  }
  
  // Type validation
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
      case 'string':
        if (typeof value !== 'string') {
          errors.push('Invalid type - expected string');
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push('Invalid type - expected array');
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push('Invalid type - expected object');
        }
        break;
    }
  }
  
  // Custom validation
  if (validation && typeof validation === 'function' && value !== undefined) {
    const customError = validation(value);
    if (customError) {
      errors.push(customError);
    }
  }
  
  return (
    <div 
      className={`rule-field ${className || ''} ${errors.length > 0 ? 'has-error' : ''}`}
      data-testid="rule-field"
    >
      <label className="rule-field-label">
        {label}
        {required && <span className="required-indicator"> *</span>}
      </label>
      
      {value !== undefined && value !== null && value !== '' && (
        <div className="rule-field-value" data-testid="rule-field-value">
          {type === 'boolean' ? value.toString() : 
           type === 'array' ? JSON.stringify(value) :
           type === 'object' ? JSON.stringify(value) :
           String(value)}
        </div>
      )}
      
      {description && (
        <div className="rule-field-description">{description}</div>
      )}
      
      {errors.length > 0 && (
        <div className="rule-field-errors" data-testid="rule-field-errors">
          {errors.map((error, index) => (
            <div key={index} className="error-message">{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

describe('RuleField Component - Stage 2 Tests', () => {
  afterEach(cleanup);

  describe('Basic Rendering', () => {
    test('renders field label and value', () => {
      render(<RuleField label="Cart Total" value={100} />);
      expect(screen.getByText('Cart Total')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('renders only label when no value provided', () => {
      render(<RuleField label="Cart Total" />);
      expect(screen.getByText('Cart Total')).toBeInTheDocument();
      expect(screen.queryByTestId('rule-field-value')).not.toBeInTheDocument();
    });

    test('renders description when provided', () => {
      render(
        <RuleField 
          label="Cart Total" 
          value={100} 
          description="Total amount in cart including taxes"
        />
      );
      expect(screen.getByText('Total amount in cart including taxes')).toBeInTheDocument();
    });
  });

  describe('Required Field Validation', () => {
    test('shows error if required field missing', () => {
      render(<RuleField label="Cart Total" required={true} />);
      expect(screen.getByText(/missing required field/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-field')).toHaveClass('has-error');
    });

    test('shows required indicator for required fields', () => {
      render(<RuleField label="Cart Total" required={true} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    test('does not show error for required field with valid value', () => {
      render(<RuleField label="Cart Total" value={100} required={true} />);
      expect(screen.queryByText(/missing required field/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('rule-field')).not.toHaveClass('has-error');
    });

    test('shows error for required field with empty string', () => {
      render(<RuleField label="Cart Total" value="" required={true} />);
      expect(screen.getByText(/missing required field/i)).toBeInTheDocument();
    });

    test('shows error for required field with null value', () => {
      render(<RuleField label="Cart Total" value={null} required={true} />);
      expect(screen.getByText(/missing required field/i)).toBeInTheDocument();
    });
  });

  describe('Type Validation', () => {
    test('validates number type correctly', () => {
      render(<RuleField label="Cart Total" value="abc" type="number" />);
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
    });

    test('accepts valid number', () => {
      render(<RuleField label="Cart Total" value={100} type="number" />);
      expect(screen.queryByText(/invalid type/i)).not.toBeInTheDocument();
    });

    test('accepts string number for number type', () => {
      render(<RuleField label="Cart Total" value="100" type="number" />);
      expect(screen.queryByText(/invalid type/i)).not.toBeInTheDocument();
    });

    test('validates boolean type correctly', () => {
      render(<RuleField label="Is Logged In" value="true" type="boolean" />);
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
    });

    test('accepts valid boolean', () => {
      render(<RuleField label="Is Logged In" value={true} type="boolean" />);
      expect(screen.queryByText(/invalid type/i)).not.toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    test('validates string type correctly', () => {
      render(<RuleField label="User Name" value={123} type="string" />);
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
    });

    test('accepts valid string', () => {
      render(<RuleField label="User Name" value="John Doe" type="string" />);
      expect(screen.queryByText(/invalid type/i)).not.toBeInTheDocument();
    });

    test('validates array type correctly', () => {
      render(<RuleField label="Items" value="not an array" type="array" />);
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
    });

    test('accepts valid array', () => {
      render(<RuleField label="Items" value={[1, 2, 3]} type="array" />);
      expect(screen.queryByText(/invalid type/i)).not.toBeInTheDocument();
      expect(screen.getByText('[1,2,3]')).toBeInTheDocument();
    });

    test('validates object type correctly', () => {
      render(<RuleField label="User" value="not an object" type="object" />);
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
    });

    test('rejects array for object type', () => {
      render(<RuleField label="User" value={[1, 2, 3]} type="object" />);
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
    });

    test('accepts valid object', () => {
      render(<RuleField label="User" value={{id: 1, name: 'John'}} type="object" />);
      expect(screen.queryByText(/invalid type/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Validation', () => {
    test('runs custom validation function', () => {
      const customValidation = (value) => {
        return value < 50 ? 'Value must be at least 50' : null;
      };
      
      render(
        <RuleField 
          label="Cart Total" 
          value={25} 
          type="number" 
          validation={customValidation}
        />
      );
      
      expect(screen.getByText('Value must be at least 50')).toBeInTheDocument();
    });

    test('passes custom validation with valid value', () => {
      const customValidation = (value) => {
        return value < 50 ? 'Value must be at least 50' : null;
      };
      
      render(
        <RuleField 
          label="Cart Total" 
          value={75} 
          type="number" 
          validation={customValidation}
        />
      );
      
      expect(screen.queryByText('Value must be at least 50')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Errors', () => {
    test('shows multiple validation errors', () => {
      const customValidation = () => 'Custom error message';
      
      render(
        <RuleField 
          label="Cart Total" 
          value="abc" 
          type="number" 
          required={true}
          validation={customValidation}
        />
      );
      
      expect(screen.getByText(/invalid type/i)).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles zero value correctly', () => {
      render(<RuleField label="Cart Total" value={0} type="number" required={true} />);
      expect(screen.queryByText(/missing required field/i)).not.toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('handles false boolean correctly', () => {
      render(<RuleField label="Is Active" value={false} type="boolean" required={true} />);
      expect(screen.queryByText(/missing required field/i)).not.toBeInTheDocument();
      expect(screen.getByText('false')).toBeInTheDocument();
    });

    test('handles empty array correctly', () => {
      render(<RuleField label="Items" value={[]} type="array" required={true} />);
      expect(screen.queryByText(/missing required field/i)).not.toBeInTheDocument();
      expect(screen.getByText('[]')).toBeInTheDocument();
    });

    test('handles empty object correctly', () => {
      render(<RuleField label="User" value={{}} type="object" required={true} />);
      expect(screen.queryByText(/missing required field/i)).not.toBeInTheDocument();
      expect(screen.getByText('{}')).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    test('applies custom className', () => {
      render(<RuleField label="Test" className="custom-class" />);
      expect(screen.getByTestId('rule-field')).toHaveClass('custom-class');
    });

    test('applies error class when validation fails', () => {
      render(<RuleField label="Test" required={true} />);
      expect(screen.getByTestId('rule-field')).toHaveClass('has-error');
    });

    test('does not apply error class when validation passes', () => {
      render(<RuleField label="Test" value="valid" />);
      expect(screen.getByTestId('rule-field')).not.toHaveClass('has-error');
    });
  });
});

export default RuleField;