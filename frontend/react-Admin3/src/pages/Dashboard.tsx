import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Package, Users, AlertCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import emailService from "../services/emailService";
import type { EmailBatch, BatchStatus } from "../types/email";
import { StatTile } from "./dashboard/StatTile";
import { DeliveryRing } from "./dashboard/DeliveryRing";
import { SessionTimeline } from "./dashboard/SessionTimeline";
import { CatalogSummary } from "./dashboard/CatalogSummary";

const STATUS_BADGE: Record<
   BatchStatus,
   { color: string; bg: string; label: string }
> = {
   pending: {
      color: "var(--secondary-foreground)",
      bg: "rgba(0,0,0,0.03)",
      label: "Queued",
   },
   processing: {
      color: "var(--blue)",
      bg: "var(--blue-bg)",
      label: "Processing",
   },
   completed: {
      color: "var(--green)",
      bg: "var(--green-bg)",
      label: "Completed",
   },
   completed_with_errors: {
      color: "var(--amber)",
      bg: "var(--amber-bg)",
      label: "With Errors",
   },
   failed: { color: "var(--red)", bg: "var(--red-bg)", label: "Failed" },
};

const BATCH_DOT: Record<BatchStatus, string> = {
   pending: "rgba(0,0,0,0.1)",
   processing: "var(--blue)",
   completed: "var(--green)",
   completed_with_errors: "var(--amber)",
   failed: "var(--red)",
};

const formatRelativeTime = (dateString: string | null): string => {
   if (!dateString) return "-";
   const date = new Date(dateString);
   const now = new Date();
   const diffMs = now.getTime() - date.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   const diffHours = Math.floor(diffMins / 60);
   const diffDays = Math.floor(diffHours / 24);
   if (diffDays > 0) return `${diffDays}d ago`;
   if (diffHours > 0) return `${diffHours}h ago`;
   if (diffMins > 0) return `${diffMins}m ago`;
   return "just now";
};

