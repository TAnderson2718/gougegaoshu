/**
 * 数据一致性工具
 * 确保前端状态与后端数据库保持同步
 */

/**
 * 清空所有相关的本地缓存
 * @param {string[]} additionalKeys - 额外需要清除的缓存键
 */
export const clearAllCache = (additionalKeys = []) => {
  console.log('🧹 开始清空本地缓存...');
  
  // 标准缓存键模式
  const standardPatterns = [
    'tasks_',
    'profile_',
    'leave_records_',
    'task_report_',
    'students_',
    'admin_',
    'user_',
    'systemDate'
  ];
  
  // 查找所有匹配的缓存键
  const allKeys = Object.keys(localStorage);
  const keysToRemove = allKeys.filter(key => 
    standardPatterns.some(pattern => key.startsWith(pattern)) ||
    additionalKeys.includes(key)
  );
  
  // 清除缓存
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`   - 清除缓存: ${key}`);
  });
  
  console.log(`✅ 已清除 ${keysToRemove.length} 个缓存项`);
  return keysToRemove;
};

/**
 * 强制刷新页面以确保数据一致性
 * @param {number} delay - 延迟时间（毫秒）
 * @param {string} message - 刷新前显示的消息
 */
export const forceRefresh = (delay = 1000, message = null) => {
  if (message) {
    console.log(message);
  }
  
  if (typeof window !== 'undefined') {
    console.log(`🔄 ${delay}ms 后刷新页面以确保数据一致性...`);
    setTimeout(() => {
      window.location.reload();
    }, delay);
  }
};

/**
 * 完整的数据重置流程
 * @param {Function} apiResetFunction - 后端重置API函数
 * @param {Object} options - 配置选项
 */
export const performCompleteReset = async (apiResetFunction, options = {}) => {
  const {
    confirmMessage = '确定要重置所有数据吗？此操作无法撤销！',
    successMessage = '数据重置成功，页面将刷新',
    additionalCacheKeys = [],
    refreshDelay = 1000,
    onSuccess = null,
    onError = null
  } = options;
  
  // 确认操作
  if (!window.confirm(confirmMessage)) {
    return { success: false, cancelled: true };
  }
  
  try {
    console.log('🔄 开始完整数据重置流程...');
    
    // 1. 调用后端API重置数据库
    console.log('📡 调用后端重置API...');
    const response = await apiResetFunction();
    
    if (!response.success) {
      throw new Error(response.message || '后端重置失败');
    }
    
    console.log('✅ 后端数据重置成功:', response.data);
    
    // 2. 清空前端缓存
    const clearedKeys = clearAllCache(additionalCacheKeys);
    
    // 3. 执行成功回调
    if (onSuccess) {
      await onSuccess(response.data);
    }
    
    // 4. 显示成功消息
    if (successMessage) {
      alert(successMessage);
    }
    
    // 5. 强制刷新页面
    forceRefresh(refreshDelay, '🔄 准备刷新页面...');
    
    return {
      success: true,
      data: response.data,
      clearedCacheKeys: clearedKeys
    };
    
  } catch (error) {
    console.error('❌ 完整重置失败:', error);
    
    // 即使API失败，也尝试清空缓存
    clearAllCache(additionalCacheKeys);
    
    // 执行错误回调
    if (onError) {
      onError(error);
    }
    
    return {
      success: false,
      error: error.message || '重置失败'
    };
  }
};

/**
 * 学生端重置专用函数
 * @param {Function} resetAPI - 学生重置API
 * @param {Function} setSystemDate - 设置系统日期函数
 * @param {Date} initialDate - 初始日期
 */
export const performStudentReset = async (resetAPI, setSystemDate, initialDate) => {
  return performCompleteReset(resetAPI, {
    confirmMessage: '⚠️ 确定要重置所有任务数据吗？\n\n此操作将：\n- 清空所有任务记录\n- 清空请假记录\n- 重置日期到初始状态\n- 清空本地缓存\n\n此操作无法撤销！',
    successMessage: '✅ 学生数据重置成功！\n所有任务数据已清空，日期已重置，页面将刷新。',
    onSuccess: async () => {
      // 重置系统日期
      localStorage.removeItem('systemDate');
      setSystemDate(new Date(initialDate));
      console.log('📅 系统日期已重置到初始状态');
    }
  });
};

/**
 * 管理员端重置专用函数
 * @param {Function} resetAPI - 管理员重置API
 * @param {Function} setStudents - 设置学生列表函数
 * @param {Function} setSelectedStudent - 设置选中学生函数
 * @param {Function} setTaskReport - 设置任务报告函数
 */
export const performAdminReset = async (resetAPI, setStudents, setSelectedStudent, setTaskReport) => {
  return performCompleteReset(resetAPI, {
    confirmMessage: '⚠️ 警告：此操作将删除所有学生的任务数据、请假记录和调度历史，且无法恢复！\n\n🔴 最后确认：您确定要清空整个系统的所有任务数据吗？',
    successMessage: '✅ 管理员重置成功！\n所有学生的任务数据已清空，页面将刷新。',
    additionalCacheKeys: ['admin_dashboard_state'],
    onSuccess: async () => {
      // 重置管理员界面状态
      setStudents([]);
      setSelectedStudent(null);
      setTaskReport(null);
      console.log('🔧 管理员界面状态已重置');
    }
  });
};

/**
 * 密码重置后的数据同步
 * @param {string} studentId - 学生ID
 * @param {Function} setStudents - 设置学生列表函数
 * @param {Function} setSelectedStudent - 设置选中学生函数
 */
export const syncPasswordReset = (studentId, setStudents, setSelectedStudent) => {
  console.log(`🔄 同步学生 ${studentId} 的密码重置状态...`);
  
  // 更新学生列表中的强制修改密码状态
  setStudents(prevStudents => 
    prevStudents.map(student => 
      student.id === studentId 
        ? { ...student, force_password_change: true }
        : student
    )
  );

  // 更新选中学生状态
  setSelectedStudent(prev => 
    prev && prev.id === studentId 
      ? { ...prev, force_password_change: true }
      : prev
  );

  // 清除该学生的用户缓存
  const userCacheKey = `user_${studentId}`;
  if (localStorage.getItem(userCacheKey)) {
    localStorage.removeItem(userCacheKey);
    console.log(`   - 清除学生 ${studentId} 的用户缓存`);
  }
  
  console.log(`✅ 学生 ${studentId} 的密码重置状态已同步`);
};

export default {
  clearAllCache,
  forceRefresh,
  performCompleteReset,
  performStudentReset,
  performAdminReset,
  syncPasswordReset
};
