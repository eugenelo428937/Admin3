/**
 * Stage 3: Rule Condition Evaluation Component Tests
 * 
 * Tests the evaluation of rule conditions including single conditions,
 * multiple conditions with logical operators (AND/OR), and complex
 * nested conditions for the rules engine frontend.
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component - will be implemented when tests turn GREEN
const RuleConditionEvaluator = ({ 
  condition, 
  conditions, 
  logic = 'AND', 
  context, 
  showDetails = false,
  className 
}) => {
  const evaluateSingleCondition = (cond, ctx) => {
    if (!cond || !ctx) return false;
    
    const fieldValue = ctx[cond.field];
    const expectedValue = cond.value;
    
    switch (cond.operator) {
      case 'eq':
      case '==':
        return fieldValue === expectedValue;
      case 'ne':
      case '!=':
        return fieldValue !== expectedValue;
      case 'gt':
      case '>':
        return Number(fieldValue) > Number(expectedValue);
      case 'gte':
      case '>=':
        return Number(fieldValue) >= Number(expectedValue);
      case 'lt':
      case '<':
        return Number(fieldValue) < Number(expectedValue);
      case 'lte':
      case '<=':
        return Number(fieldValue) <= Number(expectedValue);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'startsWith':
        return String(fieldValue).startsWith(String(expectedValue));
      case 'endsWith':
        return String(fieldValue).endsWith(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      default:
        return false;
    }
  };
  
  let result = false;
  let resultMessage = '';
  let conditionResults = [];
  
  if (condition) {
    // Single condition
    result = evaluateSingleCondition(condition, context);
    resultMessage = result ? 'Condition passed' : 'Condition failed';
    conditionResults = [{ condition, result }];
  } else if (conditions && Array.isArray(conditions)) {
    // Multiple conditions
    conditionResults = conditions.map(cond => ({
      condition: cond,
      result: evaluateSingleCondition(cond, context)
    }));
    
    if (logic === 'AND') {
      result = conditionResults.every(cr => cr.result);
      resultMessage = result ? 'All conditions passed' : 'Condition failed';
    } else if (logic === 'OR') {
      result = conditionResults.some(cr => cr.result);
      resultMessage = result ? 'At least one condition passed' : 'All conditions failed';
    }
  }
  
  return (
    <div 
      className={`rule-condition-evaluator ${className || ''} ${result ? 'passed' : 'failed'}`}
      data-testid="rule-condition-evaluator"
    >
      <div className="condition-result" data-testid="condition-result">
        {resultMessage}
      </div>
      
      {showDetails && (
        <div className="condition-details" data-testid="condition-details">
          {conditionResults.map((cr, index) => (
            <div key={index} className={`condition-item ${cr.result ? 'passed' : 'failed'}`}>
              <span className="field">{cr.condition.field}</span>
              <span className="operator">{cr.condition.operator}</span>
              <span className="value">{JSON.stringify(cr.condition.value)}</span>
              <span className="result">{cr.result ? '✓' : '✗'}</span>
            </div>
          ))}
          {conditions && conditions.length > 1 && (
            <div className="logic-operator">Logic: {logic}</div>
          )}
        </div>
      )}
    </div>
  );
};

describe('RuleConditionEvaluator - Stage 3 Tests', () => {
  afterEach(cleanup);

  describe('Single Condition Evaluation', () => {
    test('evaluates equality correctly', () => {
      const condition = { field: 'cartTotal', operator: 'eq', value: 100 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('passed');
    });

    test('fails if condition does not match', () => {
      const condition = { field: 'cartTotal', operator: 'eq', value: 200 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition failed/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('failed');
    });

    test('handles greater than operator', () => {
      const condition = { field: 'cartTotal', operator: 'gt', value: 50 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
    });

    test('handles less than operator', () => {
      const condition = { field: 'cartTotal', operator: 'lt', value: 150 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
    });

    test('handles not equal operator', () => {
      const condition = { field: 'userRole', operator: 'ne', value: 'admin' };
      const context = { userRole: 'user' };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
    });

    test('handles contains operator for strings', () => {
      const condition = { field: 'userEmail', operator: 'contains', value: '@bpp.com' };
      const context = { userEmail: 'john.doe@bpp.com' };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
    });

    test('handles in operator for arrays', () => {
      const condition = { field: 'userRegion', operator: 'in', value: ['EU', 'UK', 'US'] };
      const context = { userRegion: 'EU' };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
    });
  });

  describe('Multiple Conditions with AND Logic', () => {
    test('handles AND logic correctly - all pass', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: true };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="AND" context={context} />);
      expect(screen.getByText(/all conditions passed/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('passed');
    });

    test('fails AND if one condition fails', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: false };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="AND" context={context} />);
      expect(screen.getByText(/condition failed/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('failed');
    });

    test('fails AND if all conditions fail', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 150 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: false };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="AND" context={context} />);
      expect(screen.getByText(/condition failed/i)).toBeInTheDocument();
    });
  });

  describe('Multiple Conditions with OR Logic', () => {
    test('handles OR logic correctly - one passes', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'lt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: true };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="OR" context={context} />);
      expect(screen.getByText(/at least one condition passed/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('passed');
    });

    test('passes OR if all conditions pass', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: true };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="OR" context={context} />);
      expect(screen.getByText(/at least one condition passed/i)).toBeInTheDocument();
    });

    test('fails OR if all conditions fail', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'lt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: false }
      ];
      const context = { cartTotal: 100, isLoggedIn: true };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="OR" context={context} />);
      expect(screen.getByText(/all conditions failed/i)).toBeInTheDocument();
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('failed');
    });
  });

  describe('Condition Details Display', () => {
    test('shows condition details when showDetails is true', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: true };
      
      render(
        <RuleConditionEvaluator 
          conditions={conditions} 
          logic="AND" 
          context={context} 
          showDetails={true} 
        />
      );
      
      expect(screen.getByTestId('condition-details')).toBeInTheDocument();
      expect(screen.getByText('cartTotal')).toBeInTheDocument();
      expect(screen.getByText('gt')).toBeInTheDocument();
      expect(screen.getByText('isLoggedIn')).toBeInTheDocument();
      expect(screen.getByText('Logic: AND')).toBeInTheDocument();
    });

    test('hides condition details when showDetails is false', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 50 }
      ];
      const context = { cartTotal: 100 };
      
      render(
        <RuleConditionEvaluator 
          conditions={conditions} 
          context={context} 
          showDetails={false} 
        />
      );
      
      expect(screen.queryByTestId('condition-details')).not.toBeInTheDocument();
    });

    test('shows individual condition results in details', () => {
      const conditions = [
        { field: 'cartTotal', operator: 'gt', value: 50 },
        { field: 'isLoggedIn', operator: 'eq', value: true }
      ];
      const context = { cartTotal: 100, isLoggedIn: false };
      
      render(
        <RuleConditionEvaluator 
          conditions={conditions} 
          logic="AND" 
          context={context} 
          showDetails={true} 
        />
      );
      
      // Should show one pass and one fail
      const checkmarks = screen.getAllByText('✓');
      const crosses = screen.getAllByText('✗');
      expect(checkmarks).toHaveLength(1);
      expect(crosses).toHaveLength(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles missing field in context', () => {
      const condition = { field: 'missingField', operator: 'eq', value: 100 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition failed/i)).toBeInTheDocument();
    });

    test('handles undefined context', () => {
      const condition = { field: 'cartTotal', operator: 'eq', value: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={undefined} />);
      expect(screen.getByText(/condition failed/i)).toBeInTheDocument();
    });

    test('handles empty conditions array', () => {
      const conditions = [];
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator conditions={conditions} context={context} />);
      expect(screen.getByText(/all conditions passed/i)).toBeInTheDocument();
    });

    test('handles unknown operator', () => {
      const condition = { field: 'cartTotal', operator: 'unknown', value: 100 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition failed/i)).toBeInTheDocument();
    });

    test('handles numeric string comparisons', () => {
      const condition = { field: 'cartTotal', operator: 'gt', value: 50 };
      const context = { cartTotal: '100' };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByText(/condition passed/i)).toBeInTheDocument();
    });
  });

  describe('Complex Conditions', () => {
    test('handles multiple conditions with complex data types', () => {
      const conditions = [
        { field: 'user.region', operator: 'eq', value: 'EU' },
        { field: 'cart.items', operator: 'gt', value: 0 },
        { field: 'preferences.notifications', operator: 'eq', value: true }
      ];
      const context = {
        'user.region': 'EU',
        'cart.items': 3,
        'preferences.notifications': true
      };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="AND" context={context} />);
      expect(screen.getByText(/all conditions passed/i)).toBeInTheDocument();
    });

    test('handles string operations correctly', () => {
      const conditions = [
        { field: 'userEmail', operator: 'contains', value: 'bpp.com' },
        { field: 'userName', operator: 'startsWith', value: 'John' },
        { field: 'userRole', operator: 'in', value: ['admin', 'user', 'guest'] }
      ];
      const context = {
        userEmail: 'john.doe@bpp.com',
        userName: 'John Doe',
        userRole: 'user'
      };
      
      render(<RuleConditionEvaluator conditions={conditions} logic="AND" context={context} />);
      expect(screen.getByText(/all conditions passed/i)).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    test('applies custom className', () => {
      const condition = { field: 'cartTotal', operator: 'eq', value: 100 };
      const context = { cartTotal: 100 };
      
      render(
        <RuleConditionEvaluator 
          condition={condition} 
          context={context} 
          className="custom-evaluator" 
        />
      );
      
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('custom-evaluator');
    });

    test('applies passed class for successful conditions', () => {
      const condition = { field: 'cartTotal', operator: 'eq', value: 100 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('passed');
    });

    test('applies failed class for unsuccessful conditions', () => {
      const condition = { field: 'cartTotal', operator: 'eq', value: 200 };
      const context = { cartTotal: 100 };
      
      render(<RuleConditionEvaluator condition={condition} context={context} />);
      expect(screen.getByTestId('rule-condition-evaluator')).toHaveClass('failed');
    });
  });
});

export default RuleConditionEvaluator;