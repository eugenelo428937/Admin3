import type { LucideIcon } from 'lucide-react';

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  delta?: string;
  deltaColor?: string;
  deltaBg?: string;
  deltaLabel?: string;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  delta,
  deltaColor,
  deltaBg,
  deltaLabel,
}: StatTileProps) {
  return (
     <div className="tw:rounded-[10px] tw:aspect-auto tw:bg-card tw:p-[18px] tw:transition-all tw:duration-200 hover:tw:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:tw:-translate-y-px">
        <div className="tw:flex tw:items-center tw:justify-between tw:mb-2.5">
           <span className="tw:text-base tw:font-medium tw:text-muted-foreground">
              {label}
           </span>
           <div
              className="tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-[6px]"
              style={{ background: iconBg }}
           >
              <Icon size={13} style={{ color: iconColor }} />
           </div>
        </div>
        <div className="tw:text-[28px] tw:font-bold tw:tracking-[-0.04em] tw:leading-none">
           {value}
        </div>
        {delta && (
           <div className="tw:flex tw:items-center tw:gap-1.5 tw:mt-2 tw:text-[10px] tw:text-secondary-foreground">
              <span
                 className="tw:font-semibold tw:rounded tw:px-1.5 tw:py-px"
                 style={{ background: deltaBg, color: deltaColor }}
              >
                 {delta}
              </span>
              {deltaLabel}
           </div>
        )}
     </div>
  );
}
