import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { toast } from 'sonner';
import useAttendanceVM from './useAttendanceVM';
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
  const vm = useAttendanceVM(session.id);

  const canSave = vm.attendanceEnabled && vm.hasDirty && !vm.hasInvalidOther && !vm.isSaving;

  async function handleSave() {
    try {
      await vm.save();
      toast.success('Attendance saved');
      onSaved();
    } catch {
      if (vm.error) toast.error(vm.error);
      else toast.error('Save failed — please try again.');
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
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

          {!vm.isLoading && vm.error && (
            <div className="p-4 text-sm text-destructive">{vm.error}</div>
          )}

          {!vm.isLoading && !vm.error && vm.roster.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students enrolled in this session.
            </div>
          )}

          {!vm.isLoading && !vm.error && vm.roster.length > 0 && (
            <div className="px-2">
              {vm.roster.map(row => (
                <AttendanceRosterRow
                  key={row.registration_id}
                  row={row}
                  disabled={!vm.attendanceEnabled || vm.isSaving}
                  onStatusChange={s => vm.setStatus(row.registration_id, s)}
                  onReasonChange={r => vm.setReason(row.registration_id, r)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {vm.roster.length > 0 && (
            <Button disabled={!canSave} onClick={handleSave}>
              {vm.isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
