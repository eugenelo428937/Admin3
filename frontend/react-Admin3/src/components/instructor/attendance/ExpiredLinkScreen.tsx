import PublicShell from './PublicShell';

export default function ExpiredLinkScreen() {
  return (
    <PublicShell>
      <div className="tw:text-center tw:p-8">
        <h1 className="tw:text-lg tw:font-semibold">This link has expired</h1>
        <p className="tw:mt-2 tw:text-sm tw:text-muted-foreground">
          Attendance links are valid for 7 days. Contact the tutorials team to request a new one.
        </p>
      </div>
    </PublicShell>
  );
}
