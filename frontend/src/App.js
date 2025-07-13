import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
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
  
  return isAuthenticated ? children : <Navigate to="/student" replace />;
};


// 学生端页面
const StudentPage = () => {
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

  // 检查是否是管理员 - 与AdminPage保持一致
  const isAdmin = user && (
    user.userType === 'admin' ||
    user.studentId?.startsWith('ADMIN') ||
    ['ADMIN001', 'ADMIN002'].includes(user.studentId)
  );

  // 调试信息
  console.log('StudentPage - 用户信息:', user);
  console.log('StudentPage - 是否管理员:', isAdmin);
  console.log('StudentPage - 是否已认证:', isAuthenticated);

  return (
    <div className="w-full min-h-screen">
      <header className="w-full bg-white p-4 shadow-md flex justify-center items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-gray-800">考研任务管理系统 - 学生端</h1>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            // 如果已登录且是管理员，重定向到管理员端；如果是学生，重定向到学生端主页；否则显示登录
            isAuthenticated ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/student/home" replace />
            ) : <Login />
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              {isAdmin ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                  <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">管理员账号</h2>
                    <p className="text-gray-600 mb-4">您使用的是管理员账号，请访问管理员端。</p>
                    <button
                      onClick={() => window.location.href = '/admin'}
                      className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      前往管理员端
                    </button>
                  </div>
                </div>
              ) : (
                <StudentApp />
              )}
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </div>
  );
};

// 管理员端页面
const AdminPage = () => {
  const { user, isAuthenticated, refreshAuth } = useApp();

  // 检查是否是管理员 - 更严格的检查
  const isAdmin = user && (
    user.userType === 'admin' ||
    user.studentId?.startsWith('ADMIN') ||
    ['ADMIN001', 'ADMIN002'].includes(user.studentId)
  );

  // 如果未登录，显示管理员登录页面
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="w-full min-h-screen">
      <header className="w-full bg-white p-4 shadow-md flex justify-center items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-gray-800">考研任务管理系统 - 管理员端</h1>
      </header>

      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">访问被拒绝</h2>
            <p className="text-gray-600 mb-4">您没有管理员权限访问此页面。</p>
            <p className="text-sm text-gray-500 mb-4">当前登录的是学生账号 ({user?.studentId})，请使用管理员账号登录：ADMIN001 或 ADMIN002</p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="block mx-auto px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                清除登录信息并重新登录
              </button>
              <button
                onClick={() => window.location.href = '/student'}
                className="block mx-auto px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                返回学生端
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-4">
              调试信息: 当前用户ID: {user?.studentId}, 是否为管理员: {isAdmin ? '是' : '否'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* 根路径重定向到学生端 */}
          <Route path="/" element={<Navigate to="/student" replace />} />

          {/* 管理员端路由 */}
          <Route path="/admin/*" element={<AdminPage />} />

          {/* 学生端路由 */}
          <Route path="/student/*" element={<StudentPage />} />

          {/* 其他路径重定向到学生端 */}
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
