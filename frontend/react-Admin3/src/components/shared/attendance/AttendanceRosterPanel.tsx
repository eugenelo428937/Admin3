import { Input } from '../../admin/ui/input';
import AttendanceStatusSelect from './AttendanceStatusSelect';
import type useAttendanceVM from './useAttendanceVM';

interface Props {
  vm: ReturnType<typeof useAttendanceVM>;
  onUploadXlsx?: (file: File) => Promise<void>;
  disabled?: boolean;
}

/**
 * Shared roster panel — rendered inside the admin AttendanceModal and the
 * public InstructorAttendancePage. Owns the 2-column grid, the per-row
 * select + conditional reason input, and the (optional) upload button.
 * Does NOT render Save or any page chrome; the parent supplies that.
 */
export default function AttendanceRosterPanel({ vm, onUploadXlsx, disabled }: Props) {
  return (
    <div>
      {onUploadXlsx && (
        <div className="tw:flex tw:justify-end tw:mb-2">
          {/* Real upload UI wired in Task 19. */}
          <button
            type="button"
            disabled
            className="tw:rounded-md tw:border tw:px-3 tw:py-1 tw:text-sm tw:opacity-60"
          >
            Upload xlsx
          </button>
        </div>
      )}

      {vm.isLoading && (
        <div data-testid="attendance-skeleton" className="tw:space-y-2 tw:p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="tw:h-8 tw:animate-pulse tw:rounded tw:bg-muted" />
          ))}
        </div>
      )}

      {!vm.isLoading && vm.error && vm.roster.length === 0 && (
        <div className="tw:p-4 tw:text-sm tw:text-destructive">{vm.error}</div>
      )}

      {!vm.isLoading && !vm.error && vm.roster.length === 0 && (
        <div className="tw:p-8 tw:text-center tw:text-sm tw:text-muted-foreground">
          No students enrolled in this session.
        </div>
      )}

      {!vm.isLoading && vm.roster.length > 0 && (
        <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:gap-x-4 tw:px-2">
          {vm.roster.map(row => {
            const showReason = row.status === 'OTHER';
            const invalidReason = showReason && !row.reason.trim();
            const error = vm.rowErrors[row.registration_id];
            const rowDisabled = disabled || !vm.attendanceEnabled || vm.isSaving;
            return (
              <div
                key={row.registration_id}
                className={`tw:border-b tw:py-2${error ? ' tw:border-destructive' : ''}`}
              >
                <div className="tw:flex tw:flex-row tw:flex-nowrap tw:items-center tw:gap-3">
                  <div className="tw:flex-1 tw:min-w-0 tw:truncate tw:text-sm">
                    {row.student.last_name}, {row.student.first_name} ({row.student.student_ref})
                  </div>
                  <div className="tw:w-44 tw:shrink-0">
                    <AttendanceStatusSelect
                      value={row.status}
                      onChange={s => vm.setStatus(row.registration_id, s)}
                      disabled={rowDisabled}
                    />
                  </div>
                </div>
                {showReason && (
                  <div className="tw:mt-2">
                    <Input
                      placeholder="Reason (required)"
                      value={row.reason}
                      disabled={rowDisabled}
                      aria-invalid={invalidReason || undefined}
                      className={invalidReason ? 'tw:border-destructive' : undefined}
                      onChange={e => vm.setReason(row.registration_id, e.target.value)}
                    />
                  </div>
                )}
                {error && (
                  <div className="tw:mt-1 tw:text-xs tw:text-destructive">{error}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
