import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useApp } from '../contexts/AppContext';

const AdminDashboard = () => {
  const { user, logout } = useApp();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [csvData, setCsvData] = useState(`学生ID,日期,任务类型,任务标题
ST001,2025-07-01,数学,高等数学微积分练习
ST001,2025-07-01,英语,背诵核心词汇100个
ST001,2025-07-01,专业课,机器学习基础理论
ST002,2025-07-01,数学,线性代数矩阵运算
ST002,2025-07-01,英语,学术论文写作技巧
ST002,2025-07-01,专业课,深度学习神经网络
ST001,2025-07-02,数学,概率论基础概念复习
ST001,2025-07-02,英语,写作模板背诵
ST001,2025-07-02,专业课,操作系统进程管理
ST002,2025-07-02,数学,高等代数群论基础
ST002,2025-07-02,英语,完形填空专项练习
ST002,2025-07-02,专业课,计算机组成原理
ST001,2025-07-03,数学,数理统计假设检验
ST001,2025-07-03,英语,翻译技巧训练
ST001,2025-07-03,专业课,软件工程需求分析
ST002,2025-07-03,数学,实分析测度论入门
ST002,2025-07-03,英语,听力精听训练
ST002,2025-07-03,专业课,数据库系统设计
ST001,2025-07-04,数学,复变函数基础理论
ST001,2025-07-04,英语,口语表达练习
ST001,2025-07-04,专业课,算法设计与分析
ST002,2025-07-04,数学,泛函分析基础
ST002,2025-07-04,英语,语法专项强化
ST002,2025-07-04,专业课,编译原理词法分析
ST001,2025-07-05,休息,今日休息调整状态
ST002,2025-07-05,休息,今日休息调整状态
ST001,2025-07-06,数学,偏微分方程求解
ST001,2025-07-06,英语,阅读理解提升
ST001,2025-07-06,专业课,分布式系统概念
ST002,2025-07-06,数学,抽象代数环论
ST002,2025-07-06,英语,写作结构训练
ST002,2025-07-06,专业课,人工智能搜索算法
ST001,2025-07-07,数学,常微分方程理论
ST001,2025-07-07,英语,语音语调练习
ST001,2025-07-07,专业课,网络安全密码学
ST002,2025-07-07,数学,数论基础定理
ST002,2025-07-07,英语,段落写作技巧
ST002,2025-07-07,专业课,深度学习神经网络
ST001,2025-07-08,数学,运筹学线性规划
ST001,2025-07-08,英语,词根词缀学习
ST001,2025-07-08,专业课,云计算架构设计
ST002,2025-07-08,数学,组合数学排列组合
ST002,2025-07-08,英语,时态语态复习
ST002,2025-07-08,专业课,区块链技术原理
ST001,2025-07-09,数学,信息论熵的概念
ST001,2025-07-09,英语,同义词替换练习
ST001,2025-07-09,专业课,物联网通信协议
ST002,2025-07-09,数学,随机过程马尔可夫链
ST002,2025-07-09,英语,逻辑推理训练
ST002,2025-07-09,专业课,移动开发框架
ST001,2025-07-10,数学,博弈论均衡理论
ST001,2025-07-10,英语,修辞手法运用
ST001,2025-07-10,专业课,大数据处理技术
ST002,2025-07-10,数学,拓扑学基础概念
ST002,2025-07-10,英语,语言文化背景
ST002,2025-07-10,专业课,前端开发技术栈
ST001,2025-07-11,数学,量子力学数学基础
ST001,2025-07-11,英语,学术写作规范
ST001,2025-07-11,专业课,容器化技术Docker
ST002,2025-07-11,数学,代数几何基础
ST002,2025-07-11,英语,商务英语表达
ST002,2025-07-11,专业课,微服务架构设计
ST001,2025-07-12,数学,数学建模优化问题
ST001,2025-07-12,英语,文献阅读技巧
ST001,2025-07-12,专业课,系统性能优化
ST002,2025-07-12,数学,模糊数学模糊集合
ST002,2025-07-12,英语,论文写作结构
ST002,2025-07-12,专业课,消息队列中间件
ST001,2025-07-13,休息,今日休息调整状态
ST002,2025-07-13,休息,今日休息调整状态`);

  const [taskReport, setTaskReport] = useState(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [testMode, setTestMode] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    studentId: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: '学习'
  });

  // 获取学生列表
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.getStudents();
      
      if (response.success) {
        setStudents(response.data || []);
      } else {
        setError(response.message || '获取学生列表失败');
      }
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取学生档案
  const fetchStudentProfile = async (studentId) => {
    try {
      const response = await adminAPI.getStudentProfile(studentId);
      
      if (response.success) {
        setStudentProfile(response.data);
      } else {
        setError(response.message || '获取学生档案失败');
      }
    } catch (err) {
      setError(err.message || '获取学生档案失败');
    }
  };

  // 创建学生
  const createStudent = async () => {
    if (!newStudentName.trim()) {
      setError('请输入学生姓名');
      return;
    }

    try {
      setError(null);
      
      const response = await adminAPI.createStudent(newStudentName);
      
      if (response.success) {
        setNewStudentName('');
        setShowCreateForm(false);
        await fetchStudents();
        alert('学生创建成功');
      } else {
        setError(response.message || '创建学生失败');
      }
    } catch (err) {
      setError(err.message || '创建学生失败');
    }
  };

  // 重置密码
  const resetPassword = async (studentId) => {
    if (!window.confirm('确定要重置该学生的密码吗？')) {
      return;
    }

    try {
      setError(null);
      
      const response = await adminAPI.resetPassword(studentId);
      
      if (response.success) {
        alert(`密码重置成功。新密码：${response.data.newPassword}`);
      } else {
        setError(response.message || '重置密码失败');
      }
    } catch (err) {
      setError(err.message || '重置密码失败');
    }
  };

  // 创建单个任务
  const createTask = async () => {
    if (!newTask.studentId || !newTask.title.trim()) {
      setError('请选择学生并输入任务标题');
      return;
    }

    try {
      setError(null);
      
      const response = await adminAPI.createTask(newTask);
      
      if (response.success) {
        setNewTask({
          studentId: '',
          title: '',
          date: new Date().toISOString().split('T')[0],
          type: '学习'
        });
        setShowTaskForm(false);
        alert('任务创建成功');
      } else {
        setError(response.message || '创建任务失败');
      }
    } catch (err) {
      setError(err.message || '创建任务失败');
    }
  };

  // 批量导入任务
  const bulkImportTasks = async () => {
    if (!csvData.trim()) {
      setError('请输入CSV数据');
      return;
    }

    try {
      setError(null);

      const response = await adminAPI.bulkImportTasks(csvData);

      if (response.success) {
        setCsvData('');
        setShowImportForm(false);
        alert(`成功导入 ${response.data.imported} 个任务`);
      } else {
        setError(response.message || '导入任务失败');
      }
    } catch (err) {
      setError(err.message || '导入任务失败');
    }
  };

  // 管理员重置所有任务数据
  const resetAllTasks = async () => {
    if (!window.confirm('⚠️ 警告：此操作将删除所有学生的任务数据、请假记录和调度历史，且无法恢复！\n\n确定要继续吗？')) {
      return;
    }

    if (!window.confirm('🔴 最后确认：您确定要清空整个系统的所有任务数据吗？')) {
      return;
    }

    try {
      setError(null);

      const response = await adminAPI.resetAllTasks();

      if (response.success) {
        alert('✅ 所有任务数据已清空，可以重新导入任务了');
      } else {
        setError(response.message || '重置失败');
      }
    } catch (err) {
      setError(err.message || '重置失败');
    }
  };

  // 获取任务报告
  const fetchTaskReport = async () => {
    try {
      setError(null);

      const response = await adminAPI.getTaskReport(reportDate);

      if (response.success) {
        setTaskReport(response.data);
      } else {
        setError(response.message || '获取报告失败');
      }
    } catch (err) {
      setError(err.message || '获取报告失败');
    }
  };



  // 选择学生
  const selectStudent = async (student) => {
    setSelectedStudent(student);
    await fetchStudentProfile(student.id);
  };

  // 模拟测试数据
  const loadTestData = () => {
    setTestMode(true);
    setError(null);
    setLoading(false);
    setStudents([
      {
        id: 'ST001',
        name: '张三',
        lastLoginAt: '2024-01-15T10:30:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'ST002',
        name: '李四',
        lastLoginAt: '2024-01-14T09:15:00.000Z',
        createdAt: '2024-01-02T00:00:00.000Z'
      },
      {
        id: 'ST003',
        name: '王五',
        lastLoginAt: null,
        createdAt: '2024-01-03T00:00:00.000Z'
      }
    ]);
  };

  useEffect(() => {
    if (!testMode) {
      // 检查是否有token，如果没有则自动进行管理员登录
      const token = localStorage.getItem('token');
      if (!token) {
        handleAdminLogin();
      } else {
        fetchStudents();
      }
    }
  }, [testMode]);

  // 管理员快速登录
  const handleAdminLogin = async () => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: 'ADMIN001',
          password: 'AdminPass123'
        })
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify({
          ...data.data.admin,
          studentId: data.data.admin.id, // 为了兼容性
          userType: 'admin'
        }));
        window.location.reload(); // 重新加载页面以更新认证状态
      } else {
        setError('管理员登录失败: ' + data.message);
      }
    } catch (err) {
      setError('管理员登录失败: ' + err.message);
    }
  };

  // 退出登录
  const handleLogout = () => {
    logout();
    window.location.href = '/admin'; // 重定向到管理员登录页面
  };

  if (loading) {
    return (
      <div data-testid="admin-dashboard" className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">管理员控制台</h1>
          <p className="text-gray-600">管理学生、任务和查看系统报告</p>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <div className="text-right">
              <p className="text-sm text-gray-600">欢迎回来</p>
              <p className="font-medium text-gray-800">{user.name} ({user.studentId})</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center space-x-2"
          >
            <span>🚪</span>
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex space-x-2">
              <button
                onClick={handleAdminLogin}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                🔐 管理员登录
              </button>
              <button
                onClick={loadTestData}
                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
              >
                🧪 使用测试数据
              </button>
            </div>
          </div>
        </div>
      )}

      {testMode && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md">
          <div className="flex items-center justify-between">
            <span>🧪 当前使用测试数据模式</span>
            <button
              onClick={() => {setTestMode(false); setStudents([]); fetchStudents();}}
              className="ml-4 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              重新连接API
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 学生管理 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">学生管理</h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                添加学生
              </button>
            </div>

            {/* 学生列表 */}
            <div className="space-y-3">
              {students.map(student => (
                <div
                  key={student.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedStudent?.id === student.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => selectStudent(student)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">{student.name}</h3>
                      <p className="text-sm text-gray-600">ID: {student.id}</p>
                      <p className="text-sm text-gray-600">
                        注册时间: {new Date(student.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        student.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status === 'active' ? '活跃' : '非活跃'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetPassword(student.id);
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        重置密码
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {students.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无学生</h3>
                <p className="text-gray-500">点击"添加学生"按钮创建第一个学生账户。</p>
              </div>
            )}
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 学生详情 */}
          {selectedStudent && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">学生详情</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">姓名</label>
                  <p className="mt-1 text-gray-900">{selectedStudent.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">学生ID</label>
                  <p className="mt-1 text-gray-900 font-mono">{selectedStudent.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">最后登录</label>
                  <p className="mt-1 text-gray-900">
                    {selectedStudent.lastLoginAt 
                      ? new Date(selectedStudent.lastLoginAt).toLocaleString('zh-CN')
                      : '从未登录'
                    }
                  </p>
                </div>
                
                {studentProfile && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">专业</label>
                      <p className="mt-1 text-gray-900">{studentProfile.major || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">年级</label>
                      <p className="mt-1 text-gray-900">{studentProfile.grade || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">目标院校</label>
                      <p className="mt-1 text-gray-900">{studentProfile.targetSchool || '未填写'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 快速操作 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowTaskForm(true)}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                📝 创建任务
              </button>
              <button
                onClick={() => setShowImportForm(true)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              >
                批量导入任务
              </button>
              <button
                onClick={resetAllTasks}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                🗑️ 重置所有任务数据
              </button>

              <button
                onClick={fetchTaskReport}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm"
              >
                生成任务报告
              </button>
              <button
                onClick={fetchStudents}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
              >
                刷新数据
              </button>
            </div>
          </div>

          {/* 任务报告 */}
          {taskReport && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">任务报告</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">总任务数</span>
                  <span className="font-semibold">{taskReport.totalTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已完成</span>
                  <span className="font-semibold text-green-600">{taskReport.completedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">完成率</span>
                  <span className="font-semibold">{taskReport.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">活跃学生</span>
                  <span className="font-semibold">{taskReport.activeStudents}</span>
                </div>
              </div>
            </div>
          )}

          {/* 系统统计 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">系统统计</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">总学生数</span>
                <span className="font-semibold">{students.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">活跃学生</span>
                <span className="font-semibold text-green-600">
                  {students.filter(s => s.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">今日登录</span>
                <span className="font-semibold">
                  {students.filter(s => {
                    if (!s.lastLoginAt) return false;
                    const today = new Date().toDateString();
                    const loginDate = new Date(s.lastLoginAt).toDateString();
                    return today === loginDate;
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 创建学生模态框 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新学生</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学生姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入学生姓名"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={createStudent}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewStudentName('');
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

      {/* 批量导入模态框 */}
      {showImportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">批量导入任务</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV 数据格式: 学生ID,日期,任务类型,任务标题
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CSV格式: 学生ID,日期,任务类型,任务标题"

                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={bulkImportTasks}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  导入
                </button>
                <button
                  onClick={() => {
                    setShowImportForm(false);
                    setCsvData('');
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

      {/* 创建任务模态框 */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">创建新任务</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择学生 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTask.studentId}
                  onChange={(e) => setNewTask({...newTask, studentId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">请选择学生</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入任务标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务日期
                </label>
                <input
                  type="date"
                  value={newTask.date}
                  onChange={(e) => setNewTask({...newTask, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务类型
                </label>
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="学习">学习</option>
                  <option value="复习">复习</option>
                  <option value="练习">练习</option>
                  <option value="作业">作业</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={createTask}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  创建任务
                </button>
                <button
                  onClick={() => {
                    setShowTaskForm(false);
                    setNewTask({
                      studentId: '',
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      type: '学习'
                    });
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
  );
};

export default AdminDashboard;