/**
 * Tests for tutorialService
 *
 * @module services/__tests__/tutorialService.test
 *
 * Tests tutorial-related operations including:
 * - getEvents: Fetch tutorial events list
 * - getAllEvents: Fetch all tutorial events
 * - getEventById: Fetch specific tutorial event
 * - getSessions: Fetch tutorial sessions
 * - getSessionsByEvent: Fetch sessions filtered by event
 * - getAllTutorialProducts: Fetch all tutorial products
 * - getTutorialProducts: Fetch tutorial products with filters
 * - getTutorialVariations: Fetch product variations
 * - getComprehensiveTutorialData: Fetch comprehensive tutorial data
 */

describe('tutorialService', () => {
  let tutorialService;
  let httpService;

  beforeEach(() => {
    // Reset modules to get fresh instances
    jest.resetModules();

    // Mock console.error to avoid test noise
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock config
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        tutorialUrl: 'http://test-api/tutorials',
        apiBaseUrl: 'http://test-api',
        apiUrl: 'http://test-api',
      },
    }));

    // Mock httpService with controllable mocks
    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn(),
      },
    }));

    // Import after mocks are set up
    tutorialService = require('../tutorialService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getEvents', () => {
    test('should fetch tutorial events and return array', async () => {
      const mockEvents = [
        { id: 1, name: 'CM1 Tutorial', subject: 'CM1' },
        { id: 2, name: 'SA2 Tutorial', subject: 'SA2' },
      ];
      httpService.get.mockResolvedValue({ data: mockEvents });

      const result = await tutorialService.getEvents();

      expect(result).toEqual(mockEvents);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/list/');
    });

    test('should return results from paginated response', async () => {
      const mockEvents = [{ id: 1, name: 'CM1 Tutorial' }];
      httpService.get.mockResolvedValue({
        data: { results: mockEvents, count: 1 },
      });

      const result = await tutorialService.getEvents();

      expect(result).toEqual(mockEvents);
    });

    test('should return Object.values for non-array, non-results response', async () => {
      const mockEvents = {
        event1: { id: 1, name: 'CM1 Tutorial' },
        event2: { id: 2, name: 'SA2 Tutorial' },
      };
      httpService.get.mockResolvedValue({ data: mockEvents });

      const result = await tutorialService.getEvents();

      expect(result).toEqual([
        { id: 1, name: 'CM1 Tutorial' },
        { id: 2, name: 'SA2 Tutorial' },
      ]);
    });

    test('should return empty array when response.data is null', async () => {
      httpService.get.mockResolvedValue({ data: null });

      const result = await tutorialService.getEvents();

      expect(result).toEqual([]);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Network error'));

      const result = await tutorialService.getEvents();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching tutorial events:',
        expect.any(Error)
      );
    });
  });

  describe('getAllEvents', () => {
    test('should fetch all tutorial events', async () => {
      const mockEvents = [
        { id: 1, name: 'Event 1' },
        { id: 2, name: 'Event 2' },
      ];
      httpService.get.mockResolvedValue({ data: mockEvents });

      const result = await tutorialService.getAllEvents();

      expect(result).toEqual(mockEvents);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/events/');
    });

    test('should return results from paginated response', async () => {
      const mockEvents = [{ id: 1, name: 'Event 1' }];
      httpService.get.mockResolvedValue({
        data: { results: mockEvents, count: 1 },
      });

      const result = await tutorialService.getAllEvents();

      expect(result).toEqual(mockEvents);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('API error'));

      const result = await tutorialService.getAllEvents();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching all tutorial events:',
        expect.any(Error)
      );
    });
  });

  describe('getEventById', () => {
    test('should fetch tutorial event by id', async () => {
      const mockEvent = { id: 123, name: 'CM1 London Tutorial', subject: 'CM1' };
      httpService.get.mockResolvedValue({ data: mockEvent });

      const result = await tutorialService.getEventById(123);

      expect(result).toEqual(mockEvent);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/events/123/');
    });

    test('should throw error on API failure', async () => {
      const mockError = new Error('Event not found');
      httpService.get.mockRejectedValue(mockError);

      await expect(tutorialService.getEventById(999)).rejects.toThrow('Event not found');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching tutorial event by id:',
        mockError
      );
    });

    test('should work with string id', async () => {
      const mockEvent = { id: 'abc123', name: 'Tutorial' };
      httpService.get.mockResolvedValue({ data: mockEvent });

      const result = await tutorialService.getEventById('abc123');

      expect(result).toEqual(mockEvent);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/events/abc123/');
    });
  });

  describe('getSessions', () => {
    test('should fetch tutorial sessions', async () => {
      const mockSessions = [
        { id: 1, date: '2025-01-15', capacity: 30 },
        { id: 2, date: '2025-01-22', capacity: 30 },
      ];
      httpService.get.mockResolvedValue({ data: mockSessions });

      const result = await tutorialService.getSessions();

      expect(result).toEqual(mockSessions);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/sessions/');
    });

    test('should return results from paginated response', async () => {
      const mockSessions = [{ id: 1, date: '2025-01-15' }];
      httpService.get.mockResolvedValue({
        data: { results: mockSessions, count: 1 },
      });

      const result = await tutorialService.getSessions();

      expect(result).toEqual(mockSessions);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Sessions fetch failed'));

      const result = await tutorialService.getSessions();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching tutorial sessions:',
        expect.any(Error)
      );
    });
  });

  describe('getSessionsByEvent', () => {
    test('should fetch sessions by event id', async () => {
      const mockSessions = [
        { id: 1, event: 100, date: '2025-01-15' },
        { id: 2, event: 100, date: '2025-01-22' },
      ];
      httpService.get.mockResolvedValue({ data: mockSessions });

      const result = await tutorialService.getSessionsByEvent(100);

      expect(result).toEqual(mockSessions);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/tutorials/sessions/?event=100'
      );
    });

    test('should return results from paginated response', async () => {
      const mockSessions = [{ id: 1, event: 100 }];
      httpService.get.mockResolvedValue({
        data: { results: mockSessions, count: 1 },
      });

      const result = await tutorialService.getSessionsByEvent(100);

      expect(result).toEqual(mockSessions);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Event sessions fetch failed'));

      const result = await tutorialService.getSessionsByEvent(999);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching sessions by event:',
        expect.any(Error)
      );
    });
  });

  describe('getAllTutorialProducts', () => {
    test('should fetch all tutorial products', async () => {
      const mockProducts = [
        { id: 1, name: 'CM1 F2F Tutorial', type: 'face_to_face' },
        { id: 2, name: 'CM1 Online Tutorial', type: 'online' },
      ];
      httpService.get.mockResolvedValue({ data: mockProducts });

      const result = await tutorialService.getAllTutorialProducts();

      expect(result).toEqual(mockProducts);
      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/products/all/');
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Products fetch failed'));

      const result = await tutorialService.getAllTutorialProducts();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching all tutorial products:',
        expect.any(Error)
      );
    });
  });

  describe('getTutorialProducts', () => {
    test('should fetch tutorial products with valid params', async () => {
      const mockProducts = [
        { id: 1, name: 'CM1 Tutorial', exam_session: 1, subject: 'CM1' },
      ];
      httpService.get.mockResolvedValue({ data: mockProducts });

      const result = await tutorialService.getTutorialProducts(1, 'CM1');

      expect(result).toEqual(mockProducts);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/tutorials/products/',
        {
          params: {
            exam_session: 1,
            subject_code: 'CM1',
          },
        }
      );
    });

    test('should throw error when examSessionId is missing', async () => {
      await expect(tutorialService.getTutorialProducts(null, 'CM1')).rejects.toThrow(
        'exam_session and subject_code parameters are required'
      );
    });

    test('should throw error when subjectCode is missing', async () => {
      await expect(tutorialService.getTutorialProducts(1, null)).rejects.toThrow(
        'exam_session and subject_code parameters are required'
      );
    });

    test('should throw error when both params are missing', async () => {
      await expect(tutorialService.getTutorialProducts(undefined, undefined)).rejects.toThrow(
        'exam_session and subject_code parameters are required'
      );
    });

    test('should throw error on API failure', async () => {
      const mockError = new Error('API error');
      httpService.get.mockRejectedValue(mockError);

      await expect(tutorialService.getTutorialProducts(1, 'CM1')).rejects.toThrow('API error');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching tutorial products:',
        mockError
      );
    });

    test('should work with string examSessionId', async () => {
      httpService.get.mockResolvedValue({ data: [] });

      await tutorialService.getTutorialProducts('session-1', 'SA2');

      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/tutorials/products/',
        {
          params: {
            exam_session: 'session-1',
            subject_code: 'SA2',
          },
        }
      );
    });
  });

  describe('getTutorialVariations', () => {
    test('should fetch tutorial variations for product', async () => {
      const mockVariations = [
        { id: 1, name: 'London', location: 'London' },
        { id: 2, name: 'Manchester', location: 'Manchester' },
      ];
      httpService.get.mockResolvedValue({ data: mockVariations });

      const result = await tutorialService.getTutorialVariations(100, 'CM1');

      expect(result).toEqual(mockVariations);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/tutorials/products/100/variations/',
        {
          params: {
            subject_code: 'CM1',
          },
        }
      );
    });

    test('should throw error on API failure', async () => {
      const mockError = new Error('Variations fetch failed');
      httpService.get.mockRejectedValue(mockError);

      await expect(tutorialService.getTutorialVariations(100, 'CM1')).rejects.toThrow(
        'Variations fetch failed'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching tutorial variations:',
        mockError
      );
    });

    test('should work with string productId', async () => {
      httpService.get.mockResolvedValue({ data: [] });

      await tutorialService.getTutorialVariations('prod-123', 'SA1');

      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/tutorials/products/prod-123/variations/',
        {
          params: {
            subject_code: 'SA1',
          },
        }
      );
    });
  });

  describe('getComprehensiveTutorialData', () => {
    test('should fetch comprehensive tutorial data', async () => {
      const mockData = {
        events: [{ id: 1, name: 'Event 1' }],
        sessions: [{ id: 1, date: '2025-01-15' }],
        products: [{ id: 1, name: 'Product 1' }],
      };
      httpService.get.mockResolvedValue({ data: mockData });

      const result = await tutorialService.getComprehensiveTutorialData();

      expect(result).toEqual(mockData);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api/tutorials/data/comprehensive/'
      );
    });

    test('should return empty array when data is null', async () => {
      httpService.get.mockResolvedValue({ data: null });

      const result = await tutorialService.getComprehensiveTutorialData();

      expect(result).toEqual([]);
    });

    test('should return empty array on error', async () => {
      httpService.get.mockRejectedValue(new Error('Comprehensive data fetch failed'));

      const result = await tutorialService.getComprehensiveTutorialData();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching comprehensive tutorial data:',
        expect.any(Error)
      );
    });
  });

  describe('URL configuration', () => {
    test('should use tutorialUrl from config when available', async () => {
      httpService.get.mockResolvedValue({ data: [] });

      await tutorialService.getEvents();

      expect(httpService.get).toHaveBeenCalledWith('http://test-api/tutorials/list/');
    });
  });
});

