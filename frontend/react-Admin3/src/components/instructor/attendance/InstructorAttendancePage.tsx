import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../admin/ui/button';
import useAttendanceVM, {
  AttendanceSaveError,
} from '../../shared/attendance/useAttendanceVM';
import AttendanceRosterPanel from '../../shared/attendance/AttendanceRosterPanel';
import { makeInstructorAttendanceService } from '../../../services/instructor/instructorAttendanceService';
import PublicShell from './PublicShell';
import SessionInfoCard from './SessionInfoCard';
import ExpiredLinkScreen from './ExpiredLinkScreen';
import InvalidLinkScreen from './InvalidLinkScreen';

/**
 * Magic-link landing page for tutors to record attendance without logging in.
 *
 * Route: /instructor/attendance/:token
 *
 * Routing notes
 * -------------
 * The token is path-segment encoded (not a query param) so it does not
 * appear in HTTP Referer headers when the page navigates. The backend
 * verifies the HMAC + 7-day max_age; verification failures are surfaced
 * via vm.tokenError so we can show the right empty screen.
 */
export default function InstructorAttendancePage() {
  const { token = '' } = useParams<{ token: string }>();
  const service = useMemo(
    () => makeInstructorAttendanceService(token),
    [token],
  );
  const vm = useAttendanceVM(service);

  if (vm.tokenError === 'expired') return <ExpiredLinkScreen />;
  if (vm.tokenError === 'invalid') return <InvalidLinkScreen />;

  async function handleSave() {
    try {
      await vm.save();
      toast.success('Attendance saved');
    } catch (e) {
      if (e instanceof AttendanceSaveError) {
        if (Object.keys(e.rowErrors).length > 0) {
          toast.error('Some entries are invalid.');
          return;
        }
        toast.error(e.message || 'Save failed — please try again.');
        return;
      }
      toast.error(vm.error || 'Save failed — please try again.');
    }
  }

  return (
    <PublicShell>
      {vm.session && (
        <SessionInfoCard
          title={vm.session.title}
          date={vm.session.start_date}
          instructorName={vm.instructor?.name}
          venue={vm.session.venue?.name}
          location={vm.session.location?.name}
        />
      )}
      <AttendanceRosterPanel
        vm={vm}
        onUploadXlsx={async (file) => {
          try {
            const refreshed = await service.uploadXlsx(file);
            vm.replaceFromServer(refreshed);
            const s = refreshed.upload_summary;
            const errSuffix = s.errors?.length
              ? ` (${s.errors.length} row error${s.errors.length === 1 ? '' : 's'})`
              : '';
            toast.success(`Uploaded — ${s.rows_applied} rows applied${errSuffix}`);
          } catch (e: any) {
            const code = e?.response?.data?.code;
            if (code === 'too_large') toast.error('File too large (max 2 MB).');
            else if (code === 'wrong_mime') toast.error('Not a valid xlsx file.');
            else if (code === 'token_expired') toast.error('Link expired.');
            else toast.error('Upload failed — please try again.');
          }
        }}
      />
      <div className="tw:mt-4 tw:flex tw:justify-end">
        <Button disabled={!vm.canSave} onClick={handleSave}>
          {vm.isSaving ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>
    </PublicShell>
  );
}
