import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TutorialEventRow from '../TutorialEventRow';
import type { EventDTO } from '../types';

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const EVENT: EventDTO = {
  id: 42, code: 'CP1-01-24A',
  subject: { code: 'CP1', description: 'Actuarial Practice' },
  exam_session: null,
  start_date: '2026-06-01', end_date: '2026-06-15',
  location: { id: 1, name: 'London' },
  venue: { id: 5, name: 'BPP Centre' },
  main_instructor: { id: 7, name: 'Karen Smith' },
  all_instructors: [{ id: 7, name: 'Karen Smith' }, { id: 9, name: 'Mark Davis' }],
  finalisation_date: '2026-05-15',
  enrolled_distinct: 28,
  sessions: [
    {
      id: 101, title: 'CP1-01-24A-1', sequence: 1,
      start_date: PAST, end_date: PAST, venue: { id: 5, name: 'BPP Centre' },
      instructors: [], enrolled_count: 28,
    },
    {
      id: 102, title: 'CP1-01-24A-2', sequence: 2,
      start_date: FUTURE, end_date: FUTURE, venue: { id: 5, name: 'BPP Centre' },
      instructors: [], enrolled_count: 28,
    },
  ],
};

function renderRow(overrides: Partial<{
  expanded: boolean; onToggle: () => void; onOpenAttendance: (s: any) => void;
}> = {}) {
  const onToggle = overrides.onToggle ?? vi.fn();
  const onOpenAttendance = overrides.onOpenAttendance ?? vi.fn();
  return render(
    <table><tbody>
      <TutorialEventRow
        event={EVENT}
        expanded={overrides.expanded ?? false}
        onToggle={onToggle}
        onOpenAttendance={onOpenAttendance}
      />
    </tbody></table>,
  );
}

describe('TutorialEventRow', () => {
  it('renders event main row', () => {
    renderRow();
    expect(screen.getByText('CP1-01-24A')).toBeInTheDocument();
    expect(screen.getByText(/Karen Smith.*\+1/)).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  it('does not render sessions when collapsed', () => {
    renderRow({ expanded: false });
    expect(screen.queryByText('CP1-01-24A-1')).not.toBeInTheDocument();
  });

  it('renders sessions when expanded', () => {
    renderRow({ expanded: true });
    expect(screen.getByText('CP1-01-24A-1')).toBeInTheDocument();
    expect(screen.getByText('CP1-01-24A-2')).toBeInTheDocument();
  });

  it('chevron click triggers onToggle', async () => {
    const onToggle = vi.fn();
    renderRow({ onToggle });
    await userEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('Attendance menu enabled for past session, disabled for future', async () => {
    renderRow({ expanded: true });
    const menuButtons = screen.getAllByRole('button', { name: /more/i });
    expect(menuButtons).toHaveLength(2);

    await userEvent.click(menuButtons[0]); // past session
    const enabledItem = await screen.findByRole('menuitem', { name: /attendance/i });
    expect(enabledItem).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Escape}');

    await userEvent.click(menuButtons[1]); // future session
    const disabledItem = await screen.findByRole('menuitem', { name: /attendance/i });
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('clicking enabled Attendance calls onOpenAttendance with the right session', async () => {
    const onOpenAttendance = vi.fn();
    renderRow({ expanded: true, onOpenAttendance });
    const menuButtons = screen.getAllByRole('button', { name: /more/i });
    await userEvent.click(menuButtons[0]);
    await userEvent.click(await screen.findByRole('menuitem', { name: /attendance/i }));
    expect(onOpenAttendance).toHaveBeenCalledWith(expect.objectContaining({ id: 101 }));
  });
});
