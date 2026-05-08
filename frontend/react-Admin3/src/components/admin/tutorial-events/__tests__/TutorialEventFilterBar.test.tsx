import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TutorialEventFilterBar from '../TutorialEventFilterBar';
import type { FilterOptions } from '../types';

const FILTER_OPTIONS: FilterOptions = {
  subjects: [{ code: 'CM2', description: 'Actuarial Practice' }],
  locations: [{ id: 1, name: 'London' }],
  venues: [{ id: 5, name: 'BPP Centre' }],
  instructors: [{ id: 7, name: 'Karen Smith' }],
  sittings: [{ id: 17, session_code: '2024S', start_date: '', end_date: '' }],
};

const baseVm = {
  filters: {
    subject_codes: [], code: '', start_from: null, start_to: null,
    location_ids: [], venue_ids: [], instructor_id: null,
    finalisation_from: null, finalisation_to: null, sitting_id: null,
  },
  filterOptions: FILTER_OPTIONS,
  setFilter: vi.fn(),
  clearFilters: vi.fn(),
};

describe('TutorialEventFilterBar', () => {
  it('renders code text input that calls setFilter("code")', async () => {
    const setFilter = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, setFilter } as any} />);
    const input = screen.getByLabelText(/code/i);
    await userEvent.type(input, 'CP1');
    expect(setFilter).toHaveBeenCalled();
    const lastCall = setFilter.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('code');
  });

  it('renders Clear filters button that calls clearFilters', async () => {
    const clearFilters = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, clearFilters } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(clearFilters).toHaveBeenCalled();
  });

  it('renders nothing for the dropdowns while filterOptions is null', () => {
    render(<TutorialEventFilterBar vm={{ ...baseVm, filterOptions: null } as any} />);
    expect(screen.queryByRole('combobox', { name: /subject/i })).not.toBeInTheDocument();
  });
});
