import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { TableRow, TableCell } from '@/components/admin/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/admin/ui/dropdown-menu';
import type { EventDTO, SessionEmbedded } from './types';

const COL_COUNT = 7;

function formatInstructorList(event: EventDTO): string {
  const all = event.all_instructors;
  if (!all.length) return '—';
  const head = all[0].name;
  return all.length > 1 ? `${head} +${all.length - 1}` : head;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

interface ModalSession {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: SessionEmbedded['venue'];
  tutorial_event: { id: number; code: string };
}

interface Props {
  event: EventDTO;
  expanded: boolean;
  onToggle: () => void;
  onOpenAttendance: (session: ModalSession) => void;
}

export default function TutorialEventRow({ event, expanded, onToggle, onOpenAttendance }: Props) {
  const Chev = expanded ? ChevronDown : ChevronRight;
  return (
    <>
      <TableRow>
        <TableCell className="tw:w-8">
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={onToggle}
          >
            <Chev className="tw:h-4 tw:w-4" />
          </Button>
        </TableCell>
        <TableCell className="tw:font-mono tw:text-center">{event.code}</TableCell>
        <TableCell className="tw:text-center">{formatDate(event.start_date)}</TableCell>
        <TableCell className="tw:text-center">{formatDate(event.end_date)}</TableCell>
        <TableCell className="tw:text-center">{event.venue?.name ?? '—'}</TableCell>
        <TableCell className="tw:text-center">{formatInstructorList(event)}</TableCell>
        <TableCell className="tw:text-center">{event.enrolled_distinct}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={COL_COUNT} className="tw:bg-muted/40 tw:p-0">
            {event.sessions.length === 0 ? (
              <div className="tw:p-4 tw:text-sm tw:text-muted-foreground">No sessions scheduled.</div>
            ) : (
              <table className="tw:w-full tw:text-sm tw:table-fixed">
                <thead>
                  <tr>
                    <th className="tw:px-3 tw:py-2 tw:text-center">Title</th>
                    <th className="tw:px-3 tw:py-2 tw:text-center">Start</th>
                    <th className="tw:px-3 tw:py-2 tw:text-center">End</th>
                    <th className="tw:px-3 tw:py-2 tw:text-center">Venue</th>
                    <th className="tw:px-3 tw:py-2 tw:text-center">Enrolled</th>
                    <th className="tw:w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {event.sessions.map(s => {
                    const start = new Date(s.start_date);
                    const enabled = !Number.isNaN(start.getTime()) && start.getTime() <= Date.now();
                    return (
                      <tr key={s.id}>
                        <td className="tw:px-3 tw:py-2 tw:text-center">{s.title}</td>
                        <td className="tw:px-3 tw:py-2 tw:text-center">{formatDate(s.start_date)}</td>
                        <td className="tw:px-3 tw:py-2 tw:text-center">{formatDate(s.end_date)}</td>
                        <td className="tw:px-3 tw:py-2 tw:text-center">{s.venue?.name ?? '—'}</td>
                        <td className="tw:px-3 tw:py-2 tw:text-center">{s.enrolled_count}</td>
                        <td className="tw:px-3 tw:py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More actions">
                                <MoreHorizontal className="tw:h-4 tw:w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!enabled}
                                onSelect={() =>
                                  enabled &&
                                  onOpenAttendance({
                                    id: s.id,
                                    title: s.title,
                                    start_date: s.start_date,
                                    end_date: s.end_date,
                                    venue: s.venue,
                                    tutorial_event: { id: event.id, code: event.code },
                                  })
                                }
                                title={
                                  enabled
                                    ? undefined
                                    : `Available from ${new Date(s.start_date).toLocaleString()}`
                                }
                              >
                                Attendance
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
