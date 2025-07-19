import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { useApp } from '../contexts/AppContext';

const MonthScreen = () => {
  const { systemDate } = useApp();
  const [tasks, setTasks] = useState([]);
  const [originalDateStats, setOriginalDateStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(systemDate));
  const [showTaskModal, setShowTaskModal] = useState(false);

  // 格式化日期为YYYY-MM-DD（避免时区问题）
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 获取月度任务
  const fetchMonthTasks = async (month) => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const response = await taskAPI.getTasks(
        formatDate(startDate),
        formatDate(endDate),
        'month' // 添加月度视图参数
      );

      if (response.success) {
        // 后端返回的是按日期分组的对象，需要转换为平面数组
        const tasksByDate = response.data || {};
        const allTasks = [];

        Object.keys(tasksByDate).forEach(date => {
          const dateTasks = tasksByDate[date] || [];
          dateTasks.forEach(task => {
            allTasks.push({
              ...task,
              date: date // 添加日期字段
            });
          });
        });

        setTasks(allTasks);

        // 保存原始日期统计数据
        setOriginalDateStats(response.originalDateStats || {});
      } else {
        setError(response.message || '获取任务失败');
      }
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取指定日期的任务
  const getTasksForDate = (date) => {
    const dateStr = formatDate(date);
    const taskArray = Array.isArray(tasks) ? tasks : [];
    return taskArray.filter(task => task.date === dateStr);
  };

  // 生成日历数据
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // 从周日开始
    
    const days = [];
    const current = new Date(startDate);
    
    // 生成6周的日期（42天）
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(current); // 创建日期副本
      const dateStr = formatDate(currentDate);
      const dayTasks = getTasksForDate(currentDate);

      // 使用原始日期统计来计算完成率
      const originalStats = originalDateStats[dateStr];
      let completedTasks, totalTasks, completionRate;

      if (originalStats) {
        // 使用原始日期的统计数据
        completedTasks = originalStats.completed;
        totalTasks = originalStats.total;
        completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      } else {
        // 如果没有原始统计，使用当前显示的任务
        completedTasks = dayTasks.filter(task => task.completed).length;
        totalTasks = dayTasks.length;
        completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      }

      days.push({
        date: currentDate,
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: formatDate(currentDate) === formatDate(systemDate),
        tasks: dayTasks,
        completedTasks,
        totalTasks,
        completionRate,
        originalStats // 保存原始统计信息，用于调试
      });

      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // 上一个月
  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // 下一个月
  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 选择日期
  const selectDate = (date) => {
    setSelectedDate(date);
    setShowTaskModal(true);
  };

  // 关闭任务详情弹窗
  const closeTaskModal = () => {
    setShowTaskModal(false);
    setSelectedDate(null);
  };

  // 计算月度统计
  const getMonthStats = () => {
    const taskArray = Array.isArray(tasks) ? tasks : [];
    const monthTasks = taskArray.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate.getMonth() === currentMonth.getMonth() && 
             taskDate.getFullYear() === currentMonth.getFullYear();
    });
    
    const completed = monthTasks.filter(task => task.completed).length;
    const total = monthTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const totalStudyTime = monthTasks.reduce((acc, task) => {
      if (task.duration) {
        return acc + (task.duration.hour * 60) + task.duration.minute;
      }
      return acc;
    }, 0);
    
    return {
      total,
      completed,
      completionRate,
      totalStudyTime: Math.round(totalStudyTime / 60 * 10) / 10 // 转换为小时，保留1位小数
    };
  };

  useEffect(() => {
    fetchMonthTasks(currentMonth);
  }, [currentMonth]);

  const calendarDays = generateCalendarDays();
  const monthStats = getMonthStats();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  if (loading) {
    return (
      <div data-testid="month-screen" className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="month-screen" className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">月度任务</h1>
        <p className="text-gray-600">查看和管理每月的学习任务</p>
      </div>



      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 日历视图 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* 日历头部 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={previousMonth}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  ← 上月
                </button>
                <button
                  onClick={nextMonth}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  下月 →
                </button>
              </div>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 日历网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <CalendarDay
                  key={index}
                  day={day}
                  onSelect={selectDate}
                  isSelected={selectedDate && formatDate(selectedDate) === formatDate(day.date)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 月度统计 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">本月统计</h3>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {monthStats.completionRate}%
                </div>
                <div className="text-sm text-gray-600">完成率</div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">总任务数</span>
                  <span className="font-semibold">{monthStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已完成</span>
                  <span className="font-semibold text-green-600">{monthStats.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">未完成</span>
                  <span className="font-semibold text-red-600">
                    {monthStats.total - monthStats.completed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">学习时长</span>
                  <span className="font-semibold">{monthStats.totalStudyTime}h</span>
                </div>
              </div>
            </div>
          </div>


          {/* 状态图例 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">状态说明</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                <span>任务全部完成</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span>部分任务完成</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                <span>任务未完成</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
                <span>🏠 已请假</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
                <span>😴 休息日</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                <span>无任务安排</span>
              </div>
            </div>
          </div>

          {/* 快速导航 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">快速导航</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setCurrentMonth(new Date(systemDate));
                  setSelectedDate(systemDate);
                }}
                className="w-full px-3 py-2 text-left text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                回到今日
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="w-full px-3 py-2 text-left text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
              >
                当前月份
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 任务详情弹窗 */}
      {showTaskModal && selectedDate && (
        <TaskDetailsModal
          date={selectedDate}
          tasks={getTasksForDate(selectedDate)}
          onClose={closeTaskModal}
        />
      )}
    </div>
  );
};

// 日历单元格组件
const CalendarDay = ({ day, onSelect, isSelected }) => {
  // 检查是否有请假或休息任务
  const hasLeaveTask = day.tasks.some(task => task.type === 'leave');
  const hasRestTask = day.tasks.some(task => task.type === '休息');
  
  const getCompletionColor = () => {
    if (hasLeaveTask) return 'bg-yellow-50'; // 请假日
    if (hasRestTask) return 'bg-blue-50'; // 休息日
    if (day.totalTasks === 0) return 'bg-gray-50';
    if (day.completionRate === 100) return 'bg-green-100';
    if (day.completionRate >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getBorderColor = () => {
    if (isSelected) return 'border-blue-500 border-2';
    if (day.isToday) return 'border-blue-300 border-2';
    if (hasLeaveTask) return 'border-yellow-300';
    if (hasRestTask) return 'border-blue-300';
    return 'border-gray-200';
  };

  const getStatusIcon = () => {
    if (hasLeaveTask) return '🏠'; // 请假
    if (hasRestTask) return '😴'; // 休息
    return null;
  };

  return (
    <div
      onClick={() => onSelect(day.date)}
      className={`
        relative h-24 p-1 border cursor-pointer hover:bg-gray-50 transition-colors
        ${getBorderColor()}
        ${getCompletionColor()}
        ${!day.isCurrentMonth ? 'opacity-30' : ''}
      `}
    >
      <div className="flex justify-between items-start h-full">
        <div className="flex items-center space-x-1">
          <span className={`text-sm font-medium ${
            day.isToday ? 'text-blue-600' : 
            day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {day.dayNumber}
          </span>
          {getStatusIcon() && (
            <span className="text-xs">{getStatusIcon()}</span>
          )}
        </div>
        
        {(day.totalTasks > 0 && !hasLeaveTask && !hasRestTask) && (
          <div className="text-right">
            <div className="text-xs text-gray-600">
              {day.completedTasks}/{day.totalTasks}
            </div>
            {day.completionRate > 0 && (
              <div className={`text-xs font-semibold ${
                day.completionRate === 100 ? 'text-green-600' :
                day.completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {day.completionRate}%
              </div>
            )}
          </div>
        )}

        {/* 特殊状态显示 */}
        {hasLeaveTask && (
          <div className="text-right">
            <div className="text-xs text-yellow-600 font-semibold">已请假</div>
          </div>
        )}
        
        {hasRestTask && !hasLeaveTask && (
          <div className="text-right">
            <div className="text-xs text-blue-600 font-semibold">休息日</div>
          </div>
        )}
      </div>
      
      {/* 任务指示器 */}
      {day.totalTasks > 0 && (
        <div className="absolute bottom-1 left-1 right-1">
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(day.totalTasks, 5) }).map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded ${
                  index < day.completedTasks ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
            {day.totalTasks > 5 && (
              <span className="text-xs text-gray-500">+</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 任务详情弹窗组件
const TaskDetailsModal = ({ date, tasks, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-11/12 max-h-[80vh] overflow-hidden">
        {/* 弹窗头部 */}
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {date.getMonth() + 1}月{date.getDate()}日任务
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">📝</div>
              <p className="text-gray-500">当日无任务</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* 弹窗底部 */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

// 任务项组件
const TaskItem = ({ task }) => {
  // 检查是否是特殊任务类型
  const isLeaveTask = task.type === 'leave';
  const isRestTask = task.type === '休息';

  const getTaskTypeDisplay = () => {
    if (isLeaveTask) return { text: '已请假', color: 'bg-yellow-100 text-yellow-800' };
    if (isRestTask) return { text: '休息日', color: 'bg-blue-100 text-blue-800' };
    
    switch (task.type) {
      case '数学': return { text: '数学', color: 'bg-blue-100 text-blue-800' };
      case '英语': return { text: '英语', color: 'bg-green-100 text-green-800' };
      case '专业课': return { text: '专业课', color: 'bg-purple-100 text-purple-800' };
      default: return { text: task.type || '其他', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const typeDisplay = getTaskTypeDisplay();

  return (
    <div className={`p-4 rounded-lg border ${
      task.completed 
        ? 'bg-green-50 border-green-200' 
        : isLeaveTask || isRestTask
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start space-x-3">
        {/* 状态指示器 */}
        <div className={`mt-1 w-4 h-4 rounded-full flex items-center justify-center ${
          task.completed 
            ? 'bg-green-500 text-white' 
            : isLeaveTask || isRestTask
              ? 'bg-gray-400'
              : 'bg-gray-300'
        }`}>
          {task.completed && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          {/* 任务标题 */}
          <h4 className={`font-medium text-sm ${
            task.completed ? 'text-green-700 line-through' : 'text-gray-800'
          }`}>
            {isLeaveTask ? '🏠 已请假' : isRestTask ? '😴 休息日' : (task.title || '任务标题')}
          </h4>

          {/* 任务类型标签 */}
          <div className="mt-2 flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-xs ${typeDisplay.color}`}>
              {typeDisplay.text}
            </span>

            {/* 完成状态 */}
            {task.completed && !isLeaveTask && !isRestTask && (
              <span className="text-green-600 text-xs">✓ 已完成</span>
            )}
          </div>

          {/* 用时显示 */}
          {task.duration && (task.duration.hour > 0 || task.duration.minute > 0) && (
            <div className="mt-2 text-xs text-gray-600">
              用时: {task.duration.hour}时{task.duration.minute}分
            </div>
          )}

          {/* 凭证显示 */}
          {task.proof && (
            <div className="mt-2 text-xs text-green-600">
              📷 已上传完成凭证
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthScreen;