import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

vi.mock('../../../../services/adminOrderService', () => ({
  __esModule: true,
  default: {
    getById: vi.fn(),
  },
}));

import OrderDetail from '../OrderDetail';
import adminOrderService from '../../../../services/adminOrderService';
import { useAuth } from '../../../../hooks/useAuth';

(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ isSuperuser: true });

const mockService = adminOrderService as unknown as {
  getById: ReturnType<typeof vi.fn>;
};

const fullOrder = {
  id: 42,
  created_at: '2026-04-22T14:30:00Z',
  updated_at: '2026-04-22T14:30:00Z',
  subtotal: '450.00', vat_amount: '90.00', total_amount: '540.00',
  vat_rate: '0.2000', vat_country: 'GB', vat_calculation_type: 'standard',
  calculations_applied: {},
  student: { student_ref: 12345, first_name: 'Jane', last_name: 'Smith', email: 'j@x.com' },
  items: [{
    id: 1, item_type: 'product', item_name: 'CM1 Core', quantity: 1,
    price_type: 'standard', actual_price: '450.00',
    net_amount: '450.00', vat_amount: '90.00', gross_amount: '540.00',
    vat_rate: '0.2000', is_vat_exempt: false, metadata: {},
    purchasable: { id: 5, code: 'CM1/CC/26', name: 'CM1 Core', kind: 'product' },
  }],
  payments: [{
    id: 1, payment_method: 'card', amount: '540.00', currency: 'GBP',
    transaction_id: 'tx_123', status: 'completed', is_successful: true,
    error_message: null, error_code: null,
    created_at: '2026-04-22T14:30:00Z', processed_at: '2026-04-22T14:30:05Z',
  }],
  user_contact: {
    id: 1, home_phone: '02011111111', home_phone_country: 'GB',
    mobile_phone: '+447111111111', mobile_phone_country: 'GB',
    work_phone: null, work_phone_country: '',
    email_address: 'jane@example.com',
    created_at: '2026-04-22T14:30:00Z', updated_at: '2026-04-22T14:30:00Z',
  },
  user_preferences: [{
    id: 1, preference_type: 'marketing', preference_key: 'email_optin',
    preference_value: { choice: 'yes' }, input_type: 'radio', display_mode: 'inline',
    title: 'Marketing emails', content_summary: '', is_submitted: true,
    submitted_at: '2026-04-22T14:30:00Z', updated_at: '2026-04-22T14:30:00Z',
    display_value: 'yes',
  }],
  user_acknowledgments: [{
    id: 1, acknowledgment_type: 'terms_conditions', rule_id: null, template_id: null,
    title: 'T&Cs v3', content_summary: 'You agree...', is_accepted: true,
    accepted_at: '2026-04-22T14:30:00Z', content_version: '3.0', acknowledgment_data: {},
  }],
};

// Wrapper to provide route params
const OrderDetailWrapper: React.FC<{ id: string }> = ({ id }) => {
  // Mock useParams to return the id
  vi.mocked(useParams).mockReturnValue({ id });
  return <OrderDetail />;
};

const renderAt = (id: string) => render(
  <BrowserRouter>
    <OrderDetailWrapper id={id} />
  </BrowserRouter>,
);

describe('OrderDetail', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders all six sections when order has data', async () => {
    mockService.getById.mockResolvedValue(fullOrder);
    renderAt('42');
    await waitFor(() => {
      expect(screen.getByText(/Order Summary/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    expect(screen.getByText(/Order Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Payments/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Acknowledgments/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
  });

  it('renders empty states for missing relations', async () => {
    mockService.getById.mockResolvedValue({
      ...fullOrder,
      user_contact: null, user_preferences: [], user_acknowledgments: [], payments: [],
    });
    renderAt('42');
    await waitFor(() => expect(screen.getByText(/Order Summary/i)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText(/no payments/i)).toBeInTheDocument();
    expect(screen.getByText(/no contact/i)).toBeInTheDocument();
    expect(screen.getByText(/no preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/no acknowledgments/i)).toBeInTheDocument();
  });

  it('shows error message on 404', async () => {
    mockService.getById.mockRejectedValue({ response: { status: 404 } });
    renderAt('999');
    await waitFor(() => {
      expect(screen.getByText('Order not found')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
