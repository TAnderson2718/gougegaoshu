import { render, screen } from '@testing-library/react';
import App from './App';

// Mock React Router since we're not testing routing
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: () => <div>Route</div>,
  Navigate: () => <div>Navigate</div>,
}));

// Mock the AppContext
jest.mock('./contexts/AppContext', () => ({
  AppProvider: ({ children }) => <div data-testid="app-provider">{children}</div>,
  useApp: () => ({
    isAuthenticated: false,
    loading: false,
    user: null,
    logout: jest.fn(),
  }),
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('app-provider')).toBeInTheDocument();
  });

  test('renders header with application title', () => {
    render(<App />);
    expect(screen.getByText('统一模拟平台')).toBeInTheDocument();
  });

  test('renders student and admin toggle buttons', () => {
    render(<App />);
    expect(screen.getByText('学生端')).toBeInTheDocument();
    expect(screen.getByText('管理员端')).toBeInTheDocument();
  });

  test('renders reset button', () => {
    render(<App />);
    expect(screen.getByText('重置模拟状态')).toBeInTheDocument();
  });
});