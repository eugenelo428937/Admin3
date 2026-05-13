// Types mirror the backend admin event/attendance contract.

export interface SubjectMini {
  code: string;
  description: string;
}

export interface SittingMini {
  id: number;
  session_code: string;
  start_date: string;
  end_date: string;
}

export interface LocationMini {
  id: number;
  name: string;
}

export interface VenueMini {
  id: number;
  name: string;
}

export interface InstructorMini {
  id: number;
  name: string;
}

export interface SessionEmbedded {
  id: number;
  title: string;
  sequence: number;
  start_date: string;
  end_date: string;
  venue: VenueMini | null;
  instructors: InstructorMini[];
  enrolled_count: number;
}

export interface EventDTO {
  id: number;
  code: string;
  subject: SubjectMini | null;
  exam_session: SittingMini | null;
  start_date: string;
  end_date: string;
  location: LocationMini | null;
  venue: VenueMini | null;
  main_instructor: InstructorMini | null;
  all_instructors: InstructorMini[];
  finalisation_date: string | null;
  enrolled_distinct: number;
  sessions: SessionEmbedded[];
}

export interface PaginatedEvents {
  count: number;
  next: string | null;
  previous: string | null;
  results: EventDTO[];
}

export interface FilterOptions {
  subjects: SubjectMini[];
  locations: LocationMini[];
  venues: VenueMini[];
  instructors: InstructorMini[];
  sittings: SittingMini[];
  event_codes: string[];
}

export type {
  AttendanceStatus,
  StudentMini,
  RosterRowDTO,
  AttendancePayload,
  AttendanceSaveItem,
  AttendanceService,
  SessionLite,
} from '../../shared/attendance/types';

// SessionDetail is an alias for SessionLite kept for backward compatibility
export type { SessionLite as SessionDetail } from '../../shared/attendance/types';

export interface EventFilters {
  subject_codes: string[];
  code: string;
  start_from: string | null;
  start_to: string | null;
  location_ids: number[];
  venue_ids: number[];
  instructor_id: number | null;
  finalisation_from: string | null;
  finalisation_to: string | null;
  sitting_id: number | 'all' | null;
}
