import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, loading, error, user, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    rememberMe: false
  });
  const [loginError, setLoginError] = useState('');
  const [quickLoginStatus, setQuickLoginStatus] = useState('');
  const [hasRedirected, setHasRedirected] = useState(false);

  // 调试：监控状态变化
  console.log('🔍 Login 组件渲染 - 当前状态:', {
    isAuthenticated,
    user: user ? `${user.id || user.studentId}` : null,
    hasRedirected,
    loading,
    timestamp: new Date().toISOString()
  });

  // 加载保存的登录信息
  useEffect(() => {
    try {
      const savedCredentials = localStorage.getItem('savedCredentials');
      if (savedCredentials) {
        const { studentId, password } = JSON.parse(savedCredentials);
        setFormData(prev => ({
          ...prev,
          studentId,
          password,
          rememberMe: true
        }));
      }
    } catch (error) {
      console.error('加载保存的登录信息失败:', error);
    }
  }, []);

  // 监听认证状态变化，登录成功后自动重定向
  useEffect(() => {
    console.log('🔍 useEffect 触发 - 状态检查:', {
      isAuthenticated,
      user: user ? `${user.id || user.studentId}` : null,
      hasRedirected,
      userObject: user
    });

    console.log('🔍 条件检查:', {
      'isAuthenticated': isAuthenticated,
      'user存在': !!user,
      'hasRedirected': hasRedirected,
      '条件满足': isAuthenticated && user && !hasRedirected
    });

    if (isAuthenticated && user && !hasRedirected) {
      console.log('🔄 检测到登录成功，准备重定向...');
      console.log('👤 用户信息:', user);



      // 检查是否是管理员
      const isAdmin = user && (
        user.userType === 'admin' ||
        user.role === 'admin' ||
        user.studentId?.startsWith('ADMIN') ||
        user.id?.startsWith('ADMIN') ||
        user.studentId === 'ADMIN' ||
        user.id === 'ADMIN'
      );

      console.log('🔍 用户角色检查:', { isAdmin, userType: user.userType, id: user.id });

      // 设置重定向标志，防止重复重定向
      setHasRedirected(true);

      // 根据用户角色重定向
      if (isAdmin) {
        console.log('➡️ 重定向到管理员端...');
        navigate('/admin', { replace: true });
      } else {
        console.log('➡️ 重定向到学生端...');
        navigate('/student', { replace: true });
      }
    }
  }, [isAuthenticated, user, hasRedirected, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!formData.studentId.trim() || !formData.password.trim()) {
      setLoginError('请输入学生ID和密码');
      return;
    }

    console.log('🚀 开始登录流程...');
    const result = await login(
      formData.studentId.toUpperCase().trim(),
      formData.password,
      formData.rememberMe
    );

    console.log('📋 登录结果:', result);
    if (!result.success) {
      setLoginError(result.message);
    } else {
      console.log('✅ 登录成功，等待状态更新和重定向...');
    }
  };

  // 快速登录功能
  const handleQuickLogin = async (studentId, password) => {
    console.log(`🚀 快速登录开始: ${studentId}`);

    setLoginError('');
    setQuickLoginStatus(`正在登录 ${studentId}...`);

    try {
      console.log(`📞 调用 login 函数...`);
      const result = await login(studentId, password, false);
      console.log(`📊 登录结果:`, result);

      if (!result || !result.success) {
        const errorMsg = result?.message || '登录失败，未知错误';
        console.error(`❌ 登录失败: ${errorMsg}`);
        setLoginError(errorMsg);
        setQuickLoginStatus('');
      } else {
        console.log(`✅ 登录成功: ${studentId}`);
        setQuickLoginStatus(`登录成功，正在跳转...`);

        // 等待状态更新
        setTimeout(() => {
          console.log(`👤 登录后用户状态:`, user);
          console.log(`🔐 登录后认证状态:`, { isAuthenticated, loading });
          console.log(`💾 localStorage token:`, localStorage.getItem('token'));
          console.log(`💾 localStorage user:`, localStorage.getItem('user'));
        }, 500);
      }
    } catch (error) {
      console.error(`❌ 登录异常:`, error);
      console.error(`❌ 错误堆栈:`, error.stack);
      setLoginError(error.message || '登录过程中发生错误');
      setQuickLoginStatus('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="https://i.postimg.cc/pdmk3gkb/e9398b353525a8d77a431307d7e0cd1a.png" 
            alt="Logo" 
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-gray-800">考研任务管理系统</h1>
          <p className="text-gray-600 mt-2">请选择您的身份登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="studentId"
              placeholder="用户ID (学生: ST001, 管理员: ADMIN)"
              value={formData.studentId}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="密码"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              记住密码
            </label>
          </div>

          {(loginError || error) && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {loginError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>学生初始密码: Hello888</p>
          <p>管理员初始密码: AdminPass123</p>
        </div>

        {/* 快速登录按钮 - 仅用于测试 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-3 font-medium">🧪 测试快速登录</p>

          {quickLoginStatus && (
            <div className="mb-3 p-2 bg-blue-100 border border-blue-300 text-blue-700 rounded text-sm">
              {quickLoginStatus}
            </div>
          )}
          <div className="space-y-2">
            <div className="text-xs text-gray-600 mb-2">学生账号:</div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickLogin('ST001', 'Hello888');
              }}
              disabled={loading}
              type="button"
              className="w-full bg-blue-500 text-white p-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              学生ST001 (初始密码)
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickLogin('ST002', 'Hello888');
              }}
              disabled={loading}
              type="button"
              className="w-full bg-blue-500 text-white p-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              学生ST002 (初始密码)
            </button>

            <div className="text-xs text-gray-600 mb-2 mt-4">管理员账号:</div>
            <button
              onClick={() => handleQuickLogin('ADMIN', 'AdminPass123')}
              disabled={loading}
              className="w-full bg-green-500 text-white p-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
            >
              管理员ADMIN (初始密码)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
