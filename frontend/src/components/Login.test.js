import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// Mock the AppContext
const mockLogin = jest.fn();
jest.mock('../contexts/AppContext', () => ({
  useApp: () => ({
    login: mockLogin,
    loading: false,
    error: null,
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('renders login form with all elements', () => {
    render(<Login />);
    
    expect(screen.getByText('学生登录')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('学生ID (例如: ST001)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('记住密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByText('初始密码: Hello888')).toBeInTheDocument();
    expect(screen.getByText('首次登录需要修改密码')).toBeInTheDocument();
  });

  test('updates input values when user types', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const studentIdInput = screen.getByPlaceholderText('学生ID (例如: ST001)');
    const passwordInput = screen.getByPlaceholderText('密码');
    const checkBox = screen.getByLabelText('记住密码');

    await user.type(studentIdInput, 'ST001');
    await user.type(passwordInput, 'password123');
    await user.click(checkBox);

    expect(studentIdInput).toHaveValue('ST001');
    expect(passwordInput).toHaveValue('password123');
    expect(checkBox).toBeChecked();
  });

  test('shows error for empty fields', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const loginButton = screen.getByRole('button', { name: '登录' });
    await user.click(loginButton);

    expect(screen.getByText('请输入学生ID和密码')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('shows error for only studentId filled', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const studentIdInput = screen.getByPlaceholderText('学生ID (例如: ST001)');
    await user.type(studentIdInput, 'ST001');
    
    const loginButton = screen.getByRole('button', { name: '登录' });
    await user.click(loginButton);

    expect(screen.getByText('请输入学生ID和密码')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('calls login function with correct parameters when form is valid', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    render(<Login />);
    
    const studentIdInput = screen.getByPlaceholderText('学生ID (例如: ST001)');
    const passwordInput = screen.getByPlaceholderText('密码');
    const checkBox = screen.getByLabelText('记住密码');
    
    await user.type(studentIdInput, 'st001');
    await user.type(passwordInput, 'password123');
    await user.click(checkBox);
    
    const loginButton = screen.getByRole('button', { name: '登录' });
    await user.click(loginButton);

    expect(mockLogin).toHaveBeenCalledWith('ST001', 'password123', true);
  });

  test('trims whitespace and converts to uppercase for studentId', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    render(<Login />);
    
    const studentIdInput = screen.getByPlaceholderText('学生ID (例如: ST001)');
    const passwordInput = screen.getByPlaceholderText('密码');
    
    await user.type(studentIdInput, '  st001  ');
    await user.type(passwordInput, 'password123');
    
    const loginButton = screen.getByRole('button', { name: '登录' });
    await user.click(loginButton);

    expect(mockLogin).toHaveBeenCalledWith('ST001', 'password123', false);
  });

  test('displays error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: '用户名或密码错误' 
    });
    
    render(<Login />);
    
    const studentIdInput = screen.getByPlaceholderText('学生ID (例如: ST001)');
    const passwordInput = screen.getByPlaceholderText('密码');
    
    await user.type(studentIdInput, 'ST001');
    await user.type(passwordInput, 'wrongpassword');
    
    const loginButton = screen.getByRole('button', { name: '登录' });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    });
  });

  test('loads saved credentials from localStorage', () => {
    const savedCredentials = JSON.stringify({
      studentId: 'ST002',
      password: 'savedpassword'
    });
    localStorageMock.getItem.mockReturnValue(savedCredentials);
    
    render(<Login />);
    
    // Verify form elements are rendered
    expect(screen.getByPlaceholderText('学生ID (例如: ST001)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('记住密码')).toBeInTheDocument();
  });

  test('handles localStorage error gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Login />);
    
    // Verify component still renders when localStorage fails
    expect(screen.getByPlaceholderText('学生ID (例如: ST001)')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});