import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import StudentApp from './components/StudentApp';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// 路由保护组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useApp();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 主应用组件
const AppContent = () => {
  const { user, isAuthenticated, loading } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果已登录但需要强制修改密码
  if (isAuthenticated && user?.forcePasswordChange) {
    return <ChangePassword />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <StudentApp />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// 应用切换器（学生端/管理员端）
const AppSwitcher = () => {
  const [view, setView] = React.useState('student');
  const { logout } = useApp();

  const resetState = () => {
    logout();
    // 清除其他本地存储
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="w-full min-h-screen">
      <header className="w-full bg-white p-4 shadow-md flex justify-center items-center space-x-4 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-gray-800">统一模拟平台</h1>
        <div className="p-1 bg-gray-200 rounded-lg flex items-center">
          <button
            onClick={() => setView('student')}
            className={`px-4 py-1 rounded-md text-sm font-semibold ${
              view === 'student' ? 'bg-white shadow' : 'bg-transparent text-gray-600'
            }`}
          >
            学生端
          </button>
          <button
            onClick={() => setView('admin')}
            className={`px-4 py-1 rounded-md text-sm font-semibold ${
              view === 'admin' ? 'bg-white shadow' : 'bg-transparent text-gray-600'
            }`}
          >
            管理员端
          </button>
        </div>
        <button
          onClick={resetState}
          className="ml-4 text-sm bg-red-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-red-600"
        >
          重置模拟状态
        </button>
      </header>
      
      {view === 'student' ? <AppContent /> : <AdminDashboard />}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppSwitcher />
      </Router>
    </AppProvider>
  );
}

export default App;
