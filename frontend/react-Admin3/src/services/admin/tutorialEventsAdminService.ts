import httpService from '../httpService';
import type {
  AttendancePayload,
  AttendanceSaveItem,
  EventFilters,
  FilterOptions,
  PaginatedEvents,
} from '../../components/admin/tutorial-events/types';
import type { AttendanceService } from '../../components/shared/attendance/types';

function buildEventParams(
  filters: EventFilters,
  ordering: string,
  page: number,
  pageSize: number,
): Record<string, string> {
  const out: Record<string, string> = {
    page: String(page),
    page_size: String(pageSize),
  };
  if (ordering) out.ordering = ordering;
  if (filters.subject_codes.length) out.subject_codes = filters.subject_codes.join(',');
  if (filters.code) out.code = filters.code;
  if (filters.start_from) out.start_from = filters.start_from;
  if (filters.start_to) out.start_to = filters.start_to;
  if (filters.location_ids.length) out.location_ids = filters.location_ids.join(',');
  if (filters.venue_ids.length) out.venue_ids = filters.venue_ids.join(',');
  if (filters.instructor_id != null) out.instructor_id = String(filters.instructor_id);
  if (filters.finalisation_from) out.finalisation_from = filters.finalisation_from;
  if (filters.finalisation_to) out.finalisation_to = filters.finalisation_to;
  if (filters.sitting_id !== null) out.sitting_id = String(filters.sitting_id);
  return out;
}

const tutorialEventsAdminService = {
  listEvents(
    filters: EventFilters,
    ordering: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedEvents> {
    const params = buildEventParams(filters, ordering, page, pageSize);
    return httpService.get('/api/tutorials/admin/events/', { params }).then(r => r.data);
  },

  filterOptions(): Promise<FilterOptions> {
    return httpService
      .get('/api/tutorials/admin/events/filter-options/')
      .then(r => r.data);
  },

  getAttendance(sessionId: number): Promise<AttendancePayload> {
    return httpService
      .get(`/api/tutorials/admin/sessions/${sessionId}/attendance/`)
      .then(r => r.data);
  },

  saveAttendance(
    sessionId: number,
    items: AttendanceSaveItem[],
  ): Promise<AttendancePayload> {
    return httpService
      .post(`/api/tutorials/admin/sessions/${sessionId}/attendance/`, { items })
      .then(r => r.data);
  },
};

export function makeAdminAttendanceService(sessionId: number): AttendanceService {
  return {
    get: () => tutorialEventsAdminService.getAttendance(sessionId),
    save: (items) => tutorialEventsAdminService.saveAttendance(sessionId, items),
  };
}

export default tutorialEventsAdminService;
