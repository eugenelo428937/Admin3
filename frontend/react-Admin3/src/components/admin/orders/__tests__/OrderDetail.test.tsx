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
    vat_rate: '0.2000', is_vat_exempt: false, metadata: { orderno: 'ORD-001' },
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
  delivery_detail: {
    id: 1,
    delivery_address_type: 'home', delivery_address_data: { line1: '1 High St', city: 'London' },
    invoice_address_type: 'work', invoice_address_data: { line1: '2 Work Way', city: 'London' },
    created_at: '2026-04-22T14:30:00Z', updated_at: '2026-04-22T14:30:00Z',
  },
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

  it('renders the consolidated Order Summary with student, contact, total', async () => {
    mockService.getById.mockResolvedValue(fullOrder);
    renderAt('42');
    await waitFor(() => expect(screen.getByText('Order Summary')).toBeInTheDocument());
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/j@x.com/)).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    // Items section title
    expect(screen.getByText(/Order Items/)).toBeInTheDocument();
    // Payments section title
    expect(screen.getByText(/Payments/)).toBeInTheDocument();
    // Combined preferences & acks section
    expect(screen.getByText(/Preferences & Acknowledgments/)).toBeInTheDocument();
  });

  it('shows order no in the items table from item metadata', async () => {
    mockService.getById.mockResolvedValue(fullOrder);
    renderAt('42');
    await waitFor(() => expect(screen.getByText('ORD-001')).toBeInTheDocument());
  });

  it('renders empty preferences/acknowledgments messages when arrays empty', async () => {
    mockService.getById.mockResolvedValue({
      ...fullOrder,
      user_preferences: [], user_acknowledgments: [], payments: [],
    });
    renderAt('42');
    await waitFor(() => expect(screen.getByText('Order Summary')).toBeInTheDocument());
    expect(screen.getByText(/No preferences captured/)).toBeInTheDocument();
    expect(screen.getByText(/No acknowledgments captured/)).toBeInTheDocument();
  });

  it('shows error message on 404', async () => {
    mockService.getById.mockRejectedValue({ response: { status: 404 } });
    renderAt('999');
    await waitFor(() => {
      expect(screen.getByText(/order not found/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
