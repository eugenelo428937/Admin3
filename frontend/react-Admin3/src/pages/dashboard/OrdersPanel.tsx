import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminOrderService from "../../services/adminOrderService";
import type { AdminOrderListItem } from "../../types/admin-order.types";
import { DashboardPanel } from "./DashboardPanel";
import { AsyncCombobox } from "@/components/admin/ui/async-combobox";
import { fetchStudentOptions } from "./studentOptions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { Button } from "@/components/admin/ui/button";

interface OrdersPanelProps {
  className?: string;
  pageSize?: number;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
};

export function OrdersPanel({ className, pageSize = 5 }: OrdersPanelProps) {
  const navigate = useNavigate();
  const [studentRef, setStudentRef] = useState<string>("");
  const [studentLabel, setStudentLabel] = useState<string>("");
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminOrderService
      .search({
        student_ref: studentRef || undefined,
        page: 1,
        page_size: pageSize,
        ordering: "-order_date",
      })
      .then((res) => setOrders(res.results))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [studentRef, pageSize]);

  return (
    <DashboardPanel
      title="Orders"
      viewAllHref="/admin/orders"
      className={className}
      search={
        <div className="tw:w-72">
          <AsyncCombobox
            value={studentRef}
            selectedLabel={studentLabel || undefined}
            onValueChange={(val, opt) => {
              setStudentRef(val);
              setStudentLabel(opt?.label ?? "");
            }}
            fetchOptions={fetchStudentOptions}
            placeholder="All students"
            searchPlaceholder="Ref, name, or email..."
            emptyMessage="No students found."
          />
        </div>
      }
    >
      {loading ? (
        <div className="tw:px-[18px] tw:py-3 tw:text-xs tw:text-muted-foreground">
          Loading...
        </div>
      ) : orders.length === 0 ? (
        <div className="tw:px-[18px] tw:py-3 tw:text-xs tw:text-muted-foreground">
          No orders found.
        </div>
      ) : (
        <div className="tw:px-[18px] tw:pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw:h-8">Order Date</TableHead>
                <TableHead className="tw:h-8">Student</TableHead>
                <TableHead className="tw:h-8 tw:text-right">Items</TableHead>
                <TableHead className="tw:h-8 tw:w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="tw:py-2 tw:text-xs">
                    {formatDate(o.order_date ?? o.created_at)}
                  </TableCell>
                  <TableCell className="tw:py-2 tw:text-xs">
                    {o.student.first_name} {o.student.last_name}
                  </TableCell>
                  <TableCell className="tw:py-2 tw:text-xs tw:text-right tw:font-mono">
                    {o.item_count}
                  </TableCell>
                  <TableCell className="tw:py-2 tw:text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="tw:h-7 tw:text-xs"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardPanel>
  );
}
