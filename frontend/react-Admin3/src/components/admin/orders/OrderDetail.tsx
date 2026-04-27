import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ChevronLeft, FileText, Package, CreditCard, CheckCircle, Info, ChevronsUpDown,
} from 'lucide-react';
import {
  AdminPage, AdminPageHeader, AdminLoadingState, AdminErrorAlert, AdminEmptyState,
} from '@/components/admin/composed';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import { Button } from '@/components/admin/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/admin/ui/dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/admin/ui/collapsible';
import useOrderDetailVM from './useOrderDetailVM';
import type { AdminOrderDetail } from '../../../types/admin-order.types';

const Section: React.FC<{
  title: string;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: React.ReactNode;
}> = ({ title, emptyMessage, isEmpty, children }) => (
  <div className="tw:rounded-[10px] tw:bg-card tw:p-6 tw:mb-4">
    <h2 className="tw:text-lg tw:font-semibold tw:mb-3">{title}</h2>
    {isEmpty && emptyMessage ? (
      <p className="tw:text-sm tw:text-muted-foreground">{emptyMessage}</p>
    ) : children}
  </div>
);

const StatusBadge: React.FC<{ ok: boolean; okLabel: string; failLabel: string }> = ({ ok, okLabel, failLabel }) => (
  <span className={`tw:inline-block tw:rounded tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium ${
    ok ? 'tw:bg-green-100 tw:text-green-800' : 'tw:bg-red-100 tw:text-red-800'
  }`}>{ok ? okLabel : failLabel}</span>
);

const formatVatRate = (rate: string | null) =>
  rate ? `${(parseFloat(rate) * 100).toFixed(0)}%` : '—';

