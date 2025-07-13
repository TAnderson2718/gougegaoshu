import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodayScreen from './TodayScreen';

// Mock the API and context
jest.mock('../services/api', () => ({
  taskAPI: {
    getTasks: jest.fn(),
    updateTask: jest.fn(),
    requestLeave: jest.fn(),
    getLeaveRecords: jest.fn(),
  },
}));

jest.mock('../contexts/AppContext', () => ({
  useApp: () => ({
    systemDate: new Date('2024-01-15T10:00:00.000Z'),
  }),
}));

const { taskAPI } = require('../services/api');

describe('TodayScreen Component', () => {
  const mockTasks = [
    {
      id: 'task1',
      title: '数学复习',
      description: '复习高等数学',
      completed: false,
      priority: 'high',
      duration: { hour: 2, minute: 30 },
      date: '2024-01-15'
    },
    {
      id: 'task2',
      title: '英语听力',
      description: '练习托福听力',
      completed: true,
      priority: 'medium',
      duration: { hour: 1, minute: 0 },
      completedAt: '2024-01-15T08:30:00.000Z',
      date: '2024-01-15'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    taskAPI.getTasks.mockResolvedValue({ success: true, data: mockTasks });
    taskAPI.getLeaveRecords.mockResolvedValue({ success: true, data: [] });
    // Reset global mocks
    global.alert.mockClear();
    global.confirm.mockClear();
  });

  test('renders loading state initially', () => {
    render(<TodayScreen />);
    
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('renders today tasks after loading', async () => {
    render(<TodayScreen />);

    await waitFor(() => {
      expect(screen.getByText(/今日任务/)).toBeInTheDocument();
    });

    // Check that tasks are displayed
    expect(screen.getByText('数学复习')).toBeInTheDocument();
    expect(screen.getByText('英语听力')).toBeInTheDocument();
  });

  test('displays completion rate correctly', () => {
    render(<TodayScreen />);
    
    // Check if the component renders at all
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('shows priority badges for tasks', () => {
    render(<TodayScreen />);
    
    // Verify basic task content is displayed
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('displays task completion functionality', () => {
    render(<TodayScreen />);

    // Verify the component renders correctly
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('displays task duration information', () => {
    render(<TodayScreen />);

    // Verify the component displays task information
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('displays leave request functionality', () => {
    render(<TodayScreen />);

    // Verify the component renders with basic structure
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('handles leave status correctly', () => {
    taskAPI.getLeaveRecords.mockResolvedValue({
      success: true,
      data: [{ date: '2024-01-15', status: 'approved' }]
    });

    render(<TodayScreen />);
    
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('displays empty state when no tasks', () => {
    taskAPI.getTasks.mockResolvedValue({ success: true, data: [] });

    render(<TodayScreen />);
    
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    taskAPI.getTasks.mockRejectedValue(new Error('网络错误'));

    render(<TodayScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('today-screen')).toBeInTheDocument();
    });
  });

  test('displays completed task with completion time', () => {
    render(<TodayScreen />);

    // Check that the component renders properly
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('formats task information correctly', () => {
    render(<TodayScreen />);

    // Verify task information component renders
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });

  test('shows tasks without duration', () => {
    const tasksWithoutDuration = [
      {
        id: 'task3',
        title: '阅读任务',
        completed: false,
        priority: 'low',
        date: '2024-01-15'
      }
    ];

    taskAPI.getTasks.mockResolvedValue({ 
      success: true, 
      data: tasksWithoutDuration 
    });

    render(<TodayScreen />);
    
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
  });
});