import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // token过期或无效
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      return Promise.reject(data || { message: '请求失败' });
    }
    
    return Promise.reject({ message: '网络错误，请检查网络连接' });
  }
);

// 认证相关API
export const authAPI = {
  // 学生登录
  login: (studentId, password) =>
    api.post('/auth/login', { studentId, password }),

  // 管理员登录
  adminLogin: (adminId, password) =>
    api.post('/auth/admin/login', { studentId: adminId, password }),

  // 强制修改密码
  forceChangePassword: (newPassword) =>
    api.post('/auth/force-change-password', { newPassword }),

  // 修改密码
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),

  // 验证token
  verify: () =>
    api.get('/auth/verify')
};

// 任务相关API
export const taskAPI = {
  // 获取任务列表
  getTasks: (startDate, endDate, view) =>
    api.get('/tasks', { params: { startDate, endDate, view } }),
  
  // 更新任务
  updateTask: (taskId, updates) => 
    api.put(`/tasks/${taskId}`, updates),
  
  // 请假申请
  requestLeave: (date) => 
    api.post('/tasks/leave', { date }),
  
  // 获取请假记录
  getLeaveRecords: () => 
    api.get('/tasks/leave-records'),
  
  // 24:00任务处理
  processMidnightTasks: (date) => 
    api.post('/tasks/midnight-process', { date }),
  
  // 重置任务到初始状态
  resetToInitial: () => 
    api.post('/tasks/reset-to-initial')
};

// 档案相关API
export const profileAPI = {
  // 获取档案
  getProfile: () => 
    api.get('/profiles'),
  
  // 更新档案
  updateProfile: (profileData) => 
    api.put('/profiles', profileData)
};

// 管理员相关API
export const adminAPI = {
  // 获取学生列表
  getStudents: () => 
    api.get('/admin/students'),
  
  // 创建学生
  createStudent: (name) => 
    api.post('/admin/students', { name }),
  
  // 重置密码
  resetPassword: (studentId) => 
    api.post(`/admin/students/${studentId}/reset-password`),
  
  // 获取学生档案
  getStudentProfile: (studentId) => 
    api.get(`/admin/students/${studentId}/profile`),
  
  // 创建单个任务
  createTask: (taskData) => 
    api.post('/admin/tasks/bulk-import', { 
      csvData: `学生ID,日期,任务类型,任务标题\n${taskData.studentId},${taskData.date},${taskData.type || '学习'},${taskData.title}`
    }),

  // 批量导入任务
  bulkImportTasks: (csvData) => 
    api.post('/admin/tasks/bulk-import', { csvData }),
  
  // 获取任务报告
  getTaskReport: (date) => 
    api.get('/admin/reports/tasks', { params: { date } })
};

export default api;
