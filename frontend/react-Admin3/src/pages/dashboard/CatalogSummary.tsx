interface CatalogItem {
  label: string;
  value: number;
}

interface CatalogSummaryProps {
  items: CatalogItem[];
}

export function CatalogSummary({ items }: CatalogSummaryProps) {
  return (
    <div className="tw:grid tw:grid-cols-4 tw:gap-2 tw:px-[18px] tw:pb-3.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="tw:rounded-lg tw:bg-[rgba(0,0,0,0.02)] tw:p-3 tw:text-center"
        >
          <div className="tw:text-xl tw:font-bold tw:tracking-[-0.02em]">
            {item.value}
          </div>
          <div className="tw:text-[9px] tw:uppercase tw:tracking-[0.06em] tw:text-secondary-foreground tw:mt-0.5">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
