interface Props {
  title: string;
  date: string;
  instructorName?: string;
  venue?: string | null;
  location?: string | null;
}

function formatStart(date: string): string {
  return date ? new Date(date).toLocaleString() : '—';
}

/**
 * Three-row session info header per spec:
 *   row 1: session title + date
 *   row 2: instructor name
 *   row 3: venue · location
 */
export default function SessionInfoCard({
  title, date, instructorName, venue, location,
}: Props) {
  return (
    <div className="tw:mb-4 tw:rounded-lg tw:border tw:p-4">
      <div className="tw:grid tw:grid-cols-1 tw:gap-1 tw:text-sm">
        <div>
          <span className="tw:font-semibold">{title}</span> · {formatStart(date)}
        </div>
        <div>Instructor: {instructorName || '—'}</div>
        <div>
          {venue || '—'}
          {location ? ` · ${location}` : ''}
        </div>
      </div>
    </div>
  );
}
