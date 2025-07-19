import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, taskAPI } from '../services/api';
import { performStudentReset } from '../utils/dataConsistency';

const AppContext = createContext();

// 初始状态
const initialDate = new Date();
const savedSystemDate = localStorage.getItem('systemDate');
const currentSystemDate = savedSystemDate ? new Date(savedSystemDate) : new Date(initialDate);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  systemDate: currentSystemDate,
  initialDate: new Date(initialDate)
};

// Action类型
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT',
  SET_SYSTEM_DATE: 'SET_SYSTEM_DATE'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case actionTypes.SET_USER:
      console.log('🔄 Reducer SET_USER 执行:', {
        payload: action.payload,
        isAuthenticated: !!action.payload
      });
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null
      };
    
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case actionTypes.LOGOUT:
      return { 
        ...state, 
        user: null, 
        isAuthenticated: false, 
        loading: false 
      };
    
    case actionTypes.SET_SYSTEM_DATE:
      return { ...state, systemDate: action.payload };
    
    default:
      return state;
  }
}

// Context Provider
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 初始化时检查token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          // 验证token是否有效
          const response = await authAPI.verify();
          if (response.success) {
            dispatch({ 
              type: actionTypes.SET_USER, 
              payload: JSON.parse(savedUser) 
            });
          } else {
            // token无效，清除本地存储
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            dispatch({ type: actionTypes.LOGOUT });
          }
        } catch (error) {
          console.error('Token验证失败:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: actionTypes.LOGOUT });
        }
      } else {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    };

    initAuth();
  }, []);

  // 登录
  const login = async (studentId, password, rememberMe = false) => {
    try {
      console.log(`🔐 AppContext login 开始: ${studentId}`);
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.SET_ERROR, payload: null });

      // 判断是管理员还是学生登录
      const isAdmin = studentId.toUpperCase().startsWith('ADMIN');

      console.log(`🌐 使用 authAPI 调用${isAdmin ? '管理员' : '学生'}登录接口`);
      const response = isAdmin
        ? await authAPI.adminLogin(studentId, password)
        : await authAPI.login(studentId, password);

      console.log(`📨 API 响应:`, response);

      if (response.success) {
        // 根据登录类型获取用户信息
        const userData = isAdmin ? response.data.admin : response.data.student;
        const { token } = response.data;

        console.log(`👤 用户信息:`, userData);
        console.log(`🔑 Token:`, token);

        // 保存到localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log(`💾 用户信息已保存到 localStorage`);
        console.log(`💾 localStorage token:`, localStorage.getItem('token'));
        console.log(`💾 localStorage user:`, localStorage.getItem('user'));

        if (rememberMe) {
          localStorage.setItem('savedCredentials', JSON.stringify({
            studentId,
            password
          }));
        } else {
          localStorage.removeItem('savedCredentials');
        }

        dispatch({ type: actionTypes.SET_USER, payload: userData });
        console.log(`✅ 登录成功，用户状态已更新: ${userData.id}`);
        console.log(`🔄 Dispatch SET_USER 完成`);
        console.log(`🔍 用户数据:`, userData);
        console.log(`🔍 即将返回登录结果...`);
        return { success: true, user: userData };
      } else {
        console.error(`❌ API 返回登录失败: ${response.message}`);
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error(`❌ 登录异常:`, error);
      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      return { success: false, message: error.message };
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: actionTypes.LOGOUT });
  };



  // 修改密码
  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword(oldPassword, newPassword);
      return response;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // 刷新认证状态
  const refreshAuth = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        // 验证token是否有效
        const response = await authAPI.verify();
        if (response.success) {
          dispatch({
            type: actionTypes.SET_USER,
            payload: JSON.parse(savedUser)
          });
          return true;
        } else {
          // token无效，清除本地存储
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: actionTypes.LOGOUT });
          return false;
        }
      } catch (error) {
        console.error('Token验证失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: actionTypes.LOGOUT });
        return false;
      }
    } else {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
      return false;
    }
  };

  // 设置系统日期（用于模拟）
  const setSystemDate = (date) => {
    localStorage.setItem('systemDate', date.toISOString());
    dispatch({ type: actionTypes.SET_SYSTEM_DATE, payload: date });
  };

  // 进入下一天（模拟功能）
  const advanceDay = async () => {
    try {
      const currentDate = new Date(state.systemDate);
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);

      console.log(`📅 从 ${currentDate.toLocaleDateString('zh-CN')} 前进到 ${nextDay.toLocaleDateString('zh-CN')}`);

      // 在切换到下一天之前，先处理当天的未完成任务
      await processMidnightTasks(currentDate);

      // 设置新日期
      setSystemDate(nextDay);

      console.log(`✅ 日期切换完成: ${nextDay.toLocaleDateString('zh-CN')}`);
    } catch (error) {
      console.error('❌ advanceDay 失败:', error);
      throw error; // 重新抛出错误，让调用者知道失败了
    }
  };

  // 重置到初始日期并清空所有任务数据
  const resetToInitialDate = async () => {
    // 只有用户已登录才能重置
    if (!state.user) {
      console.warn('⚠️ 用户未登录，无法执行重置操作');
      return;
    }

    // 使用专用的学生重置工具
    const result = await performStudentReset(
      taskAPI.resetToInitial,
      setSystemDate,
      state.initialDate
    );

    if (result.success) {
      console.log('✅ 学生端重置成功:', result.data);
    } else if (!result.cancelled) {
      console.error('❌ 学生端重置失败:', result.error);
      alert('重置失败: ' + result.error);
    }
  };

  // 检查是否可以设置日期（只能设置今天或未来的日期）
  const canSetDate = (targetDate) => {
    const today = new Date(state.initialDate);
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    return target >= today;
  };

  // 安全设置系统日期（只允许设置今天或未来日期）
  const setSystemDateSafely = async (date) => {
    if (canSetDate(date)) {
      const currentDate = new Date(state.systemDate);
      const targetDate = new Date(date);

      // 如果是跳跃到未来日期，需要处理中间所有日期的24:00任务
      if (targetDate > currentDate) {
        console.log(`🔄 跳跃日期：从 ${currentDate.toLocaleDateString('zh-CN')} 到 ${targetDate.toLocaleDateString('zh-CN')}`);
        let processDate = new Date(currentDate);
        while (processDate < targetDate) {
          console.log(`🕛 处理中间日期: ${processDate.toLocaleDateString('zh-CN')}`);
          await processMidnightTasks(processDate);
          processDate.setDate(processDate.getDate() + 1);
        }
      }

      setSystemDate(date);
      return true;
    }
    return false;
  };

  // 处理24:00任务（自动调用）
  const processMidnightTasks = async (targetDate) => {
    try {
      // 只有在用户已登录的情况下才处理
      if (!state.user) {
        console.log('用户未登录，跳过24:00任务处理');
        return;
      }

      const dateStr = targetDate.toISOString().split('T')[0];

      // 检查是否正在处理中（防重复调用）
      const processingKey = `processing_midnight_${dateStr}`;
      if (window[processingKey]) {
        console.log(`⏭️ ${dateStr} 的24:00任务正在处理中，跳过重复调用`);
        return;
      }

      // 设置处理标志
      window[processingKey] = true;

      try {
        console.log(`🕛 自动处理 ${dateStr} 的24:00任务...`);

        const response = await taskAPI.processMidnightTasks(dateStr);

        if (response.success) {
          if (response.data.skipped) {
            console.log(`⏭️ 24:00任务已处理过:`, response.data);
          } else {
            console.log(`✅ 24:00任务处理完成:`, response.data);
          }
        } else {
          console.warn('⚠️ 24:00任务处理警告:', response.message);
        }
      } finally {
        // 清除处理标志
        delete window[processingKey];
      }
    } catch (error) {
      console.error('❌ 自动24:00处理失败:', error);
      // 不抛出错误，避免影响日期切换
    }
  };

  const value = {
    ...state,
    login,
    logout,
    changePassword,
    refreshAuth,
    setSystemDate,
    setSystemDateSafely,
    advanceDay,
    resetToInitialDate,
    canSetDate
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook for using context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
