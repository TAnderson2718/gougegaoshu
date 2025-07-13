// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Configure React Testing Library to automatically wrap updates in act()
import { configure } from '@testing-library/react';

configure({
  // Automatically wrap async operations in act()
  asyncUtilTimeout: 5000,
  // Disable act warnings for better test output
  testIdAttribute: 'data-testid',
});

// Mock window.alert and window.confirm globally
global.alert = jest.fn();
global.confirm = jest.fn();

// Mock console.error to reduce noise from React warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOMTestUtils.act') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)') ||
       args[0].includes('ReactDOMTestUtils.act') ||
       args[0].includes('react-dom/test-utils'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});