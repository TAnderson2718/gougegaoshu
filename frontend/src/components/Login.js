import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

const Login = ({ adminMode = false }) => {
  const { login, loading, error } = useApp();
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    rememberMe: false
  });
  const [loginError, setLoginError] = useState('');

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

    const result = await login(
      formData.studentId.toUpperCase().trim(), 
      formData.password, 
      formData.rememberMe
    );

    if (!result.success) {
      setLoginError(result.message);
    }
  };

  // 快速登录功能
  const handleQuickLogin = async (studentId, password) => {
    console.log(`🚀 快速登录开始: ${studentId}`);
    setLoginError('');
    
    try {
      const result = await login(studentId, password, false);
      console.log(`📊 登录结果:`, result);
      
      if (!result.success) {
        console.error(`❌ 登录失败: ${result.message}`);
        setLoginError(result.message);
      } else {
        console.log(`✅ 登录成功: ${studentId}`);
      }
    } catch (error) {
      console.error(`❌ 登录异常:`, error);
      setLoginError(error.message || '登录过程中发生错误');
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
          <h1 className="text-3xl font-bold text-gray-800">{adminMode ? '管理员登录' : '学生登录'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="studentId"
              placeholder={adminMode ? "管理员ID (例如: ADMIN001)" : "学生ID (例如: ST001)"}
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
          <p>学生初始密码: TestPass123</p>
          <p>管理员初始密码: AdminPass123</p>
        </div>

        {/* 快速登录按钮 - 仅用于测试 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-3 font-medium">🧪 测试快速登录</p>
          <div className="space-y-2">
            {adminMode ? (
              <>
                <button
                  onClick={() => handleQuickLogin('ADMIN001', 'AdminPass123')}
                  disabled={loading}
                  className="w-full bg-green-500 text-white p-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  管理员ADMIN001 (初始密码)
                </button>
                <button
                  onClick={() => handleQuickLogin('ADMIN002', 'AdminPass123')}
                  disabled={loading}
                  className="w-full bg-green-500 text-white p-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  管理员ADMIN002 (初始密码)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleQuickLogin('ST001', 'Hello888')}
                  disabled={loading}
                  className="w-full bg-green-500 text-white p-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  学生ST001 (初始密码)
                </button>
                <button
                  onClick={() => handleQuickLogin('ST002', 'Hello888')}
                  disabled={loading}
                  className="w-full bg-green-500 text-white p-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  学生ST002 (初始密码)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
