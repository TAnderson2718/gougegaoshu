import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileScreen from './ProfileScreen';

// Mock the APIs and context
jest.mock('../services/api', () => ({
  profileAPI: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
  authAPI: {
    changePassword: jest.fn(),
  },
}));

jest.mock('../contexts/AppContext', () => ({
  useApp: jest.fn(),
}));

const { profileAPI, authAPI } = require('../services/api');
const { useApp } = require('../contexts/AppContext');

describe('ProfileScreen Component', () => {
  const mockProfile = {
    name: '测试用户',
    email: 'test@example.com',
    phone: '13800138000',
    major: '计算机科学',
    grade: '大三',
    targetSchool: '清华大学',
    studyGoal: '考取清华大学计算机科学专业研究生',
    bio: '热爱编程的学生',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    profileAPI.getProfile.mockResolvedValue({ success: true, data: mockProfile });
    // Reset global mocks
    global.alert.mockClear();

    // Set default mock for useApp
    useApp.mockReturnValue({
      user: {
        id: 'ST001',
        name: '测试用户',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLoginAt: '2024-01-15T09:00:00.000Z',
      },
      logout: jest.fn(),
    });
  });

  test('renders loading state initially', () => {
    render(<ProfileScreen />);
    
    expect(screen.getByTestId('profile-screen')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('renders profile information after loading', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('个人中心')).toBeInTheDocument();
    });

    expect(screen.getByText('管理您的个人信息和学习档案')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('13800138000')).toBeInTheDocument();
    expect(screen.getByText('计算机科学')).toBeInTheDocument();
    expect(screen.getByText('大三')).toBeInTheDocument();
    expect(screen.getByText('清华大学')).toBeInTheDocument();
  });

  test('displays account information correctly', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('账户信息')).toBeInTheDocument();
    });

    expect(screen.getByText('ST001')).toBeInTheDocument();
    expect(screen.getByText('2024/1/1')).toBeInTheDocument();
    expect(screen.getByText('2024/1/15 17:00:00')).toBeInTheDocument();
  });

  test('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('编辑信息')).toBeInTheDocument();
    });

    const editButton = screen.getByText('编辑信息');
    await user.click(editButton);

    // Should show input fields
    expect(screen.getByDisplayValue('测试用户')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13800138000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('计算机科学')).toBeInTheDocument();
    expect(screen.getByDisplayValue('大三')).toBeInTheDocument();

    // Should show save and cancel buttons
    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  test('updates profile information successfully', async () => {
    const user = userEvent.setup();
    profileAPI.updateProfile.mockResolvedValue({ success: true });
    
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('编辑信息')).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByText('编辑信息');
    await user.click(editButton);

    // Update name field
    const nameInput = screen.getByDisplayValue('测试用户');
    await user.clear(nameInput);
    await user.type(nameInput, '新用户名');

    // Update email field
    const emailInput = screen.getByDisplayValue('test@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'new@example.com');

    // Save changes
    const saveButton = screen.getByText('保存');
    await user.click(saveButton);

    expect(profileAPI.updateProfile).toHaveBeenCalledWith({
      ...mockProfile,
      name: '新用户名',
      email: 'new@example.com',
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('档案更新成功');
    });
  });

  test('cancels profile editing', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('编辑信息')).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByText('编辑信息');
    await user.click(editButton);

    // Change a field
    const nameInput = screen.getByDisplayValue('测试用户');
    await user.clear(nameInput);
    await user.type(nameInput, '临时名称');

    // Cancel editing
    const cancelButton = screen.getByText('取消');
    await user.click(cancelButton);

    // Should revert to original values
    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue('临时名称')).not.toBeInTheDocument();
  });

  test('handles profile update errors', async () => {
    const user = userEvent.setup();
    profileAPI.updateProfile.mockResolvedValue({ 
      success: false, 
      message: '更新失败' 
    });
    
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('编辑信息')).toBeInTheDocument();
    });

    const editButton = screen.getByText('编辑信息');
    await user.click(editButton);

    const saveButton = screen.getByText('保存');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('更新失败')).toBeInTheDocument();
    });
  });

  test('shows password change form when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    const passwordButton = screen.getByText('修改密码');
    await user.click(passwordButton);

    expect(screen.getByText('当前密码')).toBeInTheDocument();
    expect(screen.getByText('新密码')).toBeInTheDocument();
    expect(screen.getByText('确认新密码')).toBeInTheDocument();
    expect(screen.getByText('确认修改')).toBeInTheDocument();
  });

  test('changes password successfully', async () => {
    const user = userEvent.setup();
    authAPI.changePassword.mockResolvedValue({ success: true });
    
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    // Open password change form
    const passwordButton = screen.getByText('修改密码');
    await user.click(passwordButton);

    // Verify that the password change form appears
    await waitFor(() => {
      expect(screen.getByText('确认修改')).toBeInTheDocument();
    });
  });

  test('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    const passwordButton = screen.getByText('修改密码');
    await user.click(passwordButton);

    // Verify that the password change form appears
    await waitFor(() => {
      expect(screen.getByText('确认修改')).toBeInTheDocument();
    });
  });

  test('validates password length', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    const passwordButton = screen.getByText('修改密码');
    await user.click(passwordButton);

    // Verify that the password change form appears
    await waitFor(() => {
      expect(screen.getByText('确认修改')).toBeInTheDocument();
    });
  });

  test('cancels password change', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    const passwordButton = screen.getByText('修改密码');
    await user.click(passwordButton);

    // Should show the password change form
    await waitFor(() => {
      expect(screen.getByText('取消')).toBeInTheDocument();
    });

    // Cancel
    const cancelButton = screen.getByText('取消');
    await user.click(cancelButton);

    // Should return to initial state
    expect(screen.getByText('修改密码')).toBeInTheDocument();
  });

  test('handles password change errors', async () => {
    const user = userEvent.setup();
    authAPI.changePassword.mockRejectedValue(new Error('密码错误'));
    
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('修改密码')).toBeInTheDocument();
    });

    const passwordButton = screen.getByText('修改密码');
    await user.click(passwordButton);

    // Verify that the password change form appears
    await waitFor(() => {
      expect(screen.getByText('确认修改')).toBeInTheDocument();
    });
  });

  test('displays learning statistics', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('学习统计')).toBeInTheDocument();
    });

    expect(screen.getByText('本月完成任务')).toBeInTheDocument();
    expect(screen.getByText('总学习时长')).toBeInTheDocument();
    expect(screen.getByText('平均完成率')).toBeInTheDocument();
    expect(screen.getByText('连续打卡')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    profileAPI.getProfile.mockRejectedValue(new Error('网络错误'));

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('网络错误')).toBeInTheDocument();
    });
  });

  test('handles missing profile data', async () => {
    profileAPI.getProfile.mockResolvedValue({ success: true, data: {} });

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('个人中心')).toBeInTheDocument();
    });

    // Should show "未填写" for empty fields
    const unfilled = screen.getAllByText('未填写');
    expect(unfilled.length).toBeGreaterThan(0);
  });

  test('renders all grade options in select', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('编辑信息')).toBeInTheDocument();
    });

    const editButton = screen.getByText('编辑信息');
    await user.click(editButton);

    const gradeSelect = screen.getByDisplayValue('大三');
    expect(gradeSelect).toBeInTheDocument();
    
    // Check for grade options (they should be in the DOM as option elements)
    expect(screen.getByRole('option', { name: '大一' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '大二' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '大三' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '大四' })).toBeInTheDocument();
  });

  test('updates form fields correctly', async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('编辑信息')).toBeInTheDocument();
    });

    const editButton = screen.getByText('编辑信息');
    await user.click(editButton);

    // Test updating bio field
    const bioTextarea = screen.getByDisplayValue('热爱编程的学生');
    await user.clear(bioTextarea);
    await user.type(bioTextarea, '更新后的个人简介');

    expect(screen.getByDisplayValue('更新后的个人简介')).toBeInTheDocument();
  });

  test('handles logout functionality', async () => {
    const mockLogout = jest.fn();
    useApp.mockReturnValue({
      user: { id: 'ST001', name: '测试用户' },
      logout: mockLogout
    });

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('🚪 退出登录')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('🚪 退出登录');
    await userEvent.click(logoutButton);

    expect(window.confirm).toHaveBeenCalledWith('确定要退出登录吗？');
    expect(mockLogout).toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  test('cancels logout when user clicks cancel', async () => {
    const mockLogout = jest.fn();
    useApp.mockReturnValue({
      user: { id: 'ST001', name: '测试用户' },
      logout: mockLogout
    });

    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);

    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('🚪 退出登录')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('🚪 退出登录');
    await userEvent.click(logoutButton);

    expect(window.confirm).toHaveBeenCalledWith('确定要退出登录吗？');
    expect(mockLogout).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });
});