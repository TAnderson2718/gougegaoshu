import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import TodayScreen from './TodayScreen';
import MonthScreen from './MonthScreen';
import ProfileScreen from './ProfileScreen';

const StudentApp = () => {
  const { user, systemDate } = useApp();
  const [activeTab, setActiveTab] = useState('当日任务');
  const [reminderShown, setReminderShown] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  // 模拟每日提醒逻辑（简化版）
  useEffect(() => {
    if (user && !reminderShown) {
      // 这里可以添加检查今日任务的逻辑
      setAlertVisible(true);
      setReminderShown(true);
    }
  }, [user, reminderShown]);

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
    <div className="mobile-frame-container">
      <ConfirmationModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title="每日提醒"
        message="同学你好，今天的学习任务已经发布，请记得按时完成哦！"
      />
      
      <div className="mobile-frame">
        <main className="flex-1 overflow-hidden flex flex-col relative z-10 bg-transparent">
          {activeTab === '当日任务' && <TodayScreen />}
          {activeTab === '月度任务' && <MonthScreen />}
          {activeTab === '个人中心' && <ProfileScreen />}
        </main>
        
        <nav className="flex bg-white border-t relative z-10">
          <NavItem name="当日任务" icon="📅" />
          <NavItem name="月度任务" icon="🗓️" />
          <NavItem name="个人中心" icon="👤" />
        </nav>
      </div>
    </div>
  );
};

export default StudentApp;
