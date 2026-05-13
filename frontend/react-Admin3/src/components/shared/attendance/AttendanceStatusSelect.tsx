import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../admin/ui/select';
import type { AttendanceStatus } from './types';
import {
  ATTENDANCE_STATUS_TOKENS, ATTENDANCE_STATUS_VALUES,
} from './attendanceStatusTokens';

interface Props {
  value: AttendanceStatus | '';
  onChange: (value: AttendanceStatus) => void;
  disabled?: boolean;
}

export default function AttendanceStatusSelect({ value, onChange, disabled }: Props) {
  return (
    <Select
      value={value || undefined}
      onValueChange={v => onChange(v as AttendanceStatus)}
      disabled={disabled}
    >
      <SelectTrigger data-status={value || undefined}>
        <SelectValue placeholder="Set status" />
      </SelectTrigger>
      <SelectContent>
        {ATTENDANCE_STATUS_VALUES.map(s => (
          <SelectItem key={s} value={s} data-attendance-option={s}>
            {ATTENDANCE_STATUS_TOKENS[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
