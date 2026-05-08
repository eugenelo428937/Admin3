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
  event_codes: ['CP1-A1', 'CB1-A2'],
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
  it('renders code typeahead input that calls setFilter("code")', async () => {
    const setFilter = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, setFilter } as any} />);
    const input = screen.getByLabelText(/tutorial event code/i);
    await userEvent.type(input, 'CP1');
    expect(setFilter).toHaveBeenCalled();
    const lastCall = setFilter.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('code');
  });

  it('renders Clear button that calls clearFilters', async () => {
    const clearFilters = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, clearFilters } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(clearFilters).toHaveBeenCalled();
  });

  it('hides dropdown rows while filterOptions is null but still shows the code input', () => {
    render(<TutorialEventFilterBar vm={{ ...baseVm, filterOptions: null } as any} />);
    // The Code typeahead is always present.
    expect(screen.getByLabelText(/tutorial event code/i)).toBeInTheDocument();
    // The Combobox-popover triggers (rendered as buttons) should not appear.
    expect(
      screen.queryByRole('button', { name: /any subject/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /any location/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /any venue/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /any instructor/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a datalist option per known event code', () => {
    const { container } = render(<TutorialEventFilterBar vm={baseVm as any} />);
    const options = container.querySelectorAll('datalist option');
    const values = Array.from(options).map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(expect.arrayContaining(['CP1-A1', 'CB1-A2']));
  });
});
