import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const ChangePassword = () => {
  const { forceChangePassword, logout } = useApp();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // 清除错误信息
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    const result = await forceChangePassword(formData.newPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">首次登录</h1>
          <p className="text-gray-600">请修改您的初始密码</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              name="newPassword"
              placeholder="新密码（至少6位）"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              name="confirmPassword"
              placeholder="确认新密码"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '修改中...' : '确认修改'}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full mt-4 text-sm text-gray-500 hover:underline"
            disabled={loading}
          >
            返回登录
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
