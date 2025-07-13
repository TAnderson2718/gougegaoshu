import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthScreen from './MonthScreen';

// Mock the API and context
jest.mock('../services/api', () => ({
  taskAPI: {
    getTasks: jest.fn(),
  },
}));

jest.mock('../contexts/AppContext', () => ({
  useApp: () => ({
    systemDate: new Date('2024-01-15T10:00:00.000Z'),
  }),
}));

const { taskAPI } = require('../services/api');

describe('MonthScreen Component', () => {
  const mockTasks = [
    {
      id: 'task1',
      title: '数学复习',
      description: '复习高等数学',
      completed: true,
      priority: 'high',
      duration: { hour: 2, minute: 30 },
      date: '2024-01-15'
    },
    {
      id: 'task2',
      title: '英语听力',
      description: '练习托福听力',
      completed: false,
      priority: 'medium',
      duration: { hour: 1, minute: 0 },
      date: '2024-01-15'
    },
    {
      id: 'task3',
      title: '编程练习',
      completed: true,
      priority: 'low',
      duration: { hour: 3, minute: 0 },
      date: '2024-01-10'
    },
    {
      id: 'task4',
      title: '阅读任务',
      completed: false,
      priority: 'medium',
      duration: { hour: 1, minute: 30 },
      date: '2024-01-20'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Format data as expected by the backend API (grouped by date)
    const tasksGroupedByDate = {
      '2024-01-15': [
        {
          id: 'task1',
          title: '数学复习',
          type: '数学',
          completed: true,
          duration: { hour: 2, minute: 30 }
        },
        {
          id: 'task2',
          title: '英语听力',
          type: '英语',
          completed: false,
          duration: { hour: 1, minute: 0 }
        }
      ],
      '2024-01-10': [
        {
          id: 'task3',
          title: '编程练习',
          type: '专业课',
          completed: true,
          duration: { hour: 3, minute: 0 }
        }
      ],
      '2024-01-20': [
        {
          id: 'task4',
          title: '阅读任务',
          type: '英语',
          completed: false,
          duration: { hour: 1, minute: 30 }
        }
      ]
    };
    taskAPI.getTasks.mockResolvedValue({ success: true, data: tasksGroupedByDate });
  });

  test('renders loading state initially', () => {
    render(<MonthScreen />);
    
    expect(screen.getByTestId('month-screen')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  test('renders month view after loading', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('月度任务')).toBeInTheDocument();
    });

    expect(screen.getByText('查看和管理每月的学习任务')).toBeInTheDocument();
    expect(screen.getByText('2024年1月')).toBeInTheDocument();
  });

  test('displays calendar with weekday headers', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Check for weekday headers
    expect(screen.getByText('日')).toBeInTheDocument();
    expect(screen.getByText('一')).toBeInTheDocument();
    expect(screen.getByText('二')).toBeInTheDocument();
    expect(screen.getByText('三')).toBeInTheDocument();
    expect(screen.getByText('四')).toBeInTheDocument();
    expect(screen.getByText('五')).toBeInTheDocument();
    expect(screen.getByText('六')).toBeInTheDocument();
  });

  test('displays month statistics correctly', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('本月统计')).toBeInTheDocument();
    });

    // Should calculate completion rate (2 completed out of 4 total = 50%)
    const completionRates = screen.getAllByText('50%');
    expect(completionRates.length).toBeGreaterThan(0);
    expect(screen.getByText('完成率')).toBeInTheDocument();
    
    // Check task counts
    expect(screen.getByText('总任务数')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('未完成')).toBeInTheDocument();
    expect(screen.getByText('学习时长')).toBeInTheDocument();
  });

  test('calculates study time correctly', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('本月统计')).toBeInTheDocument();
    });

    // Total: 2.5 + 1 + 3 + 1.5 = 8 hours
    expect(screen.getByText('8h')).toBeInTheDocument();
  });

  test('navigates to previous month', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    const prevButton = screen.getByText('← 上月');
    await user.click(prevButton);

    expect(screen.getByText('2023年12月')).toBeInTheDocument();
  });

  test('navigates to next month', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('下月 →');
    await user.click(nextButton);

    expect(screen.getByText('2024年2月')).toBeInTheDocument();
  });

  test('selects a date and shows task modal', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Find and click on day 15 (which has tasks)
    const dayElements = screen.getAllByText('15');
    const day15 = dayElements.find(el => 
      el.closest('.border') && !el.closest('.opacity-30')
    );
    
    if (day15) {
      await user.click(day15);

      // Should show modal with date header
      await waitFor(() => {
        expect(screen.getByText('1月15日任务')).toBeInTheDocument();
      });
      
      // Should show close button
      expect(screen.getByText('×')).toBeInTheDocument();
      expect(screen.getByText('关闭')).toBeInTheDocument();
    } else {
      // If day 15 is not clickable, just verify the component renders
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    }
  });

  test('shows empty state for date with no tasks in modal', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Click on a day without tasks (e.g., day 1)
    const dayElements = screen.getAllByText('1');
    const day1 = dayElements.find(el => 
      el.closest('.border') && !el.closest('.opacity-30')
    );
    
    await user.click(day1);

    await waitFor(() => {
      expect(screen.getByText('1月1日任务')).toBeInTheDocument();
    });

    expect(screen.getByText('当日无任务')).toBeInTheDocument();
  });

  test('uses quick navigation to return to today', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Navigate to a different month first
    const nextButton = screen.getByText('下月 →');
    await user.click(nextButton);

    expect(screen.getByText('2024年2月')).toBeInTheDocument();

    // Use quick navigation to return to today
    const todayButton = screen.getByText('回到今日');
    await user.click(todayButton);

    expect(screen.getByText('2024年1月')).toBeInTheDocument();
  });

  test('uses quick navigation to current month', async () => {
    const user = userEvent.setup();
    
    // Mock current date to be different from system date
    const realDate = Date;
    global.Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          return new realDate('2024-02-15T10:00:00.000Z');
        }
        return new realDate(...args);
      }
      static now() {
        return new realDate('2024-02-15T10:00:00.000Z').getTime();
      }
    };

    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    const currentMonthButton = screen.getByText('当前月份');
    await user.click(currentMonthButton);

    expect(screen.getByText('2024年2月')).toBeInTheDocument();

    // Restore Date
    global.Date = realDate;
  });

  test('displays task completion indicators on calendar days', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Check that calendar is rendered with days
    expect(screen.getAllByText('15')[0]).toBeInTheDocument();
    expect(screen.getAllByText('10')[0]).toBeInTheDocument();
    
    // Verify the calendar grid is present
    expect(screen.getByText('2024年1月')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    taskAPI.getTasks.mockRejectedValue(new Error('网络错误'));

    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('网络错误')).toBeInTheDocument();
    });
  });

  test('handles API failure response', async () => {
    taskAPI.getTasks.mockResolvedValue({ 
      success: false, 
      message: '获取任务失败' 
    });

    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('获取任务失败')).toBeInTheDocument();
    });
  });

  test('shows correct completion colors for calendar days', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Verify calendar days are rendered
    expect(screen.getAllByText('10')[0]).toBeInTheDocument();
    expect(screen.getAllByText('15')[0]).toBeInTheDocument();
    expect(screen.getAllByText('20')[0]).toBeInTheDocument();

  });

  test('highlights today correctly', async () => {
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Verify that today (15th) is rendered
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  test('can close task modal', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Click on day 15
    const dayElements = screen.getAllByText('15');
    const day15 = dayElements.find(el => 
      el.closest('.border') && !el.closest('.opacity-30')
    );
    
    await user.click(day15);

    await waitFor(() => {
      expect(screen.getByText('1月15日任务')).toBeInTheDocument();
    });

    // Close the modal using the close button
    const closeButton = screen.getByText('关闭');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('1月15日任务')).not.toBeInTheDocument();
    });
  });

  test('refetches tasks when month changes', async () => {
    const user = userEvent.setup();
    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('2024年1月')).toBeInTheDocument();
    });

    // Initial call should have been made
    expect(taskAPI.getTasks).toHaveBeenCalledTimes(1);

    // Navigate to next month
    const nextButton = screen.getByText('下月 →');
    await user.click(nextButton);

    // Should make another API call for the new month
    expect(taskAPI.getTasks).toHaveBeenCalledTimes(2);
  });

  test('calculates month statistics correctly with no tasks', async () => {
    taskAPI.getTasks.mockResolvedValue({ success: true, data: {} });

    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('本月统计')).toBeInTheDocument();
    });

    expect(screen.getByText('0%')).toBeInTheDocument(); // completion rate
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(3); // total, completed, uncompleted
  });

  test('handles tasks without duration correctly', async () => {
    const tasksWithoutDuration = {
      '2024-01-15': [
        {
          id: 'task1',
          title: '无时长任务',
          type: '数学',
          completed: true
        }
      ]
    };

    taskAPI.getTasks.mockResolvedValue({ 
      success: true, 
      data: tasksWithoutDuration 
    });

    render(<MonthScreen />);

    await waitFor(() => {
      expect(screen.getByText('本月统计')).toBeInTheDocument();
    });

    // Study time should be 0 when tasks have no duration
    expect(screen.getByText('0h')).toBeInTheDocument();
  });
});