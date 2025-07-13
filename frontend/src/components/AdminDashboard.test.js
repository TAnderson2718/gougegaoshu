import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from './AdminDashboard';

// Mock the API
jest.mock('../services/api', () => ({
  adminAPI: {
    getStudents: jest.fn(),
    getStudentProfile: jest.fn(),
    createStudent: jest.fn(),
    resetPassword: jest.fn(),
    bulkImportTasks: jest.fn(),
    getTaskReport: jest.fn(),
  },
}));

const { adminAPI } = require('../services/api');

describe('AdminDashboard Component', () => {
  const mockStudents = [
    {
      id: 'ST001',
      name: '张三',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-01-15T09:00:00.000Z',
    },
    {
      id: 'ST002',
      name: '李四',
      status: 'inactive',
      createdAt: '2024-01-02T00:00:00.000Z',
      lastLoginAt: null,
    },
  ];

  const mockStudentProfile = {
    major: '计算机科学',
    grade: '大三',
    targetSchool: '清华大学',
  };

  const mockTaskReport = {
    totalTasks: 100,
    completedTasks: 75,
    completionRate: 75,
    activeStudents: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adminAPI.getStudents.mockResolvedValue({ success: true, data: mockStudents });
    adminAPI.getStudentProfile.mockResolvedValue({ success: true, data: mockStudentProfile });
    // Reset global mocks
    global.alert.mockClear();
    global.confirm.mockClear();
  });

  test('renders loading state initially', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('renders admin dashboard after loading', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('管理员控制台')).toBeInTheDocument();
    });

    expect(screen.getByText('管理学生、任务和查看系统报告')).toBeInTheDocument();
    expect(screen.getByText('学生管理')).toBeInTheDocument();
    expect(screen.getByText('添加学生')).toBeInTheDocument();
  });

  test('displays student list correctly', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('ID: ST001')).toBeInTheDocument();
    expect(screen.getByText('ID: ST002')).toBeInTheDocument();
    expect(screen.getByText('注册时间: 2024/1/1')).toBeInTheDocument();
    expect(screen.getByText('注册时间: 2024/1/2')).toBeInTheDocument();
  });

  test('shows student status correctly', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('活跃')).toBeInTheDocument();
    });

    expect(screen.getByText('非活跃')).toBeInTheDocument();
  });

  test('selects student and shows details', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // Click on first student
    const studentCard = screen.getByText('张三').closest('.border');
    await user.click(studentCard);

    // Should show student details
    await waitFor(() => {
      expect(screen.getByText('学生详情')).toBeInTheDocument();
    });

    expect(screen.getByText('ST001')).toBeInTheDocument();
    expect(screen.getByText('2024/1/15 17:00:00')).toBeInTheDocument();
    expect(screen.getByText('计算机科学')).toBeInTheDocument();
    expect(screen.getByText('大三')).toBeInTheDocument();
    expect(screen.getByText('清华大学')).toBeInTheDocument();
  });

  test('opens create student modal', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('添加学生')).toBeInTheDocument();
    });

    const addButton = screen.getByText('添加学生');
    await user.click(addButton);

    expect(screen.getByText('添加新学生')).toBeInTheDocument();
    expect(screen.getByText('学生姓名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入学生姓名')).toBeInTheDocument();
  });

  test('creates new student successfully', async () => {
    const user = userEvent.setup();
    adminAPI.createStudent.mockResolvedValue({ success: true });
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('添加学生')).toBeInTheDocument();
    });

    // Open create modal
    const addButton = screen.getByText('添加学生');
    await user.click(addButton);

    // Fill in student name
    const nameInput = screen.getByPlaceholderText('请输入学生姓名');
    await user.type(nameInput, '王五');

    // Submit
    const createButton = screen.getByText('创建');
    await user.click(createButton);

    expect(adminAPI.createStudent).toHaveBeenCalledWith('王五');

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('学生创建成功');
    });
  });

  test('validates student name input', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('添加学生')).toBeInTheDocument();
    });

    const addButton = screen.getByText('添加学生');
    await user.click(addButton);

    // Try to create without name
    const createButton = screen.getByText('创建');
    await user.click(createButton);

    expect(screen.getByText('请输入学生姓名')).toBeInTheDocument();
    expect(adminAPI.createStudent).not.toHaveBeenCalled();
  });

  test('cancels student creation', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('添加学生')).toBeInTheDocument();
    });

    const addButton = screen.getByText('添加学生');
    await user.click(addButton);

    // Fill in some data
    const nameInput = screen.getByPlaceholderText('请输入学生姓名');
    await user.type(nameInput, '测试用户');

    // Cancel
    const cancelButton = screen.getByText('取消');
    await user.click(cancelButton);

    // Modal should close
    expect(screen.queryByText('添加新学生')).not.toBeInTheDocument();
  });

  test('resets student password', async () => {
    const user = userEvent.setup();
    global.confirm.mockReturnValue(true);
    adminAPI.resetPassword.mockResolvedValue({ 
      success: true, 
      data: { newPassword: 'newpass123' } 
    });
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    // Click reset password button
    const resetButtons = screen.getAllByText('重置密码');
    await user.click(resetButtons[0]);

    expect(global.confirm).toHaveBeenCalledWith('确定要重置该学生的密码吗？');
    expect(adminAPI.resetPassword).toHaveBeenCalledWith('ST001');

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('密码重置成功。新密码：newpass123');
    });
  });

  test('cancels password reset when not confirmed', async () => {
    const user = userEvent.setup();
    global.confirm.mockReturnValue(false);
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    const resetButtons = screen.getAllByText('重置密码');
    await user.click(resetButtons[0]);

    expect(global.confirm).toHaveBeenCalled();
    expect(adminAPI.resetPassword).not.toHaveBeenCalled();
  });

  test('opens bulk import modal', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('批量导入任务')).toBeInTheDocument();
    });

    const importButton = screen.getByText('批量导入任务');
    await user.click(importButton);

    expect(screen.getByText('CSV 数据格式: 学生ID,任务标题,日期,描述,优先级')).toBeInTheDocument();
    expect(screen.getByText('导入')).toBeInTheDocument();
  });

  test('imports tasks successfully', async () => {
    const user = userEvent.setup();
    adminAPI.bulkImportTasks.mockResolvedValue({ 
      success: true, 
      data: { imported: 5 } 
    });
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('批量导入任务')).toBeInTheDocument();
    });

    const importButton = screen.getByText('批量导入任务');
    await user.click(importButton);

    // Fill in CSV data
    const csvTextarea = screen.getByRole('textbox');
    const csvData = 'ST001,数学复习,2024-01-15,复习高等数学,high';
    await user.type(csvTextarea, csvData);

    // Submit import
    const submitButton = screen.getByText('导入');
    await user.click(submitButton);

    expect(adminAPI.bulkImportTasks).toHaveBeenCalledWith(csvData);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('成功导入 5 个任务');
    });
  });

  test('validates CSV data input', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('批量导入任务')).toBeInTheDocument();
    });

    const importButton = screen.getByText('批量导入任务');
    await user.click(importButton);

    // Try to import without data
    const submitButton = screen.getByText('导入');
    await user.click(submitButton);

    expect(screen.getByText('请输入CSV数据')).toBeInTheDocument();
    expect(adminAPI.bulkImportTasks).not.toHaveBeenCalled();
  });

  test('generates task report', async () => {
    const user = userEvent.setup();
    adminAPI.getTaskReport.mockResolvedValue({ 
      success: true, 
      data: mockTaskReport 
    });
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('生成任务报告')).toBeInTheDocument();
    });

    const reportButton = screen.getByText('生成任务报告');
    await user.click(reportButton);

    expect(adminAPI.getTaskReport).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('任务报告')).toBeInTheDocument();
    });

    expect(screen.getByText('100')).toBeInTheDocument(); // total tasks
    expect(screen.getByText('75')).toBeInTheDocument(); // completed tasks
    expect(screen.getByText('75%')).toBeInTheDocument(); // completion rate
    expect(screen.getByText('8')).toBeInTheDocument(); // active students
  });

  test('displays system statistics', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('系统统计')).toBeInTheDocument();
    });

    expect(screen.getByText('总学生数')).toBeInTheDocument();
    expect(screen.getByText('活跃学生')).toBeInTheDocument();
    expect(screen.getByText('今日登录')).toBeInTheDocument();
    
    // Should show 2 total students
    expect(screen.getByText('2')).toBeInTheDocument();
    // Should show 1 active student
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  test('refreshes data', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('刷新数据')).toBeInTheDocument();
    });

    // Clear previous calls
    adminAPI.getStudents.mockClear();

    const refreshButton = screen.getByText('刷新数据');
    await user.click(refreshButton);

    expect(adminAPI.getStudents).toHaveBeenCalledTimes(1);
  });

  test('handles empty student list', async () => {
    adminAPI.getStudents.mockResolvedValue({ success: true, data: [] });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('暂无学生')).toBeInTheDocument();
    });

    expect(screen.getByText('点击"添加学生"按钮创建第一个学生账户。')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    adminAPI.getStudents.mockRejectedValue(new Error('网络错误'));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('网络错误')).toBeInTheDocument();
    });
  });

  test('handles student creation errors', async () => {
    const user = userEvent.setup();
    adminAPI.createStudent.mockResolvedValue({ 
      success: false, 
      message: '创建失败' 
    });
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('添加学生')).toBeInTheDocument();
    });

    const addButton = screen.getByText('添加学生');
    await user.click(addButton);

    const nameInput = screen.getByPlaceholderText('请输入学生姓名');
    await user.type(nameInput, '测试用户');

    const createButton = screen.getByText('创建');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('创建失败')).toBeInTheDocument();
    });
  });

  test('handles password reset errors', async () => {
    const user = userEvent.setup();
    window.confirm.mockReturnValue(true);
    adminAPI.resetPassword.mockRejectedValue(new Error('重置失败'));
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument();
    });

    const resetButtons = screen.getAllByText('重置密码');
    await user.click(resetButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('重置失败')).toBeInTheDocument();
    });
  });

  test('handles bulk import errors', async () => {
    const user = userEvent.setup();
    adminAPI.bulkImportTasks.mockRejectedValue(new Error('导入失败'));
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('批量导入任务')).toBeInTheDocument();
    });

    const importButton = screen.getByText('批量导入任务');
    await user.click(importButton);

    const csvTextarea = screen.getByRole('textbox');
    await user.type(csvTextarea, 'test data');

    const submitButton = screen.getByText('导入');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('导入失败')).toBeInTheDocument();
    });
  });

  test('handles task report errors', async () => {
    const user = userEvent.setup();
    adminAPI.getTaskReport.mockRejectedValue(new Error('获取报告失败'));
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('生成任务报告')).toBeInTheDocument();
    });

    const reportButton = screen.getByText('生成任务报告');
    await user.click(reportButton);

    await waitFor(() => {
      expect(screen.getByText('获取报告失败')).toBeInTheDocument();
    });
  });

  test('calculates today login count correctly', async () => {
    const today = new Date().toDateString();
    const studentsWithTodayLogin = [
      {
        ...mockStudents[0],
        lastLoginAt: new Date().toISOString(), // Today
      },
      {
        ...mockStudents[1],
        lastLoginAt: '2024-01-01T09:00:00.000Z', // Not today
      },
    ];

    adminAPI.getStudents.mockResolvedValue({ 
      success: true, 
      data: studentsWithTodayLogin 
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('系统统计')).toBeInTheDocument();
    });

    // Should show 1 today login
    const todayLoginElement = screen.getByText('今日登录').parentElement;
    expect(todayLoginElement).toHaveTextContent('1');
  });

  test('shows never logged in status correctly', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('李四')).toBeInTheDocument();
    });

    // Select student with no login
    const liSiCard = screen.getByText('李四').closest('.border');
    await userEvent.click(liSiCard);

    await waitFor(() => {
      expect(screen.getByText('从未登录')).toBeInTheDocument();
    });
  });
});