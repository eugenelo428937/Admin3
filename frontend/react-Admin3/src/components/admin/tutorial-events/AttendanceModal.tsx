import { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { toast } from 'sonner';
import useAttendanceVM, { AttendanceSaveError } from '../../shared/attendance/useAttendanceVM';
import AttendanceRosterPanel from '../../shared/attendance/AttendanceRosterPanel';
import { makeAdminAttendanceService } from '../../../services/admin/tutorialEventsAdminService';

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

        <div className="tw:max-h-[60vh] tw:overflow-y-auto">
          <AttendanceRosterPanel vm={vm} />
        </div>

        <DialogFooter className="tw:flex tw:justify-between">
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
