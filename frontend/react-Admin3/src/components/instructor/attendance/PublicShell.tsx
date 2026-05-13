import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * Stripped layout for the public instructor attendance page.
 * Keeps the body focused on the roster — no Redux, no auth-aware
 * chrome, no admin navigation. Surfaces a small site header so the
 * tutor knows where they are.
 */
export default function PublicShell({ children }: Props) {
  return (
    <div className="tw:min-h-screen tw:bg-background">
      <header className="tw:border-b tw:px-6 tw:py-3 tw:text-sm tw:font-semibold">
        ActEd — Tutorial Attendance
      </header>
      <main className="tw:mx-auto tw:max-w-4xl tw:p-6">{children}</main>
    </div>
  );
}
