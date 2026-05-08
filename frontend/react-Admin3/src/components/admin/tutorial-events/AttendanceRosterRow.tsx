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
}

export default function AttendanceRosterRow({
  row, onStatusChange, onReasonChange, disabled,
}: Props) {
  const showReason = row.status === 'OTHER';
  const invalidReason = showReason && !row.reason.trim();
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b py-2">
      <div className="col-span-5 text-sm">
        {row.student.last_name}, {row.student.first_name} ({row.student.student_ref})
      </div>
      <div className="col-span-3">
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
      <div className="col-span-4">
        {showReason && (
          <Input
            placeholder="Reason (required)"
            value={row.reason}
            disabled={disabled}
            aria-invalid={invalidReason || undefined}
            className={invalidReason ? 'border-destructive' : undefined}
            onChange={e => onReasonChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
