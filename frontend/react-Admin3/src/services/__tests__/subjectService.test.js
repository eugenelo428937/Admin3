/**
 * Tests for subjectService
 *
 * @module services/__tests__/subjectService.test
 *
 * Tests subject operations including:
 * - getAll: Fetch all subjects with error handling
 * - getSubjects: Fetch subjects (paginated)
 * - getById: Fetch specific subject
 * - create: Create new subject
 * - update: Update subject
 * - delete: Delete subject
 * - bulkImport: Import multiple subjects
 */

describe('subjectService', () => {
  let subjectService;
  let httpService;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        subjectUrl: 'http://test-api/subjects',
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

    subjectService = require('../subjectService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getAll', () => {
    test('should fetch all subjects and return array', async () => {
      const mockSubjects = [
        { id: 1, code: 'CM1', name: 'Actuarial Mathematics 1' },
        { id: 2, code: 'CM2', name: 'Actuarial Mathematics 2' },
      ];
      httpService.get.mockResolvedValue({ data: mockSubjects });

      const result = await subjectService.getAll();

      expect(result).toEqual(mockSubjects);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/subjects/');
    });

    test('should return results from paginated response', async () => {
      const mockSubjects = [{ id: 1, code: 'CM1' }];
      httpService.get.mockResolvedValue({ data: { results: mockSubjects } });

      const result = await subjectService.getAll();

      expect(result).toEqual(mockSubjects);
    });

    test('should return Object.values for object response', async () => {
      const mockSubjects = {
        s1: { id: 1, code: 'CM1' },
        s2: { id: 2, code: 'CM2' },
      };
      httpService.get.mockResolvedValue({ data: mockSubjects });

      const result = await subjectService.getAll();

      expect(result).toEqual([{ id: 1, code: 'CM1' }, { id: 2, code: 'CM2' }]);
    });

    test('should return empty array when response.data is null', async () => {
      httpService.get.mockResolvedValue({ data: null });

      const result = await subjectService.getAll();

      expect(result).toEqual([]);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Network error'));

      const result = await subjectService.getAll();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching subjects:',
        expect.any(Error)
      );
    });
  });

  describe('getSubjects', () => {
    test('should fetch subjects and return results', async () => {
      const mockSubjects = [{ id: 1, code: 'CM1' }];
      httpService.get.mockResolvedValue({ data: { results: mockSubjects } });

      const result = await subjectService.getSubjects();

      expect(result).toEqual(mockSubjects);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/subjects/');
    });

    test('should throw error on API failure', async () => {
      httpService.get.mockRejectedValue(new Error('API error'));

      await expect(subjectService.getSubjects()).rejects.toThrow('API error');
    });
  });

  describe('getById', () => {
    test('should fetch subject by id', async () => {
      const mockSubject = { id: 1, code: 'CM1', name: 'Actuarial Mathematics 1' };
      httpService.get.mockResolvedValue({ data: mockSubject });

      const result = await subjectService.getById(1);

      expect(result).toEqual(mockSubject);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/subjects/1/');
    });

    test('should throw error on API failure', async () => {
      httpService.get.mockRejectedValue(new Error('Not found'));

      await expect(subjectService.getById(999)).rejects.toThrow('Not found');
    });
  });

  describe('create', () => {
    const mockSubject = { code: 'CM3', name: 'Actuarial Mathematics 3' };

    test('should create subject', async () => {
      httpService.post.mockResolvedValue({ data: { id: 3, ...mockSubject } });

      const result = await subjectService.create(mockSubject);

      expect(result).toEqual({ id: 3, ...mockSubject });
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/subjects/',
        mockSubject
      );
    });

    test('should throw error on creation failure', async () => {
      httpService.post.mockRejectedValue(new Error('Creation failed'));

      await expect(subjectService.create(mockSubject)).rejects.toThrow('Creation failed');
    });
  });

  describe('update', () => {
    const mockSubject = { name: 'Updated Name' };

    test('should update subject', async () => {
      httpService.put.mockResolvedValue({ data: { id: 1, code: 'CM1', ...mockSubject } });

      const result = await subjectService.update(1, mockSubject);

      expect(result).toEqual({ id: 1, code: 'CM1', ...mockSubject });
      expect(httpService.put).toHaveBeenCalledWith(
        'http://test-api/subjects/1/',
        mockSubject
      );
    });

    test('should throw error on update failure', async () => {
      httpService.put.mockRejectedValue(new Error('Update failed'));

      await expect(subjectService.update(1, mockSubject)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    test('should delete subject', async () => {
      httpService.delete.mockResolvedValue({});

      await subjectService.delete(1);

      expect(httpService.delete).toHaveBeenCalledWith('http://test-api/subjects/1/');
    });

    test('should throw error on delete failure', async () => {
      httpService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(subjectService.delete(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('bulkImport', () => {
    test('should bulk import subjects', async () => {
      const subjects = [
        { code: 'CM1', name: 'Actuarial Mathematics 1' },
        { code: 'CM2', name: 'Actuarial Mathematics 2' },
      ];
      const mockResponse = { imported: 2, errors: [] };
      httpService.post.mockResolvedValue({ data: mockResponse });

      const result = await subjectService.bulkImport(subjects);

      expect(result).toEqual(mockResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://test-api/subjects/bulk-import/',
        { subjects }
      );
    });

    test('should throw error on bulk import failure', async () => {
      httpService.post.mockRejectedValue(new Error('Import failed'));

      await expect(subjectService.bulkImport([])).rejects.toThrow('Import failed');
    });
  });
});
