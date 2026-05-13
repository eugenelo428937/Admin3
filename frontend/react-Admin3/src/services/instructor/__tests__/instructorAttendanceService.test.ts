import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeInstructorAttendanceService } from '../instructorAttendanceService';
import httpService from '../../httpService';

vi.mock('../../httpService', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockedHttp = httpService as unknown as { get: any; post: any };

describe('makeInstructorAttendanceService', () => {
  beforeEach(() => {
    mockedHttp.get.mockReset();
    mockedHttp.post.mockReset();
  });

  it('get() calls /api/tutorials/public/attendance/<token>/', async () => {
    mockedHttp.get.mockResolvedValue({ data: { session: {}, registrations: [] } });
    const svc = makeInstructorAttendanceService('THE-TOKEN');
    await svc.get();
    expect(mockedHttp.get).toHaveBeenCalledWith(
      '/api/tutorials/public/attendance/THE-TOKEN/',
    );
  });

  it('save() POSTs to the same URL with items', async () => {
    mockedHttp.post.mockResolvedValue({ data: { session: {}, registrations: [] } });
    const svc = makeInstructorAttendanceService('THE-TOKEN');
    await svc.save([{ registration_id: 1, status: 'ATTENDED', reason: '' }]);
    expect(mockedHttp.post).toHaveBeenCalledWith(
      '/api/tutorials/public/attendance/THE-TOKEN/',
      { items: [{ registration_id: 1, status: 'ATTENDED', reason: '' }] },
    );
  });

  it('url-encodes tokens with special characters', async () => {
    mockedHttp.get.mockResolvedValue({ data: {} });
    const svc = makeInstructorAttendanceService('abc/def:ghi');
    await svc.get();
    expect(mockedHttp.get).toHaveBeenCalledWith(
      '/api/tutorials/public/attendance/abc%2Fdef%3Aghi/',
    );
  });
});
