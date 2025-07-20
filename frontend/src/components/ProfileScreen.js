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
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // 获取个人档案
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await profileAPI.getProfile();
      
      if (response.success) {
        const profileData = response.data?.profile || {};
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
          mathTargetScore: profileData.targetScore || '',
          dailyStudyHours: profileData.dailyHours || '',

          // 历史信息
          gaoKaoInfo: {
            participated: !!profileData.gaokaoYear,
            year: profileData.gaokaoYear || '',
            province: profileData.gaokaoProvince || '',
            score: profileData.gaokaoScore || ''
          },
          yanKaoInfo: {
            participated: !!profileData.gradExamYear,
            year: profileData.gradExamYear || '',
            mathType: profileData.gradExamMathType || '',
            notTaken: false,
            score: profileData.gradExamScore || ''
          },
          zhuanShengBenInfo: {
            participated: !!profileData.upgradeExamYear,
            province: profileData.upgradeExamProvince || '',
            category: profileData.upgradeExamMathType || '',
            score: profileData.upgradeExamScore || ''
          },

          // 其他信息
          purchasedBooks: profileData.purchasedBooks || '',
          specialRequirements: profileData.notes || ''
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

      // 安全的数值转换函数
      const safeParseInt = (value) => {
        if (!value || value === '' || isNaN(value)) return null;
        const parsed = parseInt(value);
        return isNaN(parsed) ? null : parsed;
      };

      const safeParseFloat = (value) => {
        if (!value || value === '' || isNaN(value)) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      };

      // 转换前端字段名到后端期望的字段名
      const profileData = {
        gender: formData.gender || '',
        age: safeParseInt(formData.age),
        studyStatus: formData.studyStatus || '',
        mathType: formData.mathType || '',
        targetScore: safeParseInt(formData.mathTargetScore),
        dailyHours: safeParseFloat(formData.dailyStudyHours),

        // 高考信息
        gaoKaoYear: formData.gaoKaoInfo?.year || '',
        gaoKaoProvince: formData.gaoKaoInfo?.province || '',
        gaoKaoScore: safeParseInt(formData.gaoKaoInfo?.score),

        // 研考信息
        gradExamYear: formData.yanKaoInfo?.year || '',
        gradExamMathType: formData.yanKaoInfo?.mathType || '',
        gradExamScore: safeParseInt(formData.yanKaoInfo?.score),

        // 专升本信息
        upgradeExamYear: formData.zhuanShengBenInfo?.year || '',
        upgradeExamProvince: formData.zhuanShengBenInfo?.province || '',
        upgradeExamMathType: formData.zhuanShengBenInfo?.category || '',
        upgradeExamScore: safeParseInt(formData.zhuanShengBenInfo?.score),

        // 其他信息
        purchasedBooks: formData.purchasedBooks || '',
        notes: formData.specialRequirements || ''
      };

      const response = await profileAPI.updateProfile(profileData);

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

  // 切换密码显示状态
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // 修改密码
  const changePassword = async () => {
    try {
      console.log('🔐 开始修改密码...');
      setError(null);

      // 验证输入
      if (!passwordData.oldPassword) {
        setError('请输入当前密码');
        return;
      }

      if (!passwordData.newPassword) {
        setError('请输入新密码');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('新密码与确认密码不一致');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('新密码长度不能少于6位');
        return;
      }

      console.log('📤 发送密码修改请求...');
      const response = await authAPI.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });

      console.log('📨 密码修改响应:', response);

      if (response.success) {
        setIsChangingPassword(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswords({ oldPassword: false, newPassword: false, confirmPassword: false });
        alert('密码修改成功');
      } else {
        setError(response.message || '密码修改失败');
      }
    } catch (err) {
      console.error('❌ 密码修改错误:', err);
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
        mathTargetScore: profile.targetScore || '',
        dailyStudyHours: profile.dailyHours || '',

        // 历史信息
        gaoKaoInfo: {
          participated: !!profile.gaokaoYear,
          year: profile.gaokaoYear || '',
          province: profile.gaokaoProvince || '',
          score: profile.gaokaoScore || ''
        },
        yanKaoInfo: {
          participated: !!profile.gradExamYear,
          year: profile.gradExamYear || '',
          mathType: profile.gradExamMathType || '',
          notTaken: false,
          score: profile.gradExamScore || ''
        },
        zhuanShengBenInfo: {
          participated: !!profile.upgradeExamYear,
          province: profile.upgradeExamProvince || '',
          category: profile.upgradeExamMathType || '',
          score: profile.upgradeExamScore || ''
        },

        // 其他信息
        purchasedBooks: profile.purchasedBooks || '',
        specialRequirements: profile.notes || ''
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
    // 用户编号就是学生ID
    return user?.id || '未设置';
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
                用户编号（学生ID）
              </label>
              <div className="text-sm text-gray-600 mb-2">
                您的学生ID，用于登录系统
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
                  性别
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
                  年龄
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
                学习状态
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
                  考研数学类型
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
                  考研数学目标分数
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
                  每日数学学习时长（小时）
                </label>
                <input
                  type="number"
                  name="dailyStudyHours"
                  value={formData.dailyStudyHours}
                  onChange={handleInputChange}
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="请输入每日学习时长"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  每周学习时长约 {(formData.dailyStudyHours * 6).toFixed(1)} 小时，每月学习时长约 {(formData.dailyStudyHours * 24).toFixed(1)} 小时
                </p>
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
              <label className="block text-sm font-medium text-gray-500">用户编号（学生ID）</label>
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
                  <div className="relative">
                    <input
                      type={showPasswords.oldPassword ? "text" : "password"}
                      name="oldPassword"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('oldPassword')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.oldPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    新密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.newPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.newPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    确认新密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirmPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
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
