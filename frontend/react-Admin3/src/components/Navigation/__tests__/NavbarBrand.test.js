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
      expect(desktopLogo).toHaveClass('d-none', 'd-md-block');
    });

    test('renders mobile logo', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      const mobileLogo = logos.find(img => img.classList.contains('d-md-none'));
      expect(mobileLogo).toBeInTheDocument();
    });

    test('desktop logo is hidden on mobile screens', () => {
      renderBrand();
      const desktopLogo = screen.getAllByAltText('ActEd Logo')[0];
      expect(desktopLogo).toHaveClass('d-none');
    });

    test('mobile logo is hidden on desktop screens', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      const mobileLogo = logos.find(img => img.classList.contains('d-md-none'));
      expect(mobileLogo).toHaveClass('d-md-none');
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

    test('has pe-md-2 padding class', () => {
      const { container } = renderBrand();
      const brand = container.querySelector('.navbar-brand');
      expect(brand).toHaveClass('pe-md-2');
    });
  });

  describe('image attributes', () => {
    test('images have fluid class', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      logos.forEach(logo => {
        expect(logo).toBeInTheDocument();
      });
    });

    test('mobile logo has max-width style', () => {
      renderBrand();
      const logos = screen.getAllByAltText('ActEd Logo');
      const mobileLogo = logos.find(img => img.classList.contains('d-md-none'));
      expect(mobileLogo).toHaveStyle({ maxWidth: '2.35rem' });
    });
  });
});
