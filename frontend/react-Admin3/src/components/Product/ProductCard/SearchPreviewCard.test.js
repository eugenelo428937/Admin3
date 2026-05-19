/**
 * SearchPreviewCard
 *
 * Minimal preview card used by ProductGrid for search-shape Tutorial /
 * Marking rows. The full-featured TutorialProductCard / MarkingProductCard
 * components expect detailed shapes (events[], variations[]) that the
 * search response intentionally does not carry. This card surfaces just
 * enough identifying info (subject, kind-specific name, format /
 * template) so the row is visible alongside Material rows — the
 * acceptance criterion from mti-search-polymorphic-tutorial-marking.md.
 *
 * The full cart-add flow lives on the dedicated product page.
 */
import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SearchPreviewCard from './SearchPreviewCard';

const renderCard = (product) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <SearchPreviewCard product={product} />
    </ThemeProvider>
  );

describe('SearchPreviewCard', () => {
  describe('Tutorial kind', () => {
    const tutorialRow = {
      id: 101,
      kind: 'tutorial',
      type: 'Tutorial',
      subject_code: 'CM2',
      subject_description: 'Financial Engineering and Loss Reserving',
      product_name: 'Live Online 6 half days',
      format: 'LO_6H',
      format_display: 'Live Online 6 half days',
      tutorial_location_name: 'London',
      tutorial_location_code: 'LON',
      exam_session_code: '2025-04',
      prices: [{ price_type: 'standard', amount: '150.00', currency: 'GBP' }],
    };

    it('renders subject code', () => {
      renderCard(tutorialRow);
      expect(screen.getByText(/CM2/)).toBeInTheDocument();
    });

    it('renders tutorial location name', () => {
      renderCard(tutorialRow);
      expect(screen.getByText(/London/)).toBeInTheDocument();
    });

    it('renders format display', () => {
      renderCard(tutorialRow);
      expect(screen.getByText(/Live Online 6 half days/)).toBeInTheDocument();
    });

    it('renders OC label when location is missing (online classroom)', () => {
      renderCard({ ...tutorialRow, tutorial_location_name: null, format: 'OC', format_display: 'Online Classroom' });
      expect(screen.getByText(/Online Classroom/)).toBeInTheDocument();
    });
  });

  describe('Marking kind', () => {
    const markingRow = {
      id: 202,
      kind: 'marking',
      type: 'Markings',
      subject_code: 'CM2',
      subject_description: 'Financial Engineering and Loss Reserving',
      product_name: 'Mock Marking 1',
      marking_template_name: 'Mock Marking 1',
      marking_template_code: 'MM1',
      exam_session_code: '2025-04',
      prices: [{ price_type: 'standard', amount: '40.00', currency: 'GBP' }],
    };

    it('renders subject code', () => {
      renderCard(markingRow);
      expect(screen.getByText(/CM2/)).toBeInTheDocument();
    });

    it('renders marking template name', () => {
      renderCard(markingRow);
      expect(screen.getByText(/Mock Marking 1/)).toBeInTheDocument();
    });
  });

  describe('Pricing', () => {
    it('shows a standard price when present', () => {
      renderCard({
        id: 1, kind: 'tutorial', subject_code: 'CM2',
        product_name: 'x', format_display: 'x',
        tutorial_location_name: 'London',
        prices: [{ price_type: 'standard', amount: '150.00', currency: 'GBP' }],
      });
      expect(screen.getByText(/150\.00/)).toBeInTheDocument();
    });

    it('omits price block when prices array is empty', () => {
      renderCard({
        id: 1, kind: 'marking', subject_code: 'CM2',
        product_name: 'x', marking_template_name: 'x',
        prices: [],
      });
      // No price element should be in the document; absence assertion
      // via queryByText avoiding throws.
      expect(screen.queryByText(/GBP/)).not.toBeInTheDocument();
    });
  });
});
