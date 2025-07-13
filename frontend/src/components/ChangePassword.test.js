import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePassword from './ChangePassword';

// Mock the AppContext
const mockForceChangePassword = jest.fn();
const mockLogout = jest.fn();

jest.mock('../contexts/AppContext', () => ({
  useApp: () => ({
    forceChangePassword: mockForceChangePassword,
    logout: mockLogout,
  }),
}));

describe('ChangePassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset global mocks
    global.alert.mockClear();
  });

  test('renders change password form with all elements', () => {
    render(<ChangePassword />);
    
    expect(screen.getByText('首次登录')).toBeInTheDocument();
    expect(screen.getByText('请修改您的初始密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('新密码（至少6位）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('确认新密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认修改' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回登录' })).toBeInTheDocument();
  });

  test('updates input values when user types', async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');

    expect(newPasswordInput).toHaveValue('newpassword123');
    expect(confirmPasswordInput).toHaveValue('newpassword123');
  });

  test('shows error for password shorter than 6 characters', async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });

    await user.type(newPasswordInput, '12345');
    await user.type(confirmPasswordInput, '12345');
    await user.click(submitButton);

    expect(screen.getByText('密码长度不能少于6位')).toBeInTheDocument();
    expect(mockForceChangePassword).not.toHaveBeenCalled();
  });

  test('shows error for mismatched passwords', async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });

    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'different123');
    await user.click(submitButton);

    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
    expect(mockForceChangePassword).not.toHaveBeenCalled();
  });

  test('clears error when user types in input fields', async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });

    // First create an error
    await user.type(newPasswordInput, '12345');
    await user.type(confirmPasswordInput, '12345');
    await user.click(submitButton);
    
    expect(screen.getByText('密码长度不能少于6位')).toBeInTheDocument();

    // Then type in field to clear error
    await user.type(newPasswordInput, '6');
    
    expect(screen.queryByText('密码长度不能少于6位')).not.toBeInTheDocument();
  });

  test('calls forceChangePassword with correct password on valid form submission', async () => {
    const user = userEvent.setup();
    mockForceChangePassword.mockResolvedValue({ success: true });
    
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    expect(mockForceChangePassword).toHaveBeenCalledWith('newpassword123');
  });

  test('shows loading state during password change', async () => {
    const user = userEvent.setup();
    
    // Create a promise that we can control
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockForceChangePassword.mockReturnValue(promise);
    
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText('修改中...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(newPasswordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();

    // Resolve the promise
    resolvePromise({ success: true });
    
    await waitFor(() => {
      expect(screen.getByText('确认修改')).toBeInTheDocument();
    });
  });

  test('displays error message when password change fails', async () => {
    const user = userEvent.setup();
    mockForceChangePassword.mockResolvedValue({ 
      success: false, 
      message: '密码修改失败' 
    });
    
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('密码修改失败')).toBeInTheDocument();
    });
  });

  test('calls logout when return to login button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChangePassword />);
    
    const returnButton = screen.getByRole('button', { name: '返回登录' });
    await user.click(returnButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  test('disables return button during loading', async () => {
    const user = userEvent.setup();
    
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockForceChangePassword.mockReturnValue(promise);
    
    render(<ChangePassword />);
    
    const newPasswordInput = screen.getByPlaceholderText('新密码（至少6位）');
    const confirmPasswordInput = screen.getByPlaceholderText('确认新密码');
    const submitButton = screen.getByRole('button', { name: '确认修改' });
    const returnButton = screen.getByRole('button', { name: '返回登录' });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    // Return button should be disabled during loading
    expect(returnButton).toBeDisabled();

    // Resolve the promise
    resolvePromise({ success: true });
    
    await waitFor(() => {
      expect(returnButton).not.toBeDisabled();
    });
  });
});