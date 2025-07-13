import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from './AppContext';

// Mock the API service
jest.mock('../services/api', () => ({
  authAPI: {
    verify: jest.fn(),
    login: jest.fn(),
    forceChangePassword: jest.fn(),
    changePassword: jest.fn(),
  },
}));

// Test component that uses the context
const TestComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    loading, 
    error, 
    login, 
    logout, 
    forceChangePassword, 
    changePassword,
    systemDate,
    setSystemDate,
    advanceDay
  } = useApp();
  
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No user'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <div data-testid="systemDate">{systemDate.toISOString()}</div>
      <button onClick={() => login('ST001', 'password', false)}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => forceChangePassword('newpass123')}>Force Change Password</button>
      <button onClick={() => changePassword('oldpass', 'newpass')}>Change Password</button>
      <button onClick={() => setSystemDate(new Date('2024-01-01'))}>Set Date</button>
      <button onClick={advanceDay}>Advance Day</button>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('provides initial state correctly', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('No error');
    
    // Wait for loading to become false since there's no token
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  test('handles successful login', async () => {
    const mockStudent = { id: 'ST001', name: '测试用户' };
    const { authAPI } = require('../services/api');
    authAPI.login.mockResolvedValue({
      success: true,
      data: {
        student: mockStudent,
        token: 'mock-token'
      }
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('测试用户');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(authAPI.login).toHaveBeenCalledWith('ST001', 'password');
  });

  test('handles login failure', async () => {
    const { authAPI } = require('../services/api');
    authAPI.login.mockRejectedValue(new Error('登录失败'));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('登录失败');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  test('handles logout', async () => {
    const mockStudent = { id: 'ST001', name: '测试用户' };
    const { authAPI } = require('../services/api');
    
    // First mock successful login
    authAPI.login.mockResolvedValue({
      success: true,
      data: {
        student: mockStudent,
        token: 'mock-token'
      }
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Login first
    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    // Then logout
    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });

  test('verifies token on app initialization', async () => {
    const mockUser = { id: 'ST001', name: '测试用户' };
    const { authAPI } = require('../services/api');
    
    // Mock token verification
    authAPI.verify.mockResolvedValue({
      success: true
    });

    // Set token and user in localStorage
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    }, { timeout: 3000 });

    expect(screen.getByTestId('user')).toHaveTextContent('测试用户');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(authAPI.verify).toHaveBeenCalled();
  });

  test('handles token verification failure', async () => {
    const { authAPI } = require('../services/api');
    
    authAPI.verify.mockResolvedValue({
      success: false,
      message: 'Token expired'
    });

    localStorage.setItem('token', 'invalid-token');
    localStorage.setItem('user', JSON.stringify({ id: 'ST001', name: '测试用户' }));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Token should be removed from localStorage on failure
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('handles force password change successfully', async () => {
    const { authAPI } = require('../services/api');
    const mockUser = { id: 'ST001', name: '测试用户', forcePasswordChange: true };
    
    authAPI.verify.mockResolvedValue({ success: true });
    authAPI.forceChangePassword.mockResolvedValue({
      success: true
    });

    // Set initial user state
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    const forceChangeButton = screen.getByText('Force Change Password');
    await userEvent.click(forceChangeButton);

    expect(authAPI.forceChangePassword).toHaveBeenCalledWith('newpass123');
  });

  test('handles force password change failure', async () => {
    const { authAPI } = require('../services/api');
    
    authAPI.forceChangePassword.mockRejectedValue(new Error('修改失败'));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const forceChangeButton = screen.getByText('Force Change Password');
    await userEvent.click(forceChangeButton);

    expect(authAPI.forceChangePassword).toHaveBeenCalledWith('newpass123');
  });

  test('handles change password successfully', async () => {
    const { authAPI } = require('../services/api');
    
    authAPI.changePassword.mockResolvedValue({
      success: true
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const changePasswordButton = screen.getByText('Change Password');
    await userEvent.click(changePasswordButton);

    expect(authAPI.changePassword).toHaveBeenCalledWith('oldpass', 'newpass');
  });

  test('handles change password failure', async () => {
    const { authAPI } = require('../services/api');
    
    authAPI.changePassword.mockRejectedValue(new Error('密码错误'));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    const changePasswordButton = screen.getByText('Change Password');
    await userEvent.click(changePasswordButton);

    expect(authAPI.changePassword).toHaveBeenCalledWith('oldpass', 'newpass');
  });

  test('handles system date functions', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Test set date
    const setDateButton = screen.getByText('Set Date');
    await userEvent.click(setDateButton);

    await waitFor(() => {
      expect(screen.getByTestId('systemDate')).toHaveTextContent('2024-01-01T00:00:00.000Z');
    });

    // Test advance day
    const advanceDayButton = screen.getByText('Advance Day');
    await userEvent.click(advanceDayButton);

    await waitFor(() => {
      expect(screen.getByTestId('systemDate')).toHaveTextContent('2024-01-02T00:00:00.000Z');
    });
  });

  test('handles login with remember me', async () => {
    const { authAPI } = require('../services/api');
    const mockStudent = { id: 'ST001', name: '测试用户' };
    
    authAPI.login.mockResolvedValue({
      success: true,
      data: {
        student: mockStudent,
        token: 'mock-token'
      }
    });

    const RememberMeTestComponent = () => {
      const { login } = useApp();
      return (
        <button onClick={() => login('ST001', 'password', true)}>Login with Remember</button>
      );
    };

    render(
      <AppProvider>
        <RememberMeTestComponent />
      </AppProvider>
    );

    const loginButton = screen.getByText('Login with Remember');
    await userEvent.click(loginButton);

    expect(authAPI.login).toHaveBeenCalledWith('ST001', 'password');
    
    // Check that credentials are saved
    await waitFor(() => {
      const savedCredentials = localStorage.getItem('savedCredentials');
      expect(savedCredentials).not.toBeNull();
      expect(JSON.parse(savedCredentials)).toEqual({
        studentId: 'ST001',
        password: 'password'
      });
    });
  });

  test('handles token verification error', async () => {
    const { authAPI } = require('../services/api');
    
    authAPI.verify.mockRejectedValue(new Error('Network error'));

    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 'ST001', name: '测试用户' }));

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Token should be removed from localStorage on error
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});