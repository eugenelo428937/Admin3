import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TutorialEventList from '../TutorialEventList';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));
const mock = vi.mocked(service);

let isSuper = true;
vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: isSuper }),
}));

beforeEach(() => {
  isSuper = true;
  mock.listEvents.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  mock.filterOptions.mockResolvedValue({
    subjects: [], locations: [], venues: [], instructors: [], sittings: [],
    event_codes: [],
  });
});
afterEach(() => vi.clearAllMocks());

describe('TutorialEventList', () => {
  it('redirects when not superuser', () => {
    isSuper = false;
    render(<MemoryRouter><TutorialEventList /></MemoryRouter>);
    expect(screen.queryByText(/Tutorials/i)).not.toBeInTheDocument();
  });

  it('renders header and filter bar for superusers', async () => {
    render(<MemoryRouter><TutorialEventList /></MemoryRouter>);
    await waitFor(() => expect(mock.listEvents).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /tutorials/i })).toBeInTheDocument();
  });

  it('renders empty state when there are zero events', async () => {
    render(<MemoryRouter><TutorialEventList /></MemoryRouter>);
    await waitFor(() => expect(mock.listEvents).toHaveBeenCalled());
    expect(await screen.findByText(/no events/i)).toBeInTheDocument();
  });
});