const AddressBlock: React.FC<{
  title: string;
  type: string | null;
  data: Record<string, unknown>;
}> = ({ title, type, data }) => {
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== '');
  return (
    <div>
      <h4 className="tw:text-sm tw:font-medium tw:mb-2">
        {title}{type ? ` (${type})` : ''}
      </h4>
      {entries.length === 0 ? (
        <p className="tw:text-sm tw:text-muted-foreground">—</p>
      ) : (
        <dl className="tw:text-sm tw:space-y-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className="tw:flex tw:gap-2">
              <dt className="tw:text-muted-foreground tw:capitalize tw:min-w-[80px]">{k.replace(/_/g, ' ')}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

const VatBreakdownDialog: React.FC<{ order: AdminOrderDetail }> = ({ order }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="sm" aria-label="VAT breakdown" className="tw:h-7 tw:w-7 tw:p-0">
        <Info className="tw:size-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="tw:max-w-2xl">
      <DialogHeader><DialogTitle>VAT breakdown</DialogTitle></DialogHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead className="tw:text-right">Net</TableHead>
            <TableHead className="tw:text-right">VAT Rate</TableHead>
            <TableHead className="tw:text-right">VAT</TableHead>
            <TableHead className="tw:text-right">Gross</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((it) => (
            <TableRow key={it.id}>
              <TableCell className="tw:font-mono tw:text-xs">{it.purchasable?.code ?? '—'}</TableCell>
              <TableCell className="tw:text-right tw:font-mono">£{it.net_amount}</TableCell>
              <TableCell className="tw:text-right">{formatVatRate(it.vat_rate)}</TableCell>
              <TableCell className="tw:text-right tw:font-mono">£{it.vat_amount}</TableCell>
              <TableCell className="tw:text-right tw:font-mono">£{it.gross_amount}</TableCell>
            </TableRow>
          ))}
          <TableRow className="tw:font-semibold tw:border-t-2">
            <TableCell>Total</TableCell>
            <TableCell className="tw:text-right tw:font-mono">£{order.subtotal}</TableCell>
            <TableCell className="tw:text-right">—</TableCell>
            <TableCell className="tw:text-right tw:font-mono">£{order.vat_amount}</TableCell>
            <TableCell className="tw:text-right tw:font-mono">£{order.total_amount}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </DialogContent>
  </Dialog>
);

const OrderDetail: React.FC = () => {
  const vm = useOrderDetailVM();
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(true);

  if (!vm.isSuperuser) return <Navigate to="/" replace />;
  if (vm.loading) return <AdminPage><AdminLoadingState rows={6} columns={1} /></AdminPage>;
  if (vm.error) return <AdminPage><AdminErrorAlert message={vm.error} /></AdminPage>;
  if (!vm.order) return <AdminPage><AdminEmptyState title="Order not found" icon={FileText} /></AdminPage>;

  const o = vm.order;
  const c = o.user_contact;
  const d = o.delivery_detail;
  const phones = c
    ? [
        c.mobile_phone && `Mobile: ${c.mobile_phone}${c.mobile_phone_country ? ` (${c.mobile_phone_country})` : ''}`,
        c.home_phone && `Home: ${c.home_phone}`,
        c.work_phone && `Work: ${c.work_phone}`,
      ].filter(Boolean) as string[]
    : [];

  return (
    <AdminPage>
      <Link to="/admin/orders" className="tw:inline-flex tw:items-center tw:gap-1 tw:text-sm tw:text-muted-foreground tw:mb-3 hover:tw:text-foreground">
        <ChevronLeft className="tw:size-4" /> Back to Orders
      </Link>
      <AdminPageHeader title={`Order #${o.id}`} />

      <Section title="Order Summary">
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-8 tw:gap-y-2 tw:text-sm tw:mb-3">
          <div>
            <span className="tw:text-muted-foreground">Order date:</span>{' '}
            {new Date(o.created_at).toLocaleString('en-GB')}
          </div>
          <div className="tw:flex tw:items-center tw:gap-1">
            <span className="tw:text-muted-foreground">Total:</span>{' '}
            <span className="tw:font-semibold">£{o.total_amount}</span>
            <VatBreakdownDialog order={o} />
          </div>
        </div>

        <div className="tw:flex tw:flex-wrap tw:gap-x-8 tw:gap-y-2 tw:text-sm tw:mb-3">
          <div>
            <span className="tw:text-muted-foreground">Student ref:</span>{' '}
            {o.student.student_ref ?? '—'}
          </div>
          <div>
            <span className="tw:text-muted-foreground">Name:</span>{' '}
            {o.student.first_name} {o.student.last_name}
          </div>
          <div>
            <span className="tw:text-muted-foreground">Email:</span>{' '}
            <a href={`mailto:${o.student.email}`} className="tw:underline">{o.student.email}</a>
          </div>
        </div>

        <div className="tw:text-sm tw:mb-3">
          <span className="tw:text-muted-foreground">Contact:</span>{' '}
          {phones.length > 0 ? phones.join(' · ') : '—'}
        </div>

        <Collapsible open={addressesOpen} onOpenChange={setAddressesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="tw:h-7 tw:px-1 tw:text-xs">
              <ChevronsUpDown className="tw:mr-1 tw:size-3" />
              {addressesOpen ? 'Hide addresses' : 'Show delivery & billing addresses'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="tw:grid tw:grid-cols-1 md:tw:grid-cols-2 tw:gap-6 tw:mt-3 tw:pt-3 tw:border-t">
              <AddressBlock
                title="Delivery address"
                type={d?.delivery_address_type ?? null}
                data={d?.delivery_address_data ?? {}}
              />
              <AddressBlock
                title="Billing address"
                type={d?.invoice_address_type ?? null}
                data={d?.invoice_address_data ?? {}}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title={`Order Items (${o.items.length})`}
        isEmpty={o.items.length === 0} emptyMessage="No items on this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Order No</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="tw:text-right">Qty</TableHead>
            <TableHead>Price Type</TableHead>
            <TableHead className="tw:text-right">Net</TableHead>
            <TableHead className="tw:text-right">VAT</TableHead>
            <TableHead className="tw:text-right">Gross</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="tw:font-mono tw:text-xs">{String(it.metadata?.orderno ?? '—')}</TableCell>
                <TableCell className="tw:font-mono tw:text-xs">{it.purchasable?.code ?? '—'}</TableCell>
                <TableCell>{it.item_name ?? '—'}</TableCell>
                <TableCell className="tw:text-right">{it.quantity}</TableCell>
                <TableCell>{it.price_type}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{it.net_amount}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{it.vat_amount}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{it.gross_amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title={`Payments (${o.payments.length})`}
        isEmpty={o.payments.length === 0} emptyMessage="No payments recorded for this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Method</TableHead>
            <TableHead className="tw:text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Processed</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_method}</TableCell>
                <TableCell className="tw:text-right tw:font-mono">£{p.amount}</TableCell>
                <TableCell><StatusBadge ok={p.is_successful} okLabel={p.status} failLabel={p.status} /></TableCell>
                <TableCell className="tw:font-mono tw:text-xs">{p.transaction_id ?? '—'}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleString('en-GB')}</TableCell>
                <TableCell>{p.processed_at ? new Date(p.processed_at).toLocaleString('en-GB') : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <div className="tw:rounded-[10px] tw:bg-card tw:p-6 tw:mb-4">
        <Collapsible open={extrasOpen} onOpenChange={setExtrasOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="tw:flex tw:w-full tw:justify-between tw:p-0 tw:h-auto">
              <h2 className="tw:text-lg tw:font-semibold">Preferences & Acknowledgments</h2>
              <ChevronsUpDown className="tw:size-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="tw:grid tw:grid-cols-1 lg:tw:grid-cols-2 tw:gap-6 tw:mt-3">
              <div>
                <h3 className="tw:text-sm tw:font-semibold tw:mb-2">
                  <Package className="tw:inline tw:size-4 tw:mr-1" />
                  Preferences ({o.user_preferences.length})
                </h3>
                {o.user_preferences.length === 0 ? (
                  <p className="tw:text-sm tw:text-muted-foreground">No preferences captured.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {o.user_preferences.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="tw:font-mono tw:text-xs">{p.preference_key}</TableCell>
                          <TableCell>{p.title}</TableCell>
                          <TableCell>{p.display_value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div>
                <h3 className="tw:text-sm tw:font-semibold tw:mb-2">
                  <CheckCircle className="tw:inline tw:size-4 tw:mr-1" />
                  Acknowledgments ({o.user_acknowledgments.length})
                </h3>
                {o.user_acknowledgments.length === 0 ? (
                  <p className="tw:text-sm tw:text-muted-foreground">No acknowledgments captured.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {o.user_acknowledgments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.acknowledgment_type}</TableCell>
                          <TableCell>{a.title}</TableCell>
                          <TableCell><StatusBadge ok={a.is_accepted} okLabel="Accepted" failLabel="Pending" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </AdminPage>
  );
};

export default OrderDetail;
