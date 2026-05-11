import { Input } from '@/components/admin/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/admin/ui/select';
import type { AttendanceStatus } from './types';
import type { RosterRow } from './useAttendanceVM';

interface Props {
  row: RosterRow;
  onStatusChange: (status: AttendanceStatus) => void;
  onReasonChange: (reason: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function AttendanceRosterRow({
  row, onStatusChange, onReasonChange, disabled, error,
}: Props) {
  const showReason = row.status === 'OTHER';
  const invalidReason = showReason && !row.reason.trim();
  return (
    <div className={`tw:border-b tw:py-2${error ? ' tw:border-destructive' : ''}`}>
      <div className="tw:flex tw:flex-row tw:flex-nowrap tw:items-center tw:gap-3">
        <div className="tw:flex-1 tw:min-w-0 tw:truncate tw:text-sm">
          {row.student.last_name}, {row.student.first_name} ({row.student.student_ref})
        </div>
        <div className="tw:w-44 tw:shrink-0">
          <Select
            value={row.status}
            onValueChange={v => onStatusChange(v as AttendanceStatus)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ATTENDED">Attended</SelectItem>
              <SelectItem value="ABSENT">Absent</SelectItem>
              <SelectItem value="LATE">Late</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {showReason && (
        <div className="tw:mt-2">
          <Input
            placeholder="Reason (required)"
            value={row.reason}
            disabled={disabled}
            aria-invalid={invalidReason || undefined}
            className={invalidReason ? 'tw:border-destructive' : undefined}
            onChange={e => onReasonChange(e.target.value)}
          />
        </div>
      )}
      {error && (
        <div className="tw:mt-1 tw:text-xs tw:text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
