import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const AdminLogin = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    adminId: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 清除错误信息
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.adminId || !formData.password) {
      setError('请填写完整的登录信息');
      return;
    }

    await performLogin(formData.adminId, formData.password);
  };

  const handleQuickLogin = async (adminId, password) => {
    // 填充表单数据
    setFormData({
      adminId,
      password
    });

    await performLogin(adminId, password);
  };

  const performLogin = async (adminId, password) => {
    setLoading(true);
    setError('');

    try {
      console.log('🔐 管理员登录尝试:', adminId);
      const response = await authAPI.adminLogin(adminId, password);
      console.log('📨 管理员登录响应:', response);

      if (response.success) {
        const { token, admin } = response.data;

        // 保存到localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          ...admin,
          studentId: admin.id, // 为了兼容性
          userType: 'admin'
        }));

        console.log('✅ 管理员登录成功:', admin);

        // 登录成功后重新加载页面，确保认证状态正确更新
        setTimeout(() => {
          window.location.reload();
        }, 100); // 短暂延迟确保localStorage已保存

        // 调用成功回调（如果有的话）
        if (onLoginSuccess) {
          onLoginSuccess(admin);
        }
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err) {
      console.error('❌ 管理员登录错误:', err);
      setError(err.message || '登录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            考研任务管理系统 - 管理员端
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请使用管理员账号登录
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="adminId" className="sr-only">
                管理员ID
              </label>
              <input
                id="adminId"
                name="adminId"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="管理员ID (如: ADMIN001)"
                value={formData.adminId}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="密码"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/student"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              返回学生端
            </a>
          </div>
        </form>

        {/* 快速登录按钮 */}
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-gray-600">快速登录</p>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN001', 'Hello888')}
              disabled={loading}
              className="flex-1 py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-center">
                <div className="font-semibold">超级管理员</div>
                <div className="text-xs text-gray-500">ADMIN001</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN002', 'AdminPass123')}
              disabled={loading}
              className="flex-1 py-2 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-center">
                <div className="font-semibold">普通管理员</div>
                <div className="text-xs text-gray-500">ADMIN002</div>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          <p>默认管理员账户: ADMIN001, ADMIN002</p>
          <p>默认密码: ADMIN001-Hello888, ADMIN002-AdminPass123</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
