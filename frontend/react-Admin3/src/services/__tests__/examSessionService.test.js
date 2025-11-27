/**
 * Tests for examSessionService
 *
 * @module services/__tests__/examSessionService.test
 *
 * Tests exam session operations including:
 * - getAll: Fetch all exam sessions
 * - getById: Fetch specific exam session
 * - create: Create new exam session
 * - update: Update exam session
 * - delete: Delete exam session
 */

describe('examSessionService', () => {
  let examSessionService;
  let httpService;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        examSessionUrl: 'http://test-api/exam-sessions',
        examSessionSubjectUrl: 'http://test-api/exam-session-subjects',
      },
    }));

    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
      },
    }));

    examSessionService = require('../examSessionService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getAll', () => {
    test('should fetch all exam sessions and return array', async () => {
      const mockSessions = [
        { id: 1, name: 'April 2025' },
        { id: 2, name: 'September 2025' },
      ];
      httpService.get.mockResolvedValue({ data: mockSessions });

      const result = await examSessionService.getAll();

      expect(result).toEqual(mockSessions);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/exam-sessions/');
    });

    test('should return results from paginated response', async () => {
      const mockSessions = [{ id: 1, name: 'April 2025' }];
      httpService.get.mockResolvedValue({ data: { results: mockSessions } });

      const result = await examSessionService.getAll();

      expect(result).toEqual(mockSessions);
    });

    test('should return Object.values for object response', async () => {
      const mockSessions = {
        s1: { id: 1, name: 'April 2025' },
        s2: { id: 2, name: 'September 2025' },
      };
      httpService.get.mockResolvedValue({ data: mockSessions });

      const result = await examSessionService.getAll();

      expect(result).toEqual([
        { id: 1, name: 'April 2025' },
        { id: 2, name: 'September 2025' },
      ]);
    });

    test('should return empty array when response.data is null', async () => {
      httpService.get.mockResolvedValue({ data: null });

      const result = await examSessionService.getAll();

      expect(result).toEqual([]);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Network error'));

      const result = await examSessionService.getAll();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching Exam Sessions:',
        expect.any(Error)
      );
    });
  });

  describe('getById', () => {
    test('should fetch exam session by id', async () => {
      const mockSession = { id: 123, name: 'April 2025', start_date: '2025-04-01' };
      httpService.get.mockResolvedValue({ data: mockSession });

      const result = await examSessionService.getById(123);

      expect(result).toEqual(mockSession);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/exam-sessions/123/');
    });

    test('should throw error on API failure', async () => {
      httpService.get.mockRejectedValue(new Error('Not found'));

      await expect(examSessionService.getById(999)).rejects.toThrow('Not found');
    });
  });

  describe('create', () => {
    const mockSession = { name: 'April 2025', start_date: '2025-04-01' };

    test('should create exam session and insert subjects', async () => {
      httpService.post.mockResolvedValue({ data: { id: 1, ...mockSession } });

      const result = await examSessionService.create(mockSession);

      expect(result).toEqual({ id: 1, ...mockSession });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/exam-sessions/',
        mockSession
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/exam-session-subjects/insert-subjects/',
        mockSession
      );
    });

    test('should throw error on creation failure', async () => {
      httpService.post.mockRejectedValue(new Error('Creation failed'));

      await expect(examSessionService.create(mockSession)).rejects.toThrow('Creation failed');
    });
  });

  describe('update', () => {
    const mockSession = { name: 'April 2025 Updated' };

    test('should update exam session', async () => {
      httpService.put.mockResolvedValue({ data: { id: 1, ...mockSession } });

      const result = await examSessionService.update(1, mockSession);

      expect(result).toEqual({ id: 1, ...mockSession });
      expect(httpService.put).toHaveBeenCalledWith(
        'http://test-api/exam-sessions/1/',
        mockSession
      );
    });

    test('should throw error on update failure', async () => {
      httpService.put.mockRejectedValue(new Error('Update failed'));

      await expect(examSessionService.update(1, mockSession)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    test('should delete exam session', async () => {
      httpService.delete.mockResolvedValue({});

      await examSessionService.delete(1);

      expect(httpService.delete).toHaveBeenCalledWith('http://test-api/exam-sessions1/');
    });

    test('should throw error on delete failure', async () => {
      httpService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(examSessionService.delete(1)).rejects.toThrow('Delete failed');
    });
  });
});
