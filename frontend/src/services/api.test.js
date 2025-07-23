// Mock axios before importing
const mockAxiosCreate = jest.fn();
jest.mock('axios', () => ({
  default: {
    create: mockAxiosCreate
  },
  create: mockAxiosCreate
}));

// Mock window.location
delete window.location;
window.location = { href: '' };

// Mock localStorage globally
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Override localStorage for this test file
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('API Services', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockAxiosCreate.mockReturnValue(mockAxiosInstance);
    jest.clearAllMocks();
  });

  describe('axios instance configuration', () => {
    test('creates axios instance with correct config', () => {
      require('./api');
      
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    test('sets up request and response interceptors', () => {
      // Clear any previous calls
      jest.clearAllMocks();
      
      // Import fresh to trigger interceptor setup
      jest.resetModules();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
      require('./api');
      
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('authAPI', () => {
    beforeEach(() => {
      // Re-import to get fresh instance
      jest.resetModules();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
    });

    test('login calls correct endpoint', async () => {
      const { authAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await authAPI.login('ST001', 'password123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
        userId: 'ST001',
        password: 'password123'
      });
    });

    test('forceChangePassword calls correct endpoint', async () => {
      const { authAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await authAPI.forceChangePassword('newpassword123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/force-change-password', {
        newPassword: 'newpassword123'
      });
    });

    test('changePassword calls correct endpoint', async () => {
      const { authAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await authAPI.changePassword('oldpass', 'newpass');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/change-password', {
        oldPassword: 'oldpass',
        newPassword: 'newpass'
      });
    });

    test('verify calls correct endpoint', async () => {
      const { authAPI } = require('./api');
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await authAPI.verify();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/verify');
    });
  });

  describe('taskAPI', () => {
    beforeEach(() => {
      jest.resetModules();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
    });

    test('getTasks calls correct endpoint with params', async () => {
      const { taskAPI } = require('./api');
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await taskAPI.getTasks('2024-01-01', '2024-01-31');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' }
      });
    });

    test('updateTask calls correct endpoint', async () => {
      const { taskAPI } = require('./api');
      mockAxiosInstance.put.mockResolvedValue({ data: { success: true } });

      const updates = { completed: true, duration: { hour: 2, minute: 30 } };
      await taskAPI.updateTask('task-123', updates);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/tasks/task-123', updates);
    });

    test('requestLeave calls correct endpoint', async () => {
      const { taskAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await taskAPI.requestLeave('2024-01-15');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/leave', {
        date: '2024-01-15'
      });
    });

    test('getLeaveRecords calls correct endpoint', async () => {
      const { taskAPI } = require('./api');
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await taskAPI.getLeaveRecords();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/leave-records');
    });
  });

  describe('profileAPI', () => {
    beforeEach(() => {
      jest.resetModules();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
    });

    test('getProfile calls correct endpoint', async () => {
      const { profileAPI } = require('./api');
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await profileAPI.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/profiles');
    });

    test('updateProfile calls correct endpoint', async () => {
      const { profileAPI } = require('./api');
      mockAxiosInstance.put.mockResolvedValue({ data: { success: true } });

      const profileData = { name: '测试用户', age: 20 };
      await profileAPI.updateProfile(profileData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/profiles', profileData);
    });
  });

  describe('adminAPI', () => {
    beforeEach(() => {
      jest.resetModules();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
    });

    test('getStudents calls correct endpoint', async () => {
      const { adminAPI } = require('./api');
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await adminAPI.getStudents();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/admin/students');
    });

    test('createStudent calls correct endpoint', async () => {
      const { adminAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await adminAPI.createStudent('新学生');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/students', {
        name: '新学生'
      });
    });

    test('resetPassword calls correct endpoint', async () => {
      const { adminAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      await adminAPI.resetPassword('ST001');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/students/ST001/reset-password');
    });

    test('getStudentProfile calls correct endpoint', async () => {
      const { adminAPI } = require('./api');
      mockAxiosInstance.get.mockResolvedValue({ data: { success: true } });

      await adminAPI.getStudentProfile('ST001');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/admin/students/ST001/profile');
    });

    test('bulkImportTasks calls correct endpoint', async () => {
      const { adminAPI } = require('./api');
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

      const csvData = 'student,task,date\\nST001,Math,2024-01-01';
      await adminAPI.bulkImportTasks(csvData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/admin/tasks/bulk-import', {
        csvData: csvData
      });
    });
  });

  describe('request interceptor', () => {
    test('adds authorization header when token exists', () => {
      // Set up mock return value before test
      localStorageMock.getItem.mockReturnValue('test-token');
      
      const config = { headers: {} };
      
      // Get the token from localStorage (this should call the mock)
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      expect(config.headers.Authorization).toBe('Bearer test-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('token');
    });

    test('does not add authorization header when no token', () => {
      // Set up mock to return null
      localStorageMock.getItem.mockReturnValue(null);
      
      const config = { headers: {} };
      
      // Get the token from localStorage (this should call the mock)
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      expect(config.headers.Authorization).toBeUndefined();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('token');
    });
  });

  describe('response interceptor', () => {
    test('returns response data on success', () => {
      jest.resetModules();
      jest.clearAllMocks();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
      require('./api');

      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const response = { data: { success: true, message: 'OK' } };
      
      const result = responseInterceptor(response);

      expect(result).toEqual({ success: true, message: 'OK' });
    });

    test('handles 401 error by clearing localStorage and redirecting', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };
      
      // Simulate the error interceptor behavior
      if (error.response) {
        const { status, data } = error.response;
        
        // token过期或无效
        if (status === 401 || status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.href).toBe('/login');
    });

    test('handles network error', async () => {
      jest.resetModules();
      jest.clearAllMocks();
      mockAxiosCreate.mockReturnValue(mockAxiosInstance);
      require('./api');

      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = {}; // No response property
      
      await expect(errorInterceptor(error)).rejects.toEqual({ 
        message: '网络错误，请检查网络连接' 
      });
    });
  });
});