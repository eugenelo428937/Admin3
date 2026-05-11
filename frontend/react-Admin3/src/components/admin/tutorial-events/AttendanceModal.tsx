import { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { toast } from 'sonner';
import useAttendanceVM, { AttendanceSaveError } from '../../shared/attendance/useAttendanceVM';
import { makeAdminAttendanceService } from '../../../services/admin/tutorialEventsAdminService';
import AttendanceRosterRow from './AttendanceRosterRow';

interface SessionLite {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: { id: number; name: string } | null;
  tutorial_event: { id: number; code: string };
}

interface Props {
  session: SessionLite;
  onClose: () => void;
  onSaved: () => void;
}

function formatDateRange(start: string, end: string): string {
  if (!start) return '—';
  const s = new Date(start).toLocaleString();
  const e = end ? new Date(end).toLocaleString() : '';
  return e ? `${s} – ${e}` : s;
}

export default function AttendanceModal({ session, onClose, onSaved }: Props) {
  const service = useMemo(() => makeAdminAttendanceService(session.id), [session.id]);
  const vm = useAttendanceVM(service);

  async function handleSave() {
    try {
      await vm.save();
      toast.success('Attendance saved');
      onSaved();
    } catch (e) {
      if (e instanceof AttendanceSaveError) {
        if (e.code === 'not_yet_open') {
          toast.error('Session not started yet.');
          onClose();
          return;
        }
        if (Object.keys(e.rowErrors).length > 0) {
          toast.error('Some entries are invalid.');
          return;
        }
        toast.error(e.message || 'Save failed — please try again.');
        return;
      }
      if (vm.error) toast.error(vm.error);
      else toast.error('Save failed — please try again.');
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="tw:sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>
            {formatDateRange(session.start_date, session.end_date)}
            {session.venue ? ` • ${session.venue.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {vm.isLoading && (
            <div data-testid="attendance-skeleton" className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {!vm.isLoading && vm.error && vm.roster.length === 0 && (
            <div className="p-4 text-sm text-destructive">{vm.error}</div>
          )}

          {!vm.isLoading && !vm.error && vm.roster.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students enrolled in this session.
            </div>
          )}

          {!vm.isLoading && vm.roster.length > 0 && (
            <div className="tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:gap-x-4 tw:px-2">
              {vm.roster.map(row => (
                <AttendanceRosterRow
                  key={row.registration_id}
                  row={row}
                  disabled={!vm.attendanceEnabled || vm.isSaving}
                  onStatusChange={s => vm.setStatus(row.registration_id, s)}
                  onReasonChange={r => vm.setReason(row.registration_id, r)}
                  error={vm.rowErrors[row.registration_id]}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {vm.roster.length > 0 && (
            <Button disabled={!vm.canSave} onClick={handleSave}>
              {vm.isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
