import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronLeft, FileText, User, Package, CreditCard, Phone, Settings, CheckCircle } from 'lucide-react';
import {
  AdminPage, AdminPageHeader, AdminLoadingState, AdminErrorAlert, AdminEmptyState,
} from '@/components/admin/composed';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import useOrderDetailVM from './useOrderDetailVM';

const Section: React.FC<{
  title: string; icon: React.ComponentType<{ className?: string }>;
  emptyMessage?: string; isEmpty?: boolean; children: React.ReactNode;
}> = ({ title, icon: Icon, emptyMessage, isEmpty, children }) => (
  <div className="tw:rounded-[10px] tw:bg-card tw:p-6 tw:mb-4">
    <h2 className="tw:flex tw:items-center tw:gap-2 tw:text-lg tw:font-semibold tw:mb-3">
      <Icon className="tw:size-5" /> {title}
    </h2>
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

const OrderDetail: React.FC = () => {
  const vm = useOrderDetailVM();

  if (!vm.isSuperuser) return <Navigate to="/" replace />;

  if (vm.loading) return <AdminPage><AdminLoadingState rows={6} columns={1} /></AdminPage>;
  if (vm.error) return <AdminPage><AdminErrorAlert message={vm.error} /></AdminPage>;
  if (!vm.order) return <AdminPage><AdminEmptyState title="Order not found" icon={FileText} /></AdminPage>;

  const o = vm.order;

  return (
    <AdminPage>
      <Link to="/admin/orders" className="tw:inline-flex tw:items-center tw:gap-1 tw:text-sm tw:text-muted-foreground tw:mb-3 hover:tw:text-foreground">
        <ChevronLeft className="tw:size-4" /> Back to Orders
      </Link>
      <AdminPageHeader title={`Order #${o.id}`} />

      <Section title="Order Summary" icon={FileText}>
        <dl className="tw:grid tw:grid-cols-2 md:tw:grid-cols-3 tw:gap-3 tw:text-sm">
          <div><dt className="tw:text-muted-foreground">Created</dt><dd>{new Date(o.created_at).toLocaleString()}</dd></div>
          <div><dt className="tw:text-muted-foreground">Subtotal</dt><dd>£{o.subtotal}</dd></div>
          <div><dt className="tw:text-muted-foreground">VAT</dt><dd>£{o.vat_amount}</dd></div>
          <div><dt className="tw:text-muted-foreground">Total</dt><dd className="tw:font-semibold">£{o.total_amount}</dd></div>
          <div><dt className="tw:text-muted-foreground">VAT Rate</dt><dd>{o.vat_rate ? `${(parseFloat(o.vat_rate) * 100).toFixed(0)}%` : '—'}</dd></div>
          <div><dt className="tw:text-muted-foreground">VAT Country</dt><dd>{o.vat_country ?? '—'}</dd></div>
        </dl>
      </Section>

      <Section title="Student" icon={User}>
        <p className="tw:text-sm">
          <span className="tw:font-medium">{o.student.first_name} {o.student.last_name}</span>
          {' '}({o.student.student_ref ?? '—'}) · {o.student.email}
        </p>
      </Section>

      <Section title={`Order Items (${o.items.length})`} icon={Package}
        isEmpty={o.items.length === 0} emptyMessage="No items on this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Name</TableHead>
            <TableHead className="tw:text-right">Qty</TableHead>
            <TableHead>Price Type</TableHead>
            <TableHead className="tw:text-right">Net</TableHead>
            <TableHead className="tw:text-right">VAT</TableHead>
            <TableHead className="tw:text-right">Gross</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.items.map((it) => (
              <TableRow key={it.id}>
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

      <Section title={`Payments (${o.payments.length})`} icon={CreditCard}
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
                <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                <TableCell>{p.processed_at ? new Date(p.processed_at).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Contact" icon={Phone}
        isEmpty={!o.user_contact} emptyMessage="No contact captured for this order">
        {o.user_contact && (
          <dl className="tw:grid tw:grid-cols-2 md:tw:grid-cols-3 tw:gap-3 tw:text-sm">
            <div><dt className="tw:text-muted-foreground">Mobile</dt><dd>{o.user_contact.mobile_phone} {o.user_contact.mobile_phone_country && `(${o.user_contact.mobile_phone_country})`}</dd></div>
            <div><dt className="tw:text-muted-foreground">Home</dt><dd>{o.user_contact.home_phone ?? '—'}</dd></div>
            <div><dt className="tw:text-muted-foreground">Work</dt><dd>{o.user_contact.work_phone ?? '—'}</dd></div>
            <div className="tw:col-span-2 md:tw:col-span-3"><dt className="tw:text-muted-foreground">Email</dt><dd>{o.user_contact.email_address}</dd></div>
          </dl>
        )}
      </Section>

      <Section title={`Preferences (${o.user_preferences.length})`} icon={Settings}
        isEmpty={o.user_preferences.length === 0} emptyMessage="No preferences captured for this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Key</TableHead>
            <TableHead>Title</TableHead><TableHead>Value</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.user_preferences.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.preference_type}</TableCell>
                <TableCell className="tw:font-mono tw:text-xs">{p.preference_key}</TableCell>
                <TableCell>{p.title}</TableCell>
                <TableCell>{p.display_value}</TableCell>
                <TableCell>{new Date(p.submitted_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title={`Acknowledgments (${o.user_acknowledgments.length})`} icon={CheckCircle}
        isEmpty={o.user_acknowledgments.length === 0} emptyMessage="No acknowledgments captured for this order">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Title</TableHead>
            <TableHead>Status</TableHead><TableHead>Accepted At</TableHead>
            <TableHead>Version</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {o.user_acknowledgments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.acknowledgment_type}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell><StatusBadge ok={a.is_accepted} okLabel="Accepted" failLabel="Pending" /></TableCell>
                <TableCell>{new Date(a.accepted_at).toLocaleString()}</TableCell>
                <TableCell>{a.content_version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </AdminPage>
  );
};

export default OrderDetail;
