import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  AdminPage, AdminPageHeader, AdminPagination,
} from '../composed';
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import useTutorialEventListVM from './useTutorialEventListVM';
import TutorialEventFilterBar from './TutorialEventFilterBar';
import TutorialEventRow from './TutorialEventRow';
import AttendanceModal from './AttendanceModal';

export default function TutorialEventList() {
  const { isSuperuser } = useAuth();
  const vm = useTutorialEventListVM();

  if (!isSuperuser) return <Navigate to="/" replace />;

  // AdminPagination is 0-based; VM pagination.page is 1-based.
  const zeroBasedPage = vm.pagination.page - 1;

  return (
    <AdminPage>
      <AdminPageHeader title="Tutorials" />

      <TutorialEventFilterBar vm={vm} />

      {vm.error && (
        <div className="tw:my-4 tw:rounded tw:border tw:border-destructive tw:p-3 tw:text-sm tw:text-destructive">
          {vm.error}
          <button className="tw:ml-2 tw:underline" onClick={vm.retry}>Retry</button>
        </div>
      )}

      <div className="tw:rounded-[10px] tw:bg-card tw:py-2 tw:px-6">
        <Table className="tw:w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="tw:w-8"></TableHead>
              <TableHead className="tw:text-center">Code</TableHead>
              <TableHead className="tw:text-center">Start</TableHead>
              <TableHead className="tw:text-center">End</TableHead>
              <TableHead className="tw:text-center">Venue</TableHead>
              <TableHead className="tw:text-center">Instructor</TableHead>
              <TableHead className="tw:text-center">Enrolled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.events.length === 0 && !vm.isLoading && (
              <TableRow>
                <td colSpan={7} className="tw:p-8 tw:text-center tw:text-sm tw:text-muted-foreground">
                  No events match the current filters.
                </td>
              </TableRow>
            )}
            {vm.events.map(ev => (
              <TutorialEventRow
                key={ev.id}
                event={ev}
                expanded={vm.isExpanded(ev.id)}
                onToggle={() => vm.toggleExpanded(ev.id)}
                onOpenAttendance={vm.openAttendance}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        page={zeroBasedPage}
        pageSize={vm.pagination.pageSize}
        total={vm.count}
        onPageChange={(_e, newPage) =>
          vm.setPagination({ ...vm.pagination, page: newPage + 1 })
        }
      />

      {vm.attendanceTarget && (
        <AttendanceModal
          session={vm.attendanceTarget}
          onClose={vm.closeAttendance}
          onSaved={vm.handleAttendanceSaved}
        />
      )}
    </AdminPage>
  );
}
