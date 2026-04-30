import { AlertCircle } from "lucide-react";
import { StatTile } from "./dashboard/StatTile";
import { EmailBatchesPanel } from "./dashboard/EmailBatchesPanel";
import { OrdersPanel } from "./dashboard/OrdersPanel";
import { StudentsPanel } from "./dashboard/StudentsPanel";

export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      {/* Header */}
      <div className="tw:flex tw:items-end tw:justify-between tw:mb-6">
        <div>
          <h1 className="tw:text-2xl tw:font-semibold tw:tracking-[-0.02em] tw:text-foreground">
            Dashboard
          </h1>
        </div>
        <span className="tw:font-mono tw:text-[11px] tw:text-secondary-foreground">
          {today}
        </span>
      </div>

      {/* Bento Grid */}
      <div className="tw:grid tw:grid-cols-5 tw:gap-3">
        <EmailBatchesPanel className="tw:col-span-2" />

        <div className="tw:col-span-1">
          <StatTile
            label="Queue Errors"
            value="3"
            icon={AlertCircle}
            iconColor="var(--red)"
            iconBg="var(--red-bg)"
            delta="+2"
            deltaColor="var(--red)"
            deltaBg="var(--red-bg)"
            deltaLabel="today"
          />
        </div>

        <OrdersPanel className="tw:col-span-3" />
        <StudentsPanel className="tw:col-span-3" />
      </div>
    </div>
  );
}
