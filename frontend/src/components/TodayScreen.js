import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { useApp } from '../contexts/AppContext';
import FutureDaysView from './FutureDaysView';

const TodayScreen = () => {
  const { systemDate } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showFutureDays, setShowFutureDays] = useState(false);

  // 格式化日期为YYYY-MM-DD（避免时区问题）
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 获取今日任务
  const fetchTodayTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = formatDate(systemDate);
      const response = await taskAPI.getTasks(today, today);
      
      if (response.success) {
        // 后端返回的是按日期分组的对象，需要提取今天的任务
        const todayTasks = response.data[today] || [];
        setTasks(todayTasks);
      } else {
        setError(response.message || '获取任务失败');
      }
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取请假记录
  const fetchLeaveRecords = async () => {
    try {
      const response = await taskAPI.getLeaveRecords();
      if (response.success) {
        setLeaveRecords(response.data || []);
      }
    } catch (err) {
      console.error('获取请假记录失败:', err);
    }
  };

  // 更新任务状态
  const updateTaskStatus = async (taskId, completed) => {
    try {
      const response = await taskAPI.updateTask(taskId, { 
        completed,
        completedAt: completed ? new Date().toISOString() : null
      });
      
      if (response.success) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId 
              ? { ...task, completed, completedAt: completed ? new Date().toISOString() : null }
              : task
          )
        );
      } else {
        setError(response.message || '更新任务失败');
      }
    } catch (err) {
      setError(err.message || '更新任务失败');
    }
  };

  // 更新任务时长
  const updateTaskDuration = async (taskId, duration) => {
    try {
      const response = await taskAPI.updateTask(taskId, { duration });
      
      if (response.success) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, duration } : task
          )
        );
      } else {
        setError(response.message || '更新时长失败');
      }
    } catch (err) {
      setError(err.message || '更新时长失败');
    }
  };

  // 显示请假确认弹窗
  const showLeaveDialog = () => {
    setShowLeaveConfirm(true);
  };

  // 确认申请请假
  const confirmRequestLeave = async () => {
    try {
      setShowLeaveConfirm(false);
      setLoading(true);
      
      const today = formatDate(systemDate);
      const response = await taskAPI.requestLeave(today);
      
      if (response.success) {
        await fetchLeaveRecords();
        await fetchTodayTasks(); // 重新获取任务数据
        setError(null);
        alert('请假申请成功！今日任务已顺延到明日，所有后续任务自动顺延一天。');
      } else {
        setError(response.message || '请假申请失败');
      }
    } catch (err) {
      setError(err.message || '请假申请失败');
    } finally {
      setLoading(false);
    }
  };

  // 取消请假
  const cancelRequestLeave = () => {
    setShowLeaveConfirm(false);
  };

  useEffect(() => {
    fetchTodayTasks();
    fetchLeaveRecords();
  }, [systemDate]);

  // 检查今日是否已请假
  const isOnLeaveToday = () => {
    const today = formatDate(systemDate);
    return leaveRecords.some(record => 
      record.date === today && record.status === 'approved'
    );
  };

  // 计算今日完成率
  const getCompletionRate = () => {
    const taskArray = Array.isArray(tasks) ? tasks : [];
    if (taskArray.length === 0) return 0;
    const completedTasks = taskArray.filter(task => task.completed).length;
    return Math.round((completedTasks / taskArray.length) * 100);
  };

  if (loading) {
    return (
      <div data-testid="today-screen" className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 检查是否有认证错误
  if (error && error.includes('令牌')) {
    return (
      <div data-testid="today-screen" className="p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">需要登录</h3>
          <p className="text-gray-500 mb-4">请先登录后查看任务</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="today-screen" className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          今日任务 - {systemDate.toLocaleDateString('zh-CN')}
        </h1>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            完成率: <span className="font-semibold text-blue-600">{getCompletionRate()}%</span>
            {Array.isArray(tasks) && tasks.length > 0 && (
              <span className="ml-2">
                ({tasks.filter(t => t.completed).length}/{tasks.length} 项完成)
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={fetchTodayTasks}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              disabled={loading}
            >
              {loading ? '刷新中...' : '🔄 刷新'}
            </button>
            <button
              onClick={() => setShowFutureDays(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              未来任务 →
            </button>
            {!isOnLeaveToday() && (
              <button
                onClick={showLeaveDialog}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
              >
                今日请假
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {isOnLeaveToday() && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md">
          <p className="font-semibold">今日已请假</p>
          <p className="text-sm">您今日的请假申请已通过，无需完成任务。</p>
        </div>
      )}

      {(Array.isArray(tasks) ? tasks : []).length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无今日任务</h3>
          <p className="text-gray-500">今天没有安排任务，您可以休息一下。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Array.isArray(tasks) ? tasks : []).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={updateTaskStatus}
              onDurationChange={updateTaskDuration}
              disabled={isOnLeaveToday()}
            />
          ))}
        </div>
      )}

      {/* 请假确认弹窗 */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">确认请假</h3>
              <div className="text-gray-600 mb-6 text-left space-y-2">
                <p>• 今日所有未完成任务将顺延到明日</p>
                <p>• 后续所有任务自动顺延一天</p>
                <p>• 如果明日是休息日，任务将跳过休息日</p>
                <p className="text-red-600 font-semibold">• 此操作不可撤销</p>
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-6">
                是否确认请假？
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={cancelRequestLeave}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={confirmRequestLeave}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  确认请假
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 未来任务视图 */}
      {showFutureDays && (
        <FutureDaysView onClose={() => setShowFutureDays(false)} />
      )}
    </div>
  );
};

// 任务卡片组件
const TaskCard = ({ task, onStatusChange, onDurationChange, disabled }) => {
  const [duration, setDuration] = useState({
    hour: task.duration?.hour || 0,
    minute: task.duration?.minute || 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(task.proof || null);

  const handleStatusToggle = () => {
    if (disabled) return;
    onStatusChange(task.id, !task.completed);
  };

  const handleDurationSave = () => {
    onDurationChange(task.id, duration);
    setIsEditing(false);
  };

  const formatDuration = () => {
    if (!task.duration || (task.duration.hour === 0 && task.duration.minute === 0)) {
      return '未记录';
    }
    return `${task.duration.hour}小时${task.duration.minute}分钟`;
  };

  // 处理图片选择
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 检查文件大小（限制为5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
      }
      
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }

      setSelectedImage(file);
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 上传图片
  const handleImageUpload = async () => {
    if (!selectedImage) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        
        // 调用API上传图片
        await updateTaskProof(task.id, base64Image);
        setShowImageUpload(false);
        setSelectedImage(null);
      };
      reader.readAsDataURL(selectedImage);
    } catch (error) {
      console.error('图片上传失败:', error);
      alert('图片上传失败，请重试');
    }
  };

  // 更新任务凭证
  const updateTaskProof = async (taskId, proofImage) => {
    try {
      const response = await taskAPI.updateTask(taskId, { proof: proofImage });
      if (response.success) {
        // 更新本地状态
        setImagePreview(proofImage);
      } else {
        throw new Error(response.message || '上传失败');
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${
      task.completed 
        ? 'bg-green-50 border-green-200' 
        : disabled 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-white border-gray-200'
    } ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <button
            onClick={handleStatusToggle}
            disabled={disabled}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
              task.completed
                ? 'bg-green-500 border-green-500 text-white'
                : disabled
                  ? 'border-gray-300 cursor-not-allowed'
                  : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {task.completed && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
          <div className="flex-1">
            <h3 className={`font-semibold ${
              task.completed ? 'text-green-700 line-through' : 'text-gray-800'
            }`}>
              {task.title || '任务标题'}
            </h3>
            {task.description && (
              <p className="text-gray-600 text-sm mt-1">{task.description}</p>
            )}
            
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span className={`px-2 py-1 rounded text-xs ${
                task.type === '数学' 
                  ? 'bg-blue-100 text-blue-800'
                  : task.type === '英语'
                    ? 'bg-green-100 text-green-800'
                    : task.type === '专业课'
                      ? 'bg-purple-100 text-purple-800'
                      : task.type === '休息'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
              }`}>
                {task.type || '其他'}
              </span>
              
              {task.completed && task.completedAt && (
                <span className="text-green-600">
                  完成于: {new Date(task.completedAt).toLocaleTimeString('zh-CN')}
                </span>
              )}
              
              {imagePreview && (
                <span className="text-green-600 text-xs">📷 已上传凭证</span>
              )}
            </div>

            {/* 照片上传区域 */}
            {task.completed && (
              <div className="mt-3">
                {!showImageUpload ? (
                  <div className="flex items-center space-x-2">
                    {imagePreview ? (
                      <div className="flex items-center space-x-2">
                        <img 
                          src={imagePreview} 
                          alt="任务凭证" 
                          className="w-16 h-16 object-cover rounded border cursor-pointer"
                          onClick={() => {
                            // 点击查看大图
                            const newWindow = window.open();
                            newWindow.document.write(`<img src="${imagePreview}" style="max-width:100%; max-height:100%;" />`);
                          }}
                        />
                        <button
                          onClick={() => setShowImageUpload(true)}
                          className="text-blue-600 text-xs hover:text-blue-800"
                        >
                          更换凭证
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowImageUpload(true)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        disabled={disabled}
                      >
                        📷 上传完成凭证
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="flex flex-col space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="text-xs"
                      />
                      {selectedImage && (
                        <div className="flex items-center space-x-2">
                          <img 
                            src={imagePreview} 
                            alt="预览" 
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleImageUpload}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            >
                              确认上传
                            </button>
                            <button
                              onClick={() => {
                                setShowImageUpload(false);
                                setSelectedImage(null);
                                setImagePreview(task.proof || null);
                              }}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ml-4">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <select
                value={duration.hour}
                onChange={(e) => setDuration({...duration, hour: parseInt(e.target.value)})}
                className="w-16 px-2 py-1 border rounded text-sm bg-white"
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <span className="text-sm">时</span>
              <select
                value={duration.minute}
                onChange={(e) => setDuration({...duration, minute: parseInt(e.target.value)})}
                className="w-16 px-2 py-1 border rounded text-sm bg-white"
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i * 5} value={i * 5}>{i * 5}</option>
                ))}
              </select>
              <span className="text-sm">分</span>
              <button
                onClick={handleDurationSave}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">
                用时: {formatDuration()}
              </div>
              {!disabled && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  编辑时长
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayScreen;