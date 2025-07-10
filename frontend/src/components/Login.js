import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';

const Login = () => {
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

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="https://i.postimg.cc/pdmk3gkb/e9398b353525a8d77a431307d7e0cd1a.png" 
            alt="Logo" 
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-gray-800">学生登录</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="studentId"
              placeholder="学生ID (例如: ST001)"
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
          <p>初始密码: Hello888</p>
          <p>首次登录需要修改密码</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
