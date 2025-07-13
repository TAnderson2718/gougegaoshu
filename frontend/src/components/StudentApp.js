import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { taskAPI } from '../services/api';
import TodayScreen from './TodayScreen';
import MonthScreen from './MonthScreen';
import ProfileScreen from './ProfileScreen';

const StudentApp = () => {
  const { user, systemDate, advanceDay, resetToInitialDate, initialDate, logout } = useApp();
  const [activeTab, setActiveTab] = useState('当日任务');
  const [reminderShown, setReminderShown] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);


  // 检查今日是否有任务的提醒逻辑
  useEffect(() => {
    const checkTodayTasks = async () => {
      if (user && !reminderShown) {
        try {
          const today = systemDate.toISOString().split('T')[0];
          const response = await taskAPI.getTasks(today, today);
          
          if (response.success && response.data) {
            // 后端返回的是按日期分组的对象，需要提取今天的任务
            const todayTasks = response.data[today] || [];
            
            if (todayTasks.length > 0) {
              // 检查是否有非休息任务
              const hasActiveTasks = todayTasks.some(task => 
                task.type !== '休息' && task.title !== '今日休息调整状态'
              );
              
              if (hasActiveTasks) {
                setAlertVisible(true);
              }
            }
          }
        } catch (error) {
          console.error('检查今日任务失败:', error);
        }
        setReminderShown(true);
      }
    };

    checkTodayTasks();
  }, [user, reminderShown, systemDate]);

  useEffect(() => {
    if (!user) {
      setReminderShown(false);
    }
  }, [user]);

  const NavItem = ({ name, icon }) => (
    <button
      onClick={() => setActiveTab(name)}
      className={`flex-1 flex flex-col items-center justify-center p-2 ${
        activeTab === name ? 'text-blue-500' : 'text-gray-500'
      }`}
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs">{name}</span>
    </button>
  );

  const ConfirmationModal = ({ visible, onClose, title, message }) => {
    if (!visible) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-sm">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-gray-600 my-4">{message}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50">
      <ConfirmationModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title="每日提醒"
        message="同学你好，今天的学习任务已经发布，请记得按时完成哦！"
      />
      
      {/* 日期控制器 - 仅用于测试 */}
      <div className="bg-yellow-100 p-2 text-center text-xs border-b">
        <div className="flex items-center justify-center space-x-2 flex-wrap">
          <span className="mr-2">🧪 测试日期控制: </span>
          
          {/* 当前日期显示 */}
          <span className="text-blue-700 font-semibold">
            当前: {systemDate.toLocaleDateString('zh-CN')}
          </span>
          
          {/* 前进一天按钮 */}
          <button 
            onClick={async () => {
              try {
                await advanceDay();
                console.log('日期已前进，系统将自动刷新任务数据');
              } catch (error) {
                console.error('前进日期失败:', error);
                alert('前进日期失败: ' + error.message);
              }
            }}
            className="mx-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            +1天
          </button>
          
          
          {/* 重置按钮 */}
          <button 
            onClick={resetToInitialDate}
            className="mx-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            重置
          </button>
        </div>
        
        {/* 提示信息 */}
        <div className="mt-1 text-gray-600 text-center">
          <div>只能前进到未来日期，重置会清空所有任务数据并回到初始日期 ({initialDate.toLocaleDateString('zh-CN')})</div>
          <div className="text-xs text-blue-600 mt-1">
            日期切换时自动处理前一天未完成任务（少于3个结转，3个及以上顺延）
          </div>
          <div className="text-xs text-red-600 mt-1">
            ⚠️ 重置功能会完全删除所有任务、请假记录等数据，用于测试重新导入
          </div>
        </div>
      </div>

      {/* 顶部导航栏 */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold">考研任务管理系统 - 学生端</h1>
        <button
          onClick={() => {
            if (window.confirm('确定要退出登录吗？')) {
              logout();
            }
          }}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
        >
          退出登录
        </button>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col bg-white">
        {activeTab === '当日任务' && <TodayScreen />}
        {activeTab === '月度任务' && <MonthScreen />}
        {activeTab === '个人中心' && <ProfileScreen />}
      </main>

      <nav className="flex bg-white border-t shadow-lg md:shadow-md sticky bottom-0">
        <NavItem name="当日任务" icon="📅" />
        <NavItem name="月度任务" icon="🗓️" />
        <NavItem name="个人中心" icon="👤" />
      </nav>
    </div>
  );
};

export default StudentApp;
