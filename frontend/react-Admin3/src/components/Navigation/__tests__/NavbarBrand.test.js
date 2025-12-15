/**
 * Tests for NavbarBrand Component
 * T027: Test logo render, link with Router
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NavbarBrand from '../NavbarBrand';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

// Mock image require
jest.mock('../../../assets/ActEdlogo.png', () => 'test-logo.png', { virtual: true });
jest.mock('../../../assets/ActEdlogo-S.png', () => 'test-logo-small.png', { virtual: true });

describe('NavbarBrand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderBrand = () => {
    return render(<NavbarBrand />);
  };

  describe('rendering', () => {
    test('renders navbar brand element', () => {
      const { container } = renderBrand();
      expect(container.querySelector('.navbar-brand')).toBeInTheDocument();
    });

    test('renders desktop logo', () => {
      renderBrand();
      const desktopLogo = screen.getAllByAltText('ActEd Logo')[0];
      expect(desktopLogo).toBeInTheDocument();
      // MUI sx prop handles responsive display - no Bootstrap classes to check
    });

    test('renders mobile logo', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      expect(logos).toHaveLength(2); // Both desktop and mobile logos exist
      expect(logos[1]).toBeInTheDocument();
    });

    test('both logos render with different sizes', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      expect(logos).toHaveLength(2);
      // Desktop logo (first)
      expect(logos[0]).toBeInTheDocument();
      // Mobile logo (second) with maxWidth
      expect(logos[1]).toBeInTheDocument();
      expect(logos[1]).toHaveStyle({ maxWidth: '2.35rem' });
    });

    test('logo images have correct alt text', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      logos.forEach(logo => {
        expect(logo).toHaveAttribute('alt', 'ActEd Logo');
      });
    });
  });

  describe('navigation', () => {
    test('navigates to /home on click', () => {
      const { container } = renderBrand();

      const brand = container.querySelector('.navbar-brand');
      fireEvent.click(brand);

      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });

    test('has cursor pointer style', () => {
      const { container } = renderBrand();
      const brand = container.querySelector('.navbar-brand');
      expect(brand).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('CSS classes', () => {
    test('has correct order classes for layout', () => {
      const { container } = renderBrand();
      const brand = container.querySelector('.navbar-brand');

      expect(brand).toHaveClass('order-1');
      expect(brand).toHaveClass('order-md-0');
    });

    test('has navbar-brand class for Bootstrap grid compatibility', () => {
      const { container } = renderBrand();
      const brand = container.querySelector('.navbar-brand');
      expect(brand).toHaveClass('navbar-brand');
    });
  });

  describe('image attributes', () => {
    test('both logos render correctly', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      expect(logos).toHaveLength(2);
      logos.forEach(logo => {
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src');
      });
    });

    test('mobile logo has max-width style', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      // Mobile logo is the second one (index 1)
      const mobileLogo = logos[1];
      expect(mobileLogo).toHaveStyle({ maxWidth: '2.35rem' });
    });
  });
});
