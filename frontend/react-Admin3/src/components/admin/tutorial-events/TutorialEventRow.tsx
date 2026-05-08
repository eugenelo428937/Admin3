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
        <TableCell className="w-8">
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={onToggle}
          >
            <Chev className="h-4 w-4" />
          </Button>
        </TableCell>
        <TableCell className="font-mono">{event.code}</TableCell>
        <TableCell>{formatDate(event.start_date)}</TableCell>
        <TableCell>{formatDate(event.end_date)}</TableCell>
        <TableCell>{event.venue?.name ?? '—'}</TableCell>
        <TableCell>{formatInstructorList(event)}</TableCell>
        <TableCell className="text-right">{event.enrolled_distinct}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={COL_COUNT} className="bg-muted/40">
            {event.sessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No sessions scheduled.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Title</th>
                    <th className="px-2 py-1">Start</th>
                    <th className="px-2 py-1">End</th>
                    <th className="px-2 py-1">Venue</th>
                    <th className="px-2 py-1 text-right">Enrolled</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {event.sessions.map(s => {
                    const start = new Date(s.start_date);
                    const enabled = !Number.isNaN(start.getTime()) && start.getTime() <= Date.now();
                    return (
                      <tr key={s.id}>
                        <td className="px-2 py-1">{s.title}</td>
                        <td className="px-2 py-1">{formatDate(s.start_date)}</td>
                        <td className="px-2 py-1">{formatDate(s.end_date)}</td>
                        <td className="px-2 py-1">{s.venue?.name ?? '—'}</td>
                        <td className="px-2 py-1 text-right">{s.enrolled_count}</td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
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
