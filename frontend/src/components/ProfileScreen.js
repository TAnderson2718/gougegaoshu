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
    // 基本信息
    name: '',
    gender: '',
    age: '',
    
    // 学习状态
    studyStatus: '',
    
    // 考研数学信息
    mathType: '',
    mathTargetScore: '',
    dailyStudyHours: '',
    
    // 历史信息
    gaoKaoInfo: {
      participated: false,
      year: '',
      province: '',
      score: ''
    },
    yanKaoInfo: {
      participated: false,
      year: '',
      mathType: '',
      notTaken: false,
      score: ''
    },
    zhuanShengBenInfo: {
      participated: false,
      province: '',
      category: '',
      score: ''
    },
    
    // 其他信息
    purchasedBooks: '',
    specialRequirements: ''
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
          // 基本信息
          name: profileData.name || user?.name || '',
          gender: profileData.gender || '',
          age: profileData.age || '',
          
          // 学习状态
          studyStatus: profileData.studyStatus || '',
          
          // 考研数学信息
          mathType: profileData.mathType || '',
          mathTargetScore: profileData.mathTargetScore || '',
          dailyStudyHours: profileData.dailyStudyHours || '',
          
          // 历史信息
          gaoKaoInfo: profileData.gaoKaoInfo || {
            participated: false,
            year: '',
            province: '',
            score: ''
          },
          yanKaoInfo: profileData.yanKaoInfo || {
            participated: false,
            year: '',
            mathType: '',
            notTaken: false,
            score: ''
          },
          zhuanShengBenInfo: profileData.zhuanShengBenInfo || {
            participated: false,
            province: '',
            category: '',
            score: ''
          },
          
          // 其他信息
          purchasedBooks: profileData.purchasedBooks || '',
          specialRequirements: profileData.specialRequirements || ''
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
      
      const response = await authAPI.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      
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
    const { name, value, type, checked } = e.target;
    
    // 处理嵌套对象的更新
    if (name.includes('.')) {
      const [parentKey, childKey] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parentKey]: {
          ...prev[parentKey],
          [childKey]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        // 基本信息
        name: profile.name || user?.name || '',
        gender: profile.gender || '',
        age: profile.age || '',
        
        // 学习状态
        studyStatus: profile.studyStatus || '',
        
        // 考研数学信息
        mathType: profile.mathType || '',
        mathTargetScore: profile.mathTargetScore || '',
        dailyStudyHours: profile.dailyStudyHours || '',
        
        // 历史信息
        gaoKaoInfo: profile.gaoKaoInfo || {
          participated: false,
          year: '',
          province: '',
          score: ''
        },
        yanKaoInfo: profile.yanKaoInfo || {
          participated: false,
          year: '',
          mathType: '',
          notTaken: false,
          score: ''
        },
        zhuanShengBenInfo: profile.zhuanShengBenInfo || {
          participated: false,
          province: '',
          category: '',
          score: ''
        },
        
        // 其他信息
        purchasedBooks: profile.purchasedBooks || '',
        specialRequirements: profile.specialRequirements || ''
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

  // 生成用户编号
  const generateUserCode = () => {
    if (!user?.createdAt) return '未设置';
    const date = new Date(user.createdAt);
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const userIndex = user?.id || '1';
    const mathType = formData.mathType === '数一' ? '1' : 
                    formData.mathType === '数二' ? '2' : 
                    formData.mathType === '数三' ? '3' : 'A';
    const packageType = 'A'; // 默认套餐类型
    return `${year}${month}${day}.${userIndex}.${mathType}.${packageType}`;
  };

  return (
    <div data-testid="profile-screen" className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">个人中心</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

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
          <div className="space-y-6">
            {/* 用户编号 */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户编号（自动编号，例如 25528.1.A.x）
              </label>
              <div className="text-sm text-gray-600 mb-2">
                ({generateUserCode().slice(0, 5)} 代表 25 年 5 月 28 日注册，1 代表考研数学一，A 代表消费套餐 A，xx 代表是当天第 xx 注册的用户)
              </div>
              <input
                type="text"
                value={generateUserCode()}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
              />
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  性别【xxx 滑动男女确定】
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  年龄【xxx 滑动数字确定】
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="16"
                  max="60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 学习状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                学习状态【在读应届考研/在职全职考研/在职考研/其他（文本输入）】
              </label>
              <select
                name="studyStatus"
                value={formData.studyStatus}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择</option>
                <option value="在读应届考研">在读应届考研</option>
                <option value="在职全职考研">在职全职考研</option>
                <option value="在职考研">在职考研</option>
                <option value="其他">其他</option>
              </select>
            </div>

            {/* 考研数学信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  考研数学类型【滑动选择（数一、数二、数三、其他（文本输入））】
                </label>
                <select
                  name="mathType"
                  value={formData.mathType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="数一">数一</option>
                  <option value="数二">数二</option>
                  <option value="数三">数三</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  考研数学目标分【70-150分，每5分一个段】
                </label>
                <select
                  name="mathTargetScore"
                  value={formData.mathTargetScore}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">请选择目标分数</option>
                  {Array.from({length: 17}, (_, i) => {
                    const score = 70 + (i * 5);
                    return (
                      <option key={score} value={score}>
                        {score}分
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  每日数学学习时长【xxx 滑动数字确定】可以自动总结每周学习时长 x6，每月学习时长 x24
                </label>
                <input
                  type="number"
                  name="dailyStudyHours"
                  value={formData.dailyStudyHours}
                  onChange={handleInputChange}
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
          <div className="space-y-6">
            {/* 用户编号 */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500">用户编号</label>
              <p className="mt-1 text-gray-900 font-mono">{generateUserCode()}</p>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">姓名</label>
                <p className="mt-1 text-gray-900">{formData.name || '未填写'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">性别</label>
                <p className="mt-1 text-gray-900">{formData.gender || '未填写'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">年龄</label>
                <p className="mt-1 text-gray-900">{formData.age || '未填写'}</p>
              </div>
            </div>

            {/* 学习状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-500">学习状态</label>
              <p className="mt-1 text-gray-900">{formData.studyStatus || '未填写'}</p>
            </div>

            {/* 考研数学信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">考研数学类型</label>
                <p className="mt-1 text-gray-900">{formData.mathType || '未填写'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">考研数学目标分</label>
                <p className="mt-1 text-gray-900">{formData.mathTargetScore ? `${formData.mathTargetScore}分` : '未填写'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">每日数学学习时长</label>
                <p className="mt-1 text-gray-900">
                  {formData.dailyStudyHours ? (
                    <>
                      {formData.dailyStudyHours}小时/天
                      <br />
                      <span className="text-sm text-gray-600">
                        每周: {(formData.dailyStudyHours * 6).toFixed(1)}小时
                        <br />
                        每月: {(formData.dailyStudyHours * 24).toFixed(1)}小时
                      </span>
                    </>
                  ) : '未填写'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 底部操作区域 */}
        {!isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                修改密码
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                🚪 退出登录
              </button>
            </div>
          </div>
        )}

        {/* 修改密码弹窗 */}
        {isChangingPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">修改密码</h3>
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
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={changePassword}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    确认修改
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;
