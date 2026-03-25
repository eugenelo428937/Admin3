import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth() as any;
  const firstName = user?.first_name || 'Admin';

  return (
    <div>
      <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-[var(--foreground)]">
        Dashboard
      </h1>
      <p className="tw:text-[var(--muted-foreground)] tw:mt-1">
        Welcome back, {firstName}.
      </p>

      <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:mt-6 md:tw:grid-cols-3">
        {['Total Orders', 'Active Sessions', 'Pending Items'].map((title) => (
          <div
            key={title}
            className="tw:rounded-lg tw:border tw:border-[var(--border)] tw:bg-[var(--card)] tw:p-6"
          >
            <p className="tw:text-sm tw:text-[var(--muted-foreground)]">{title}</p>
            <p className="tw:text-2xl tw:font-bold tw:text-[var(--foreground)] tw:mt-1">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
