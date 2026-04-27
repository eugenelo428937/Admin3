import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OrderList from '../OrderList';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigateMock,
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}));

const vmReturn = {
  isSuperuser: true,
  orders: [
    {
      id: 42,
      created_at: '2026-04-22T14:30:00Z',
      total_amount: '540.00',
      student: { student_ref: 12345, first_name: 'Jane', last_name: 'Smith', email: 'j@x.com' },
      item_codes: ['CM1/CC/26', 'CP2/CPBOR/26'],
      item_count: 5,
    },
  ],
  loading: false,
  error: null,
  totalCount: 1,
  page: 0,
  pageSize: 20,
  filters: {
    studentRef: '', name: '', email: '', orderNo: '',
    productCode: '', dateFrom: '', dateTo: '',
  },
  setStudentRef: vi.fn(), setName: vi.fn(), setEmail: vi.fn(),
  setOrderNo: vi.fn(), setProductCode: vi.fn(),
  setDateFrom: vi.fn(), setDateTo: vi.fn(),
  clearFilters: vi.fn(),
  productCodeOptions: [{ value: 'CM1/CC/26', label: 'CM1/CC/26 — CM1 Core' }],
  ordering: '-created_at',
  toggleSort: vi.fn(),
  handleChangePage: vi.fn(),
  onView: vi.fn(),
};

vi.mock('../useOrderListVM', () => ({
  __esModule: true, default: () => vmReturn,
}));

describe('OrderList', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    Object.values(vmReturn).forEach((v) => {
      if (typeof v === 'function' && 'mockClear' in v) {
        (v as any).mockClear();
      }
    });
  });

  it('renders student name with student ref', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByText(/Jane Smith \(12345\)/)).toBeInTheDocument();
  });

  it('shows item count badge for orders with items', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByText(/5 items/i)).toBeInTheDocument();
  });

  it('shows item codes joined by commas', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByText(/CM1\/CC\/26.*CP2\/CPBOR\/26/)).toBeInTheDocument();
  });

  it('clicking View calls onView with order id', () => {
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /view/i }));
    expect(vmReturn.onView).toHaveBeenCalledWith(42);
  });
});

describe('OrderList — non-superuser', () => {
  it('redirects when not superuser', () => {
    (vmReturn as unknown as { isSuperuser: boolean }).isSuperuser = false;
    render(<MemoryRouter><OrderList /></MemoryRouter>);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
    (vmReturn as unknown as { isSuperuser: boolean }).isSuperuser = true;
  });
});
