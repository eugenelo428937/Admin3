interface DeliveryRingProps {
  percentage: number;
}

export function DeliveryRing({ percentage }: DeliveryRingProps) {
  return (
    <div className="tw:flex tw:flex-col tw:items-center tw:justify-center tw:h-full tw:p-[18px]">
      <div
        className="tw:flex tw:size-24 tw:items-center tw:justify-center tw:rounded-full"
        style={{
          background: `conic-gradient(var(--primary) 0% ${percentage}%, rgba(0,0,0,0.05) ${percentage}% 100%)`,
        }}
      >
        <div className="tw:flex tw:size-[72px] tw:flex-col tw:items-center tw:justify-center tw:rounded-full tw:bg-card">
          <span className="tw:text-lg tw:font-bold tw:tracking-[-0.02em]">
            {percentage}%
          </span>
          <span className="tw:text-[9px] tw:uppercase tw:tracking-[0.04em] tw:text-secondary-foreground">
            Delivered
          </span>
        </div>
      </div>
      <div className="tw:flex tw:gap-3 tw:mt-2.5">
        <div className="tw:flex tw:items-center tw:gap-1 tw:text-[10px] tw:text-muted-foreground">
          <div className="tw:size-1.5 tw:rounded-full tw:bg-primary" />
          Delivered
        </div>
        <div className="tw:flex tw:items-center tw:gap-1 tw:text-[10px] tw:text-muted-foreground">
          <div className="tw:size-1.5 tw:rounded-full tw:bg-[rgba(0,0,0,0.08)]" />
          Pending
        </div>
      </div>
    </div>
  );
}