describe('tutorialService URL fallback', () => {
  let tutorialService;
  let httpService;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock config without tutorialUrl
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        apiBaseUrl: 'http://fallback-api',
      },
    }));

    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn().mockResolvedValue({ data: [] }),
      },
    }));

    tutorialService = require('../tutorialService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should use apiBaseUrl fallback when tutorialUrl not configured', async () => {
    await tutorialService.getEvents();

    expect(httpService.get).toHaveBeenCalledWith('http://fallback-api/tutorials/list/');
  });
});

describe('tutorialService apiUrl fallback', () => {
  let tutorialService;
  let httpService;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock config with only apiUrl
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        apiUrl: 'http://apiurl-fallback',
      },
    }));

    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn().mockResolvedValue({ data: [] }),
      },
    }));

    tutorialService = require('../tutorialService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should use apiUrl fallback when tutorialUrl and apiBaseUrl not configured', async () => {
    await tutorialService.getEvents();

    expect(httpService.get).toHaveBeenCalledWith('http://apiurl-fallback/tutorials/list/');
  });
});

describe('tutorialService empty config', () => {
  let tutorialService;
  let httpService;

  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock config with no URL values (empty strings are falsy)
    // Note: The fallback logic still produces '/tutorials' as URL
    jest.doMock('../../config', () => ({
      __esModule: true,
      default: {
        tutorialUrl: '',
        apiBaseUrl: '',
        apiUrl: '',
      },
    }));

    jest.doMock('../httpService', () => ({
      __esModule: true,
      default: {
        get: jest.fn().mockResolvedValue({ data: [] }),
      },
    }));

    tutorialService = require('../tutorialService').default;
    httpService = require('../httpService').default;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should use /tutorials fallback when all config values are empty', async () => {
    const result = await tutorialService.getAllTutorialProducts();

    expect(result).toEqual([]);
    // URL fallback produces /tutorials even with empty config
    expect(httpService.get).toHaveBeenCalledWith('/tutorials/products/all/');
  });

  test('should use /tutorials fallback for comprehensive data when config is empty', async () => {
    const result = await tutorialService.getComprehensiveTutorialData();

    expect(result).toEqual([]);
    expect(httpService.get).toHaveBeenCalledWith('/tutorials/data/comprehensive/');
  });
});
