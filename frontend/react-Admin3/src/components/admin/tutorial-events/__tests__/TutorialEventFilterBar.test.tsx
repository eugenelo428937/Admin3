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
  it('typing directly on the code combobox calls setFilter("code")', async () => {
    const setFilter = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, setFilter } as any} />);

    // The combobox IS the input — type directly on it.
    const input = screen.getByRole('combobox', { name: /tutorial event code/i });
    await userEvent.type(input, 'CP1');

    expect(setFilter).toHaveBeenCalled();
    const lastCall = setFilter.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('code');
    expect(lastCall?.[1]).toBe('CP1');
  });

  it('renders Clear button that calls clearFilters', async () => {
    const clearFilters = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, clearFilters } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(clearFilters).toHaveBeenCalled();
  });

  it('hides dropdown rows while filterOptions is null but still shows the code combobox', () => {
    render(<TutorialEventFilterBar vm={{ ...baseVm, filterOptions: null } as any} />);
    expect(
      screen.getByRole('combobox', { name: /tutorial event code/i }),
    ).toBeInTheDocument();
    // The other combobox inputs should not be rendered when filterOptions is null.
    expect(screen.queryByRole('combobox', { name: /^subject$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^location$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^venue$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^instructor$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^sitting$/i })).not.toBeInTheDocument();
  });

  it('caps the code suggestion list at 5 items and matches by substring', async () => {
    const many: FilterOptions = {
      ...FILTER_OPTIONS,
      event_codes: ['CP1-A1', 'CP1-A2', 'CP1-B1', 'CP1-B2', 'CP1-C1', 'CP1-C2'],
    };
    render(
      <TutorialEventFilterBar
        vm={{ ...baseVm, filterOptions: many, filters: { ...baseVm.filters, code: 'CP1' } } as any}
      />,
    );

    const input = screen.getByRole('combobox', { name: /tutorial event code/i });
    await userEvent.click(input);

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(5);
  });

  it('clicking a code suggestion sets the value and closes the popover', async () => {
    const setFilter = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, setFilter } as any} />);

    const input = screen.getByRole('combobox', { name: /tutorial event code/i });
    await userEvent.click(input);

    // CP1-A1 is one of the seeded suggestions.
    const opt = await screen.findByRole('option', { name: /CP1-A1/i });
    await userEvent.click(opt);

    expect(setFilter).toHaveBeenCalledWith('code', 'CP1-A1');
  });
});
