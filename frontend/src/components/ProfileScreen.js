import React, { useState, useEffect } from 'react';
import { profileAPI, authAPI } from '../services/api';
import { useApp } from '../contexts/AppContext';

const ProfileScreen = () => {
  const { user, logout } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    major: '',
    grade: '',
    targetSchool: '',
    studyGoal: '',
    bio: ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 获取个人档案
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await profileAPI.getProfile();
      
      if (response.success) {
        const profileData = response.data || {};
        setProfile(profileData);
        setFormData({
          name: profileData.name || user?.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          major: profileData.major || '',
          grade: profileData.grade || '',
          targetSchool: profileData.targetSchool || '',
          studyGoal: profileData.studyGoal || '',
          bio: profileData.bio || ''
        });
      } else {
        setError(response.message || '获取档案失败');
      }
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 更新个人档案
  const updateProfile = async () => {
    try {
      setError(null);
      
      const response = await profileAPI.updateProfile(formData);
      
      if (response.success) {
        setProfile({ ...profile, ...formData });
        setIsEditing(false);
        alert('档案更新成功');
      } else {
        setError(response.message || '更新档案失败');
      }
    } catch (err) {
      setError(err.message || '更新档案失败');
    }
  };

  // 修改密码
  const changePassword = async () => {
    try {
      setError(null);
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('新密码与确认密码不一致');
        return;
      }
      
      if (passwordData.newPassword.length < 6) {
        setError('新密码长度不能少于6位');
        return;
      }
      
      const response = await authAPI.changePassword(
        passwordData.oldPassword, 
        passwordData.newPassword
      );
      
      if (response.success) {
        setIsChangingPassword(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        alert('密码修改成功');
      } else {
        setError(response.message || '密码修改失败');
      }
    } catch (err) {
      setError(err.message || '密码修改失败');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        name: profile.name || user?.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        major: profile.major || '',
        grade: profile.grade || '',
        targetSchool: profile.targetSchool || '',
        studyGoal: profile.studyGoal || '',
        bio: profile.bio || ''
      });
    }
  };

  // 退出登录
  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div data-testid="profile-screen" className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="profile-screen" className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">个人中心</h1>
        <p className="text-gray-600">管理您的个人信息和学习档案</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 个人信息卡片 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">个人信息</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  编辑信息
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      邮箱
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      手机号码
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      专业
                    </label>
                    <input
                      type="text"
                      name="major"
                      value={formData.major}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      年级
                    </label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择年级</option>
                      <option value="大一">大一</option>
                      <option value="大二">大二</option>
                      <option value="大三">大三</option>
                      <option value="大四">大四</option>
                      <option value="研一">研一</option>
                      <option value="研二">研二</option>
                      <option value="研三">研三</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      目标院校
                    </label>
                    <input
                      type="text"
                      name="targetSchool"
                      value={formData.targetSchool}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学习目标
                  </label>
                  <input
                    type="text"
                    name="studyGoal"
                    value={formData.studyGoal}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：考取XXX大学计算机科学专业研究生"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    个人简介
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="简单介绍一下自己..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={updateProfile}
                    className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">姓名</label>
                    <p className="mt-1 text-gray-900">{formData.name || '未填写'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">邮箱</label>
                    <p className="mt-1 text-gray-900">{formData.email || '未填写'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">手机号码</label>
                    <p className="mt-1 text-gray-900">{formData.phone || '未填写'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">专业</label>
                    <p className="mt-1 text-gray-900">{formData.major || '未填写'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">年级</label>
                    <p className="mt-1 text-gray-900">{formData.grade || '未填写'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">目标院校</label>
                    <p className="mt-1 text-gray-900">{formData.targetSchool || '未填写'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">学习目标</label>
                  <p className="mt-1 text-gray-900">{formData.studyGoal || '未填写'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">个人简介</label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{formData.bio || '未填写'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 账户信息 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">账户信息</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">学生ID</label>
                <p className="mt-1 text-gray-900 font-mono">{user?.id || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">注册时间</label>
                <p className="mt-1 text-gray-900">
                  {user?.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString('zh-CN')
                    : '未知'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">最后登录</label>
                <p className="mt-1 text-gray-900">
                  {user?.lastLoginAt 
                    ? new Date(user.lastLoginAt).toLocaleString('zh-CN')
                    : '首次登录'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* 密码修改 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">安全设置</h3>
            
            {!isChangingPassword ? (
              <div className="space-y-3">
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  修改密码
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 border border-gray-300"
                >
                  🚪 退出登录
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    当前密码
                  </label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新密码
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={changePassword}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    确认修改
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 学习统计 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">学习统计</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">本月完成任务</span>
                <span className="font-semibold">0 项</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总学习时长</span>
                <span className="font-semibold">0 小时</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">平均完成率</span>
                <span className="font-semibold">0%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">连续打卡</span>
                <span className="font-semibold">0 天</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;