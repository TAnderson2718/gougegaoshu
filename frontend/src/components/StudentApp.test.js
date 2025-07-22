import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentApp from './StudentApp';

// Mock the child components
jest.mock('./TodayScreen', () => {
  return function TodayScreen() {
    return <div data-testid="today-screen">Today Screen</div>;
  };
});

jest.mock('./MonthScreen', () => {
  return function MonthScreen() {
    return <div data-testid="month-screen">Month Screen</div>;
  };
});

jest.mock('./ProfileScreen', () => {
  return function ProfileScreen() {
    return <div data-testid="profile-screen">Profile Screen</div>;
  };
});

// Mock the taskAPI
jest.mock('../services/api', () => ({
  taskAPI: {
    getTasks: jest.fn(() => Promise.resolve({
      success: true,
      data: {
        '2024-01-01': [
          { id: 1, type: '学习', title: '测试任务' }
        ]
      }
    }))
  }
}));

// Mock the AppContext
const mockUser = { id: 'ST001', name: '测试用户' };
const mockAdvanceDay = jest.fn(() => Promise.resolve());
const mockResetToInitialDate = jest.fn();
const mockInitialDate = new Date('2024-01-01');

jest.mock('../contexts/AppContext', () => ({
  useApp: () => ({
    user: mockUser,
    systemDate: new Date('2024-01-01'),
    advanceDay: mockAdvanceDay,
    resetToInitialDate: mockResetToInitialDate,
    initialDate: mockInitialDate,
  }),
}));

describe('StudentApp Component', () => {
  test('renders with default tab active', () => {
    render(<StudentApp />);
    
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('month-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-screen')).not.toBeInTheDocument();
  });

  test('renders navigation with all tabs', () => {
    render(<StudentApp />);
    
    expect(screen.getByText('当日任务')).toBeInTheDocument();
    expect(screen.getByText('月度任务')).toBeInTheDocument();
    expect(screen.getByText('个人中心')).toBeInTheDocument();
    
    // Check for emoji icons
    expect(screen.getByText('📅')).toBeInTheDocument();
    expect(screen.getByText('🗓️')).toBeInTheDocument();
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  test('switches to month screen when month tab is clicked', async () => {
    const user = userEvent.setup();
    render(<StudentApp />);
    
    const monthTab = screen.getByText('月度任务');
    await user.click(monthTab);
    
    expect(screen.getByTestId('month-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('today-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-screen')).not.toBeInTheDocument();
  });

  test('switches to profile screen when profile tab is clicked', async () => {
    const user = userEvent.setup();
    render(<StudentApp />);
    
    const profileTab = screen.getByText('个人中心');
    await user.click(profileTab);
    
    expect(screen.getByTestId('profile-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('today-screen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('month-screen')).not.toBeInTheDocument();
  });

  test('changes active tab correctly', async () => {
    const user = userEvent.setup();
    render(<StudentApp />);
    
    // Initially today screen should be visible
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('month-screen')).not.toBeInTheDocument();
    
    // Click month tab
    const monthTabButton = screen.getByRole('button', { name: /月度任务/i });
    await user.click(monthTabButton);
    
    // Month screen should now be visible
    expect(screen.getByTestId('month-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('today-screen')).not.toBeInTheDocument();
    
    // Click today tab again
    const todayTabButton = screen.getByRole('button', { name: /当日任务/i });
    await user.click(todayTabButton);
    
    // Today screen should be visible again
    expect(screen.getByTestId('today-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('month-screen')).not.toBeInTheDocument();
  });

  test('shows daily reminder modal initially', () => {
    render(<StudentApp />);
    
    expect(screen.getByText('每日提醒')).toBeInTheDocument();
    expect(screen.getByText('同学你好，今天的学习任务已经发布，请记得按时完成哦！')).toBeInTheDocument();
    expect(screen.getByText('确认')).toBeInTheDocument();
  });

  test('closes reminder modal when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<StudentApp />);
    
    const confirmButton = screen.getByText('确认');
    await user.click(confirmButton);
    
    expect(screen.queryByText('每日提醒')).not.toBeInTheDocument();
  });

  test('reminder modal has correct overlay styling', () => {
    render(<StudentApp />);
    
    const modal = screen.getByText('每日提醒').closest('div').parentElement;
    expect(modal).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'justify-center', 'items-center', 'z-50');
  });

  test('renders with responsive layout structure', () => {
    render(<StudentApp />);
    
    const container = screen.getByText('当日任务').closest('.w-full');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('min-h-screen', 'flex', 'flex-col', 'bg-gray-50');
  });

  test('renders date control section with proper buttons', () => {
    render(<StudentApp />);
    
    // Check for date control section
    expect(screen.getByText('🧪 测试日期控制:')).toBeInTheDocument();
    
    // Check for advance day button
    expect(screen.getByText('+1天')).toBeInTheDocument();
    
    // Check for reset button
    expect(screen.getByText('重置')).toBeInTheDocument();
    
    // Check for current date display
    expect(screen.getByText(/当前:/)).toBeInTheDocument();
  });

  test('advance day button calls advanceDay function', async () => {
    const user = userEvent.setup();
    render(<StudentApp />);
    
    const advanceButton = screen.getByText('+1天');
    await user.click(advanceButton);
    
    expect(mockAdvanceDay).toHaveBeenCalledTimes(1);
  });

  // 重置功能已移除，仅管理员可用

  test('only shows advance day button (reset removed for students)', () => {
    render(<StudentApp />);

    // Should show advance day button
    expect(screen.getByText('+1天')).toBeInTheDocument();

    // Should NOT show reset button (removed for students)
    expect(screen.queryByText('重置')).not.toBeInTheDocument();

    // Should not show specific date buttons
    expect(screen.queryByText('7/15')).not.toBeInTheDocument();
    expect(screen.queryByText('7/16')).not.toBeInTheDocument();
  });

  test('displays helpful instruction text', () => {
    render(<StudentApp />);
    
    expect(screen.getByText(/只能前进到未来日期，重置回到初始状态/)).toBeInTheDocument();
  });
});