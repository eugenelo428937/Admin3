import PublicShell from './PublicShell';

export default function InvalidLinkScreen() {
  return (
    <PublicShell>
      <div className="tw:text-center tw:p-8">
        <h1 className="tw:text-lg tw:font-semibold">Invalid link</h1>
        <p className="tw:mt-2 tw:text-sm tw:text-muted-foreground">
          This attendance link could not be verified. Please use the link from your reminder email.
        </p>
      </div>
    </PublicShell>
  );
}
