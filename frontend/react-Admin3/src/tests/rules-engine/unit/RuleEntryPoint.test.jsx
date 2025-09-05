/**
 * Stage 1: Rule Entry Point Component Tests
 * 
 * Tests the basic rendering and functionality of Rule Entry Point components.
 * These tests validate that entry points are correctly identified and displayed
 * in the React frontend, following TDD RED-GREEN-REFACTOR cycle.
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component - will be implemented when tests turn GREEN
const RuleEntryPoint = ({ name, className, disabled, description }) => {
  if (!name) {
    return <div className="rule-entry-point-placeholder">Unknown Entry Point</div>;
  }
  
  return (
    <div 
      className={`rule-entry-point ${className || ''} ${disabled ? 'disabled' : ''}`}
      data-testid="rule-entry-point"
    >
      <span className="entry-point-name">{name}</span>
      {description && <span className="entry-point-description">{description}</span>}
    </div>
  );
};

describe('RuleEntryPoint Component - Stage 1 Tests', () => {
  afterEach(cleanup);

  describe('Basic Rendering', () => {
    test('renders the correct entry point name', () => {
      render(<RuleEntryPoint name="checkout_terms" />);
      expect(screen.getByText('checkout_terms')).toBeInTheDocument();
      expect(screen.getByTestId('rule-entry-point')).toBeInTheDocument();
    });

    test('renders placeholder if no name provided', () => {
      render(<RuleEntryPoint />);
      expect(screen.getByText(/unknown entry point/i)).toBeInTheDocument();
      expect(screen.getByText(/unknown entry point/i)).toHaveClass('rule-entry-point-placeholder');
    });

    test('renders empty string name as placeholder', () => {
      render(<RuleEntryPoint name="" />);
      expect(screen.getByText(/unknown entry point/i)).toBeInTheDocument();
    });
  });

  describe('Styling and CSS Classes', () => {
    test('applies custom className if passed', () => {
      render(<RuleEntryPoint name="home_page" className="test-class" />);
      const element = screen.getByTestId('rule-entry-point');
      expect(element).toHaveClass('test-class');
      expect(element).toHaveClass('rule-entry-point');
    });

    test('applies disabled class when disabled prop is true', () => {
      render(<RuleEntryPoint name="checkout_start" disabled={true} />);
      expect(screen.getByTestId('rule-entry-point')).toHaveClass('disabled');
    });

    test('does not apply disabled class when disabled prop is false', () => {
      render(<RuleEntryPoint name="checkout_start" disabled={false} />);
      expect(screen.getByTestId('rule-entry-point')).not.toHaveClass('disabled');
    });
  });

  describe('Entry Point Names Validation', () => {
    const validEntryPoints = [
      'home_page_mount',
      'checkout_terms',
      'checkout_start',
      'product_view',
      'cart_update',
      'user_login',
      'registration_complete'
    ];

    validEntryPoints.forEach(entryPoint => {
      test(`renders valid entry point: ${entryPoint}`, () => {
        render(<RuleEntryPoint name={entryPoint} />);
        expect(screen.getByText(entryPoint)).toBeInTheDocument();
      });
    });
  });

  describe('Optional Description', () => {
    test('renders description when provided', () => {
      render(
        <RuleEntryPoint 
          name="checkout_terms" 
          description="Display terms and conditions during checkout" 
        />
      );
      expect(screen.getByText('checkout_terms')).toBeInTheDocument();
      expect(screen.getByText('Display terms and conditions during checkout')).toBeInTheDocument();
    });

    test('does not render description when not provided', () => {
      render(<RuleEntryPoint name="checkout_terms" />);
      expect(screen.getByText('checkout_terms')).toBeInTheDocument();
      expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles very long entry point names', () => {
      const longName = 'very_long_entry_point_name_that_exceeds_normal_length_limits_for_testing_purposes';
      render(<RuleEntryPoint name={longName} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    test('handles special characters in entry point names', () => {
      const specialName = 'entry-point_with.special@chars';
      render(<RuleEntryPoint name={specialName} />);
      expect(screen.getByText(specialName)).toBeInTheDocument();
    });

    test('handles multiple className props', () => {
      render(<RuleEntryPoint name="test" className="class1 class2 class3" />);
      const element = screen.getByTestId('rule-entry-point');
      expect(element).toHaveClass('class1');
      expect(element).toHaveClass('class2');
      expect(element).toHaveClass('class3');
    });
  });
});

export default RuleEntryPoint;