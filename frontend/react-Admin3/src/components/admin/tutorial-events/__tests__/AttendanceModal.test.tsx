import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AttendanceModal from '../AttendanceModal';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));

// Radix UI Select does not open in JSDOM (Portal + pointer-event constraints).
// We replace it with a native <select> so tests can use userEvent.selectOptions.
// The mock collects SelectItem children via a context trick: SelectContent stores
// items and Select renders them as <option> elements.
const SelectContext = React.createContext<{
  addItem: (value: string, label: string) => void;
} | null>(null);

vi.mock('@/components/admin/ui/select', () => {
  return {
    Select: ({ value, onValueChange, disabled, children }: any) => {
      const [items, setItems] = React.useState<{ value: string; label: string }[]>([]);
      const ctx = React.useMemo(
        () => ({ addItem: (v: string, l: string) => setItems(prev => {
          if (prev.some(i => i.value === v)) return prev;
          return [...prev, { value: v, label: l }];
        }) }),
        [],
      );
      return React.createElement(
        SelectContext.Provider,
        { value: ctx },
        // Render children invisibly to collect items via context
        React.createElement('div', { style: { display: 'none' } }, children),
        // Render the actual select
        React.createElement(
          'select',
          {
            role: 'combobox',
            value: value ?? '',
            disabled,
            onChange: (e: any) => onValueChange?.(e.target.value),
          },
          React.createElement('option', { value: '' }, 'Set status'),
          items.map(item =>
            React.createElement('option', { key: item.value, value: item.value }, item.label)
          )
        )
      );
    },
    SelectTrigger: ({ children }: any) => children,
    SelectValue: ({ placeholder }: any) => React.createElement('span', null, placeholder),
    SelectContent: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: any) => {
      const ctx = React.useContext(SelectContext);
      React.useEffect(() => {
        ctx?.addItem(value, typeof children === 'string' ? children : String(children));
      }, [value, children, ctx]);
      return null;
    },
    SelectGroup: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SelectLabel: ({ children }: any) => React.createElement('span', null, children),
    SelectSeparator: () => null,
    SelectScrollUpButton: () => null,
    SelectScrollDownButton: () => null,
  };
});

const mock = vi.mocked(service);

const PAYLOAD = {
  session: {
    id: 1, title: 'S1',
    start_date: new Date(Date.now() - 60_000).toISOString(),
    end_date: new Date().toISOString(),
    venue: { id: 5, name: 'BPP' },
    tutorial_event: { id: 10, code: 'EV' },
  },
  attendance_enabled: true,
  registrations: [{
    registration_id: 100,
    student: { student_ref: 5001, first_name: 'Alice', last_name: 'Smith' },
    current_status: null, current_reason: '',
  }],
};

beforeEach(() => {
  mock.getAttendance.mockResolvedValue(PAYLOAD);
  mock.saveAttendance.mockResolvedValue(PAYLOAD);
});
afterEach(() => vi.clearAllMocks());

const SESSION = {
  id: 1, title: 'S1', start_date: '', end_date: '', venue: null,
  tutorial_event: { id: 10, code: 'EV' },
} as any;

describe('AttendanceModal', () => {
  it('shows skeleton while loading', () => {
    mock.getAttendance.mockReturnValue(new Promise(() => { /* never */ }));
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByTestId('attendance-skeleton')).toBeInTheDocument();
  });

  it('renders empty message when roster is empty', async () => {
    mock.getAttendance.mockResolvedValue({ ...PAYLOAD, registrations: [] });
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByText(/no students enrolled/i);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('Save disabled when nothing dirty', async () => {
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    const save = await screen.findByRole('button', { name: /save/i });
    expect(save).toBeDisabled();
  });

  it('Selecting OTHER reveals reason input and disables Save until filled', async () => {
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByText('Smith, Alice (5001)');
    const select = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(select, 'OTHER');
    const reason = await screen.findByPlaceholderText(/reason/i);
    expect(reason).toBeInTheDocument();

    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();
    await userEvent.type(reason, 'sick');
    expect(save).not.toBeDisabled();
  });

  it('clicking Save calls service.saveAttendance and onSaved on success', async () => {
    const onSaved = vi.fn();
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={onSaved} />);
    await screen.findByText('Smith, Alice (5001)');
    const select = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(select, 'ATTENDED');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mock.saveAttendance).toHaveBeenCalled());
    expect(onSaved).toHaveBeenCalled();
  });
});
