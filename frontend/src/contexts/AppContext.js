import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

const AppContext = createContext();

// 初始状态
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  systemDate: new Date()
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
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.SET_ERROR, payload: null });

      const response = await authAPI.login(studentId, password);
      
      if (response.success) {
        const { token, student } = response.data;
        
        // 保存到localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(student));
        
        if (rememberMe) {
          localStorage.setItem('savedCredentials', JSON.stringify({ 
            studentId, 
            password 
          }));
        } else {
          localStorage.removeItem('savedCredentials');
        }

        dispatch({ type: actionTypes.SET_USER, payload: student });
        return { success: true };
      }
    } catch (error) {
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

  // 强制修改密码
  const forceChangePassword = async (newPassword) => {
    try {
      const response = await authAPI.forceChangePassword(newPassword);
      if (response.success) {
        // 更新用户状态
        const updatedUser = { ...state.user, forcePasswordChange: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: actionTypes.SET_USER, payload: updatedUser });
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
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

  // 设置系统日期（用于模拟）
  const setSystemDate = (date) => {
    dispatch({ type: actionTypes.SET_SYSTEM_DATE, payload: date });
  };

  // 进入下一天（模拟功能）
  const advanceDay = () => {
    const nextDay = new Date(state.systemDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSystemDate(nextDay);
  };

  const value = {
    ...state,
    login,
    logout,
    forceChangePassword,
    changePassword,
    setSystemDate,
    advanceDay
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
