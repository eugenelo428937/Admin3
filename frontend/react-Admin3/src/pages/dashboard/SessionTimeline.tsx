interface Session {
  name: string;
  dates: string;
  status: 'active' | 'upcoming' | 'draft';
}

const STATUS_STYLES = {
  active: { bg: 'var(--green-bg)', color: 'var(--green)', label: 'Active' },
  upcoming: { bg: 'var(--blue-bg)', color: 'var(--blue)', label: 'Upcoming' },
  draft: { bg: 'rgba(0,0,0,0.03)', color: 'var(--secondary-foreground)', label: 'Draft' },
} as const;

interface SessionTimelineProps {
  sessions: Session[];
}

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  return (
    <div className="tw:px-[18px] tw:pb-3.5">
      {sessions.map((session, i) => {
        const style = STATUS_STYLES[session.status];
        return (
          <div
            key={session.name}
            className={`tw:flex tw:gap-2.5 tw:py-2 ${i > 0 ? 'tw:border-t tw:border-[var(--border)]' : ''}`}
          >
            <div
              className={`tw:mt-1 tw:size-[7px] tw:rounded-full tw:shrink-0 ${
                session.status === 'active'
                  ? 'tw:bg-primary tw:shadow-[0_0_6px_var(--accent-glow-wide)]'
                  : 'tw:bg-[rgba(0,0,0,0.1)]'
              }`}
            />
            <div className="tw:flex-1">
              <div className="tw:text-xs tw:font-semibold">{session.name}</div>
              <div className="tw:text-[10px] tw:text-secondary-foreground tw:mt-px">
                {session.dates}
              </div>
            </div>
            <span
              className="tw:self-start tw:mt-0.5 tw:text-[9px] tw:font-semibold tw:uppercase tw:tracking-[0.04em] tw:rounded tw:px-[7px] tw:py-0.5"
              style={{ background: style.bg, color: style.color }}
            >
              {style.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
