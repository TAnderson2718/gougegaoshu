import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { useApp } from '../contexts/AppContext';

const FutureDaysView = ({ onClose }) => {
  const { systemDate } = useApp();
  const [futureTasks, setFutureTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // 生成未来5天的日期
  const generateFutureDates = () => {
    const dates = [];
    for (let i = 1; i <= 5; i++) {
      const date = new Date(systemDate);
      date.setDate(date.getDate() + i);
      dates.push({
        date: date,
        dateStr: date.toISOString().split('T')[0],
        displayName: `${date.getMonth() + 1}月${date.getDate()}日`,
        dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
      });
    }
    return dates;
  };

  const futureDates = generateFutureDates();

  // 获取未来几天的任务
  const fetchFutureTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = futureDates[0].dateStr;
      const endDate = futureDates[futureDates.length - 1].dateStr;
      
      const response = await taskAPI.getTasks(startDate, endDate);
      
      if (response.success) {
        setFutureTasks(response.data || {});
      } else {
        setError(response.message || '获取任务失败');
      }
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 更新任务状态（提前完成）
  const updateTaskStatus = async (taskId, completed) => {
    try {
      const response = await taskAPI.updateTask(taskId, { 
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        completed_date: completed ? systemDate.toISOString().split('T')[0] : null,
        is_future_task: completed // 标记为提前完成的未来任务
      });
      
      if (response.success) {
        // 重新获取任务数据
        await fetchFutureTasks();
      } else {
        setError(response.message || '更新任务失败');
      }
    } catch (err) {
      setError(err.message || '更新任务失败');
    }
  };

  useEffect(() => {
    fetchFutureTasks();
  }, [systemDate]);

  // 滑动处理
  const handleSwipeLeft = () => {
    if (currentDayIndex < futureDates.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  const currentDay = futureDates[currentDayIndex];
  const currentTasks = futureTasks[currentDay?.dateStr] || [];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50">
      {/* 头部 */}
      <div className="bg-blue-500 text-white p-4">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-white">
            ← 返回
          </button>
          <h1 className="text-lg font-semibold">未来任务</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* 日期导航 */}
      <div className="bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleSwipeRight}
            disabled={currentDayIndex === 0}
            className={`p-2 rounded ${currentDayIndex === 0 ? 'text-gray-400' : 'text-blue-600'}`}
          >
            ◀
          </button>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">
              {currentDay?.displayName}
            </div>
            <div className="text-sm text-gray-600">
              {currentDay?.dayName} • 还有{currentDayIndex + 1}天
            </div>
          </div>
          
          <button 
            onClick={handleSwipeLeft}
            disabled={currentDayIndex === futureDates.length - 1}
            className={`p-2 rounded ${currentDayIndex === futureDates.length - 1 ? 'text-gray-400' : 'text-blue-600'}`}
          >
            ▶
          </button>
        </div>

        {/* 日期指示器 */}
        <div className="flex justify-center mt-3 space-x-2">
          {futureDates.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentDayIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🗓️</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无任务</h3>
            <p className="text-gray-500">这一天没有安排任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                💡 <strong>提前完成说明：</strong> 您可以提前完成未来5天内的任务。
                完成的任务将记录为今天完成，但不会影响原定的任务安排。
              </p>
            </div>
            
            {currentTasks.map((task) => (
              <FutureTaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                currentDate={systemDate}
                targetDate={currentDay.date}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="bg-gray-50 p-4 border-t">
        <p className="text-center text-sm text-gray-600">
          左右滑动查看其他日期的任务 • 最多可提前完成5天内的任务
        </p>
      </div>
    </div>
  );
};

// 未来任务卡片组件
const FutureTaskCard = ({ task, onStatusChange, currentDate, targetDate }) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleStatusToggle = async () => {
    if (isCompleting) return;
    
    if (!task.completed) {
      // 提前完成确认
      const confirmed = window.confirm(
        `确定要提前完成这个任务吗？\n\n任务："${task.title}"\n计划日期：${targetDate.toLocaleDateString('zh-CN')}\n完成日期：${currentDate.toLocaleDateString('zh-CN')}\n\n此操作不可撤销。`
      );
      
      if (!confirmed) return;
    }

    setIsCompleting(true);
    try {
      await onStatusChange(task.id, !task.completed);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${
      task.completed 
        ? 'bg-green-50 border-green-200' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start space-x-3">
        <button
          onClick={handleStatusToggle}
          disabled={isCompleting}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
            task.completed
              ? 'bg-green-500 border-green-500 text-white'
              : isCompleting
                ? 'border-gray-300 cursor-wait'
                : 'border-gray-300 hover:border-blue-500'
          }`}
        >
          {isCompleting ? (
            <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
          ) : (
            task.completed && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )
          )}
        </button>
        
        <div className="flex-1">
          <h3 className={`font-semibold ${
            task.completed ? 'text-green-700 line-through' : 'text-gray-800'
          }`}>
            {task.title || '任务标题'}
          </h3>
          
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
            
            {task.completed && (
              <span className="text-green-600 text-xs">
                ✨ 已提前完成
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FutureDaysView;