export default function Dashboard() {
   const { user } = useAuth() as any;
   const firstName = user?.first_name || "Admin";
   const [batches, setBatches] = useState<EmailBatch[]>([]);

   useEffect(() => {
      emailService
         .getBatches({ limit: 5 })
         .then((res) => {
            setBatches(res.results);
         })
         .catch(() => {});
   }, []);

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
            {/* Row 2: Email Batches + Delivery Ring */}
            <div className="tw:col-span-2 tw:col-start-1 tw:rounded-[10px] tw:bg-card tw:transition-all tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:tw:-translate-y-px tw:px-4 tw:py-2">
               <div className="tw:flex tw:items-center tw:justify-between tw:px-[18px] tw:pt-3.5 tw:pb-2.5">
                  <span className="tw:text-base tw:font-medium tw:text-muted-foreground tw:tracking-[-0.01em]">
                     Email Batches
                  </span>
                  <Link
                     to="/admin/email/batches"
                     className="tw:text-sm tw:font-medium tw:text-primary tw:no-underline hover:tw:text-[var(--primary-hover)] tw:flex tw:flex-row tw:justify-center tw:items-center"
                  >
                     View all <ChevronRight />
                  </Link>
               </div>
               {batches.length === 0 ? (
                  <div className="tw:px-[18px] tw:py-3 tw:text-xs tw:text-muted-foreground">
                     No recent batches.
                  </div>
               ) : (
                  batches.map((batch, idx) => {
                     const style = STATUS_BADGE[batch.status];
                     return (
                        <div
                           key={batch.batch_id}
                           className={`tw:flex tw:items-center tw:gap-2.5 tw:px-[18px] tw:py-[9px] tw:transition-colors hover:tw:bg-[rgba(0,0,0,0.012)] ${
                              idx > 0
                                 ? "tw:border-t tw:border-[var(--border)]"
                                 : ""
                           }`}
                        >
                           <div
                              className="tw:size-1.5 tw:rounded-full tw:shrink-0"
                              style={{ background: BATCH_DOT[batch.status] }}
                           />
                           <div className="tw:flex-1 tw:min-w-0">
                              <div className="tw:text-sm tw:font-medium tw:truncate">
                                 {batch.template_name || "Unknown"}
                              </div>
                              <div className="tw:text-[10px] tw:text-secondary-foreground tw:mt-px">
                                 {batch.requested_by} ·{" "}
                                 {formatRelativeTime(batch.created_at)}
                              </div>
                           </div>
                           <div className="tw:text-right">
                              <div className="tw:font-mono tw:text-[11px] tw:text-muted-foreground">
                                 {batch.sent_count}/{batch.total_items}
                              </div>
                              <span
                                 className="tw:inline-block tw:mt-0.5 tw:text-[9px] tw:font-semibold tw:uppercase tw:tracking-[0.04em] tw:rounded tw:px-[7px] tw:py-0.5"
                                 style={{
                                    background: style.bg,
                                    color: style.color,
                                 }}
                              >
                                 {style.label}
                              </span>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
            {/* Row 1: Stat Tiles */}
            <div className="tw:col-span-1">
               <StatTile
                  label="Emails Sent"
                  value="1,247"
                  icon={Mail}
                  iconColor="var(--green)"
                  iconBg="var(--green-bg)"
                  delta="+12%"
                  deltaColor="var(--green)"
                  deltaBg="var(--green-bg)"
                  deltaLabel="vs last month"
               />
            </div>
            {/* <div className="tw:col-span-3">
          <StatTile
            label="Products"
            value="342"
            icon={Package}
            iconColor="var(--blue)"
            iconBg="var(--blue-bg)"
            delta="+8"
            deltaColor="var(--green)"
            deltaBg="var(--green-bg)"
            deltaLabel="this session"
          />
        </div>
        <div className="tw:col-span-3">
          <StatTile
            label="Users"
            value="5,891"
            icon={Users}
            iconColor="var(--amber)"
            iconBg="var(--amber-bg)"
            delta="+3%"
            deltaColor="var(--green)"
            deltaBg="var(--green-bg)"
            deltaLabel="vs last month"
          />
        </div> */}
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

            {/* <div className="tw:col-span-1 tw:rounded-[10px] tw:bg-card tw:transition-all tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:tw:-translate-y-px">
               <div className="tw:flex tw:items-center tw:justify-between tw:px-[18px] tw:pt-3.5 tw:pb-2.5">
                  <span className="tw:text-[13px] tw:font-semibold tw:tracking-[-0.01em]">
                     Delivery Rate
                  </span>
                  <span className="tw:text-[11px] tw:text-secondary-foreground">
                     Details
                  </span>
               </div>
               <DeliveryRing percentage={78} />
            </div> */}

            {/* Row 3: Sessions + Catalog */}
            {/* <div className="tw:col-span-5 tw:rounded-[10px] tw:bg-card tw:transition-all tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:tw:-translate-y-px">
              <div className="tw:flex tw:items-center tw:justify-between tw:px-[18px] tw:pt-3.5 tw:pb-2.5">
                 <span className="tw:text-[13px] tw:font-semibold tw:tracking-[-0.01em]">
                    Exam Sessions
                 </span>
                 <Link
                    to="/admin/exam-sessions"
                    className="tw:text-[11px] tw:font-medium tw:text-primary tw:no-underline hover:tw:text-[var(--primary-hover)]"
                 >
                    Manage →
                 </Link>
              </div>
              <SessionTimeline
                 sessions={[
                    {
                       name: "September 2025",
                       dates: "1 Sep — 14 Sep 2025",
                       status: "active",
                    },
                    {
                       name: "April 2026",
                       dates: "1 Apr — 15 Apr 2026",
                       status: "upcoming",
                    },
                    {
                       name: "September 2026",
                       dates: "1 Sep — 14 Sep 2026",
                       status: "draft",
                    },
                 ]}
              />
           </div>

           <div className="tw:col-span-7 tw:rounded-[10px] tw:bg-card tw:transition-all tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:tw:-translate-y-px">
              <div className="tw:px-[18px] tw:pt-3.5 tw:pb-2.5">
                 <span className="tw:text-[13px] tw:font-semibold tw:tracking-[-0.01em]">
                    Catalog at a Glance
                 </span>
              </div>
              <CatalogSummary
                 items={[
                    { label: "Subjects", value: 34 },
                    { label: "Sessions", value: 12 },
                    { label: "Products", value: 342 },
                    { label: "Bundles", value: 28 },
                 ]}
              />
           </div> */}
         </div>
      </div>
   );
}
