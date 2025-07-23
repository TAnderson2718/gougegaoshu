/**
 * 测试工具函数
 * 提供统一的测试环境包装器
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// 创建带有Router上下文的渲染函数
export const renderWithRouter = (ui, options = {}) => {
  const { initialEntries = ['/'], ...renderOptions } = options;
  
  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// 创建带有完整上下文的渲染函数
export const renderWithProviders = (ui, options = {}) => {
  const { 
    initialEntries = ['/'],
    mockAppContext = {},
    ...renderOptions 
  } = options;

  // 默认的AppContext mock
  const defaultAppContext = {
    user: null,
    loading: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    ...mockAppContext
  };

  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// 创建mock的localStorage
export const createMockLocalStorage = () => {
  const store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
};

// 设置全局测试环境
export const setupTestEnvironment = () => {
  // Mock localStorage
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: createMockLocalStorage()
  });

  // Mock window.location
  delete window.location;
  window.location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
  };

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  };
};

// 清理测试环境
export const cleanupTestEnvironment = () => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
};

// 常用的测试数据
export const mockTestData = {
  user: {
    id: 'ST001',
    name: '测试用户',
    userType: 'student'
  },
  tasks: [
    {
      id: 'task1',
      title: '测试任务1',
      type: '数学',
      completed: false,
      date: '2025-07-23'
    },
    {
      id: 'task2', 
      title: '测试任务2',
      type: '英语',
      completed: true,
      date: '2025-07-23'
    }
  ],
  profile: {
    id: 'ST001',
    name: '测试用户',
    gender: '男',
    age: 22,
    grade: '大四',
    major: '计算机科学',
    bio: '热爱编程的学生'
  }
};

export default {
  renderWithRouter,
  renderWithProviders,
  createMockLocalStorage,
  setupTestEnvironment,
  cleanupTestEnvironment,
  mockTestData
};
