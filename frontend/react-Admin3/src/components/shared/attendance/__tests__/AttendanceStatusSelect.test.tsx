import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import AttendanceStatusSelect from '../AttendanceStatusSelect';

describe('AttendanceStatusSelect', () => {
  it('renders the current status label on the trigger', () => {
    render(<AttendanceStatusSelect value="ATTENDED" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Attended');
  });

  it('emits onChange when an option is selected', () => {
    const onChange = vi.fn();
    render(<AttendanceStatusSelect value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Absent'));
    expect(onChange).toHaveBeenCalledWith('ABSENT');
  });

  it('sets data-status on the trigger so CSS can tint it', () => {
    render(<AttendanceStatusSelect value="LATE" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveAttribute('data-status', 'LATE');
  });
});
