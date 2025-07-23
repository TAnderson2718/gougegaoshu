import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useApp } from '../contexts/AppContext';
import { performAdminReset, syncPasswordReset } from '../utils/dataConsistency';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
  const { user, logout } = useApp();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  const [showExcelImportForm, setShowExcelImportForm] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);

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

  // 修复数据库
  const handleFixDatabase = async () => {
    if (!window.confirm('确定要修复数据库吗？这将创建缺失的表和字段。')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/fix-database', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('数据库修复成功！');
      } else {
        setError(result.message || '数据库修复失败');
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

      console.log(`🔄 重置学生 ${studentId} 的密码...`);

      const response = await adminAPI.resetPassword(studentId);

      if (response.success) {
        console.log('✅ 密码重置成功:', response.data);

        // 使用数据一致性工具同步状态
        syncPasswordReset(studentId, setStudents, setSelectedStudent);

        alert(`✅ 密码重置成功！\n新密码：${response.data.initialPassword}\n该学生下次登录时需要修改密码。`);
      } else {
        setError(response.message || '重置密码失败');
      }
    } catch (err) {
      console.error('❌ 重置密码失败:', err);
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

  // 处理Excel文件上传
  const handleExcelFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // 清空input的值，避免重复选择同一文件时不触发change事件
    event.target.value = '';

    console.log('选择的文件:', file.name, file.type, file.size);

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      setError('请选择有效的Excel文件 (.xlsx 或 .xls)');
      return;
    }

    // 验证文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过5MB');
      return;
    }

    setExcelFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log('开始解析Excel文件...');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // 读取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 转换为JSON格式
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('解析的原始数据:', jsonData);

        // 过滤空行并格式化数据
        const formattedData = jsonData
          .filter(row => row.length > 0 && row.some(cell => cell !== undefined && cell !== ''))
          .map(row => ({
            studentId: row[0] || '',
            date: row[1] || '',
            taskType: row[2] || '',
            title: row[3] || ''
          }));

        console.log('格式化后的数据:', formattedData);
        setExcelData(formattedData);
        setError(null);
      } catch (err) {
        console.error('Excel解析错误:', err);
        setError('Excel文件解析失败: ' + err.message);
        setExcelFile(null);
        setExcelData([]);
      }
    };

    reader.onerror = (err) => {
      console.error('文件读取错误:', err);
      setError('文件读取失败，请重试');
      setExcelFile(null);
      setExcelData([]);
    };

    reader.readAsArrayBuffer(file);
  };

  // 下载Excel模板
  const downloadExcelTemplate = () => {
    try {
      // 创建示例数据 - 从7月19号到7月31号的完整示例
      const templateData = [
        ['学生ID', '日期', '任务类型', '任务标题'],
        // 7月19日 - 周六
        ['ST001', '2025-07-19', '数学', '高等数学微分学'],
        ['ST001', '2025-07-19', '英语', '考研词汇Unit1-10'],
        ['ST001', '2025-07-19', '专业课', '数据结构与算法基础'],
        ['ST002', '2025-07-19', '数学', '线性代数矩阵运算'],
        ['ST002', '2025-07-19', '英语', '阅读理解专项训练'],
        ['ST002', '2025-07-19', '专业课', '计算机网络TCP/IP'],
        // 7月20日 - 周日（休息日）
        ['ST001', '2025-07-20', '休息', '休息日'],
        ['ST002', '2025-07-20', '休息', '休息日'],
        // 7月21日 - 周一
        ['ST001', '2025-07-21', '数学', '高等数学积分学'],
        ['ST001', '2025-07-21', '英语', '阅读理解专项训练'],
        ['ST001', '2025-07-21', '专业课', '操作系统进程管理'],
        ['ST002', '2025-07-21', '数学', '概率论与数理统计'],
        ['ST002', '2025-07-21', '英语', '完形填空专项训练'],
        ['ST002', '2025-07-21', '专业课', '数据库系统原理'],
        // 7月22日 - 周二
        ['ST001', '2025-07-22', '数学', '线性代数向量空间'],
        ['ST001', '2025-07-22', '英语', '翻译技巧训练'],
        ['ST001', '2025-07-22', '专业课', '计算机组成原理'],
        ['ST002', '2025-07-22', '数学', '高等数学极限理论'],
        ['ST002', '2025-07-22', '英语', '写作模板练习'],
        ['ST002', '2025-07-22', '专业课', '软件工程基础'],
        // 7月23日 - 周三
        ['ST001', '2025-07-23', '数学', '概率论基础概念'],
        ['ST001', '2025-07-23', '英语', '长难句分析'],
        ['ST001', '2025-07-23', '专业课', '算法设计与分析'],
        ['ST002', '2025-07-23', '数学', '线性代数矩阵变换'],
        ['ST002', '2025-07-23', '英语', '词汇记忆强化'],
        ['ST002', '2025-07-23', '专业课', '编译原理基础'],
        // 7月24日 - 周四
        ['ST001', '2025-07-24', '数学', '数理统计假设检验'],
        ['ST001', '2025-07-24', '英语', '新题型解题技巧'],
        ['ST001', '2025-07-24', '专业课', '人工智能导论'],
        ['ST002', '2025-07-24', '数学', '概率分布与期望'],
        ['ST002', '2025-07-24', '英语', '阅读理解提速训练'],
        ['ST002', '2025-07-24', '专业课', '机器学习基础'],
        // 7月25日 - 周五
        ['ST001', '2025-07-25', '数学', '高等数学多元函数'],
        ['ST001', '2025-07-25', '英语', '作文素材积累'],
        ['ST001', '2025-07-25', '专业课', '分布式系统概念'],
        ['ST002', '2025-07-25', '数学', '线性代数特征值'],
        ['ST002', '2025-07-25', '英语', '听力理解训练'],
        ['ST002', '2025-07-25', '专业课', '云计算技术'],
        // 7月26日 - 周六
        ['ST001', '2025-07-26', '数学', '概率论条件概率'],
        ['ST001', '2025-07-26', '英语', '语法综合复习'],
        ['ST001', '2025-07-26', '专业课', '网络安全基础'],
        ['ST002', '2025-07-26', '数学', '数理统计参数估计'],
        ['ST002', '2025-07-26', '英语', '模拟试题练习'],
        ['ST002', '2025-07-26', '专业课', '区块链技术'],
        // 7月27日 - 周日（休息日）
        ['ST001', '2025-07-27', '休息', '休息日'],
        ['ST002', '2025-07-27', '休息', '休息日'],
        // 7月28日 - 周一
        ['ST001', '2025-07-28', '数学', '高等数学重积分'],
        ['ST001', '2025-07-28', '英语', '真题模拟测试'],
        ['ST001', '2025-07-28', '专业课', '图论与离散数学'],
        ['ST002', '2025-07-28', '数学', '线性代数二次型'],
        ['ST002', '2025-07-28', '英语', '错题分析总结'],
        ['ST002', '2025-07-28', '专业课', '数值分析方法'],
        // 7月29日 - 周二
        ['ST001', '2025-07-29', '数学', '概率论大数定律'],
        ['ST001', '2025-07-29', '英语', '考前冲刺复习'],
        ['ST001', '2025-07-29', '专业课', '信息论基础'],
        ['ST002', '2025-07-29', '数学', '数理统计区间估计'],
        ['ST002', '2025-07-29', '英语', '应试技巧训练'],
        ['ST002', '2025-07-29', '专业课', '密码学原理'],
        // 7月30日 - 周三
        ['ST001', '2025-07-30', '数学', '高等数学曲线积分'],
        ['ST001', '2025-07-30', '英语', '写作模板运用'],
        ['ST001', '2025-07-30', '专业课', '量子计算入门'],
        ['ST002', '2025-07-30', '数学', '线性代数综合应用'],
        ['ST002', '2025-07-30', '英语', '口语表达练习'],
        ['ST002', '2025-07-30', '专业课', '生物信息学'],
        // 7月31日 - 周四
        ['ST001', '2025-07-31', '数学', '概率统计综合复习'],
        ['ST001', '2025-07-31', '英语', '全真模拟考试'],
        ['ST001', '2025-07-31', '专业课', '前沿技术调研'],
        ['ST002', '2025-07-31', '数学', '高等数学总结回顾'],
        ['ST002', '2025-07-31', '英语', '考试心理调适'],
        ['ST002', '2025-07-31', '专业课', '项目实践总结']
      ];

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);

      // 设置列宽
      ws['!cols'] = [
        { width: 12 }, // 学生ID
        { width: 15 }, // 日期
        { width: 12 }, // 任务类型
        { width: 30 }  // 任务标题
      ];

      // 添加工作表
      XLSX.utils.book_append_sheet(wb, ws, '任务导入模板');

      // 生成Excel文件的二进制数据
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // 创建Blob对象
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 使用英文文件名避免编码问题
      const fileName = 'task_import_template.xlsx';
      link.download = fileName;

      // 设置下载属性以确保正确的文件名
      link.setAttribute('download', fileName);

      // 触发下载
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Excel模板下载成功');
    } catch (error) {
      console.error('❌ Excel模板下载失败:', error);
      setError('下载模板失败，请重试');
    }
  };

  // 从Excel数据导入任务
  const importFromExcel = async () => {
    if (!excelData || excelData.length === 0) {
      setError('请先选择并解析Excel文件');
      return;
    }

    try {
      setError(null);

      // 将Excel数据转换为CSV格式
      const csvContent = excelData
        .filter(row => row.studentId && row.date && row.taskType && row.title)
        .map(row => `${row.studentId},${row.date},${row.taskType},${row.title}`)
        .join('\n');

      if (!csvContent) {
        setError('Excel文件中没有有效的任务数据');
        return;
      }

      const fullCsvData = '学生ID,日期,任务类型,任务标题\n' + csvContent;
      const response = await adminAPI.bulkImportTasks(fullCsvData);

      if (response.success) {
        setExcelFile(null);
        setExcelData([]);
        setShowExcelImportForm(false);
        alert(`成功从Excel导入 ${response.data.imported} 个任务`);
      } else {
        setError(response.message || '导入任务失败');
      }
    } catch (err) {
      setError(err.message || '导入任务失败');
    }
  };



  // 管理员重置所有任务数据
  const resetAllTasks = async () => {
    // 使用专用的管理员重置工具
    const result = await performAdminReset(
      adminAPI.resetAllTasks,
      setStudents,
      setSelectedStudent,
      setTaskReport
    );

    if (result.success) {
      console.log('✅ 管理员重置成功:', result.data);
      // 重置报告日期
      setReportDate(new Date().toISOString().split('T')[0]);
    } else if (!result.cancelled) {
      console.error('❌ 管理员重置失败:', result.error);
      setError(result.error);
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
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: 'ADMIN',
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
              <p className="font-medium text-gray-800">{user.name} ({user.id || user.studentId})</p>
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
                        注册时间: {new Date(student.created_at).toLocaleDateString('zh-CN')}
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
                    {selectedStudent.last_login_at
                      ? new Date(selectedStudent.last_login_at).toLocaleString('zh-CN')
                      : '从未登录'
                    }
                  </p>
                </div>
                
                {studentProfile && studentProfile.profile && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">性别</label>
                      <p className="mt-1 text-gray-900">{studentProfile.profile.gender || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">年龄</label>
                      <p className="mt-1 text-gray-900">{studentProfile.profile.age || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">学习状态</label>
                      <p className="mt-1 text-gray-900">
                        {studentProfile.profile.studyStatus === '其他'
                          ? studentProfile.profile.studyStatusOther || '未填写'
                          : studentProfile.profile.studyStatus || '未填写'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">数学类型</label>
                      <p className="mt-1 text-gray-900">
                        {studentProfile.profile.mathType === '其他'
                          ? studentProfile.profile.mathTypeOther || '未填写'
                          : studentProfile.profile.mathType || '未填写'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">目标分数</label>
                      <p className="mt-1 text-gray-900">{studentProfile.profile.targetScore || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">每日学习小时数</label>
                      <p className="mt-1 text-gray-900">{studentProfile.profile.dailyHours || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">高考信息</label>
                      <p className="mt-1 text-gray-900">
                        {studentProfile.profile.gaokaoYear !== '未参加'
                          ? `${studentProfile.profile.gaokaoYear}年 ${studentProfile.profile.gaokaoProvince} ${studentProfile.profile.gaokaoScore}分`
                          : '未参加'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">考研信息</label>
                      <p className="mt-1 text-gray-900">
                        {studentProfile.profile.gradExamYear !== '未参加'
                          ? `${studentProfile.profile.gradExamYear}年 ${studentProfile.profile.gradExamMathType} ${studentProfile.profile.gradExamScore}分`
                          : '未参加'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">专升本信息</label>
                      <p className="mt-1 text-gray-900">
                        {studentProfile.profile.upgradeExamYear !== '未参加'
                          ? `${studentProfile.profile.upgradeExamYear}年 ${studentProfile.profile.upgradeExamProvince} ${studentProfile.profile.upgradeExamMathType} ${studentProfile.profile.upgradeExamScore}分`
                          : '未参加'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">已购买图书</label>
                      <p className="mt-1 text-gray-900">{studentProfile.profile.purchasedBooks || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">特殊需求备注</label>
                      <p className="mt-1 text-gray-900">{studentProfile.profile.notes || '未填写'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">档案状态</label>
                      <p className="mt-1 text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs ${
                          studentProfile.profile.isProfileSubmitted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {studentProfile.profile.isProfileSubmitted ? '已提交' : '未提交'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">最后更新时间</label>
                      <p className="mt-1 text-gray-900">
                        {studentProfile.profile.updatedAt
                          ? new Date(studentProfile.profile.updatedAt).toLocaleString('zh-CN')
                          : '未更新'
                        }
                      </p>
                    </div>
                  </>
                )}

                {studentProfile && !studentProfile.profile && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">该学生尚未填写档案信息</p>
                  </div>
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
                onClick={() => setShowExcelImportForm(true)}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                📊 Excel批量导入任务
              </button>
              <button
                onClick={resetAllTasks}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                🗑️ 重置所有任务数据
              </button>

              {/* 报告日期选择 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  报告日期
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

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
              <button
                onClick={handleFixDatabase}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                🔧 修复数据库
              </button>
            </div>
          </div>

          {/* 任务报告 */}
          {taskReport && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                任务报告 ({reportDate})
              </h3>

              {/* 总体统计 */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">总任务数</span>
                  <span className="font-semibold">{taskReport.totalTasks || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已完成</span>
                  <span className="font-semibold text-green-600">{taskReport.completedTasks || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">完成率</span>
                  <span className="font-semibold">{taskReport.completionRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">活跃学生</span>
                  <span className="font-semibold">{taskReport.activeStudents || 0}</span>
                </div>
              </div>

              {/* 学生统计 */}
              {taskReport.studentStats && taskReport.studentStats.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">学生完成情况</h4>
                  <div className="space-y-2">
                    {taskReport.studentStats.map(student => (
                      <div key={student.studentId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{student.studentName}</span>
                        <div className="text-sm">
                          <span className="text-gray-600">{student.completedTasks}/{student.totalTasks}</span>
                          <span className={`ml-2 font-medium ${
                            student.completionRate >= 80 ? 'text-green-600' :
                            student.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {student.completionRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 如果没有数据 */}
              {taskReport.totalTasks === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>该日期没有任务数据</p>
                  <p className="text-sm mt-1">请选择其他日期或先导入任务数据</p>
                </div>
              )}
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
                    if (!s.last_login_at) return false;
                    const today = new Date().toDateString();
                    const loginDate = new Date(s.last_login_at).toDateString();
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



      {/* Excel批量导入模态框 */}
      {showExcelImportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Excel批量导入任务</h3>

            <div className="space-y-4">
              {/* 模板下载和文件上传区域 */}
              <div className="space-y-3">
                {/* 模板下载按钮 */}
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    选择Excel文件 (.xlsx, .xls)
                  </label>
                  <button
                    onClick={downloadExcelTemplate}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center space-x-1"
                  >
                    <span>📥</span>
                    <span>下载模板</span>
                  </button>
                </div>

                {/* 文件选择器 */}
                <div className="space-y-2">
                  {/* 直接显示的文件输入 */}
                  <div className="relative">
                    <input
                      type="file"
                      id="excel-file-input"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer text-left flex items-center justify-center space-x-2 bg-white">
                      <span>📁</span>
                      <span className="text-gray-700">
                        {excelFile ? `已选择: ${excelFile.name}` : '点击选择Excel文件'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 格式说明 */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-700 font-medium mb-1">📋 Excel文件格式要求：</p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• 第一列：学生ID（如：ST001）</li>
                    <li>• 第二列：日期（格式：YYYY-MM-DD，如：2025-07-19）</li>
                    <li>• 第三列：任务类型（如：数学、英语、专业课、休息）</li>
                    <li>• 第四列：任务标题（如：高等数学微分学、午休、课间休息）</li>
                  </ul>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-700 font-medium">🌟 休息任务示例：</p>
                    <p className="text-xs text-green-600">任务类型填写"休息"，标题可以是：午休、课间休息、晚间放松、运动时间等</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 建议先下载模板文件，参考示例数据格式进行填写
                  </p>
                </div>
              </div>

              {/* 数据预览 */}
              {excelData.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-2">
                    数据预览 (共 {excelData.length} 行)
                  </h4>
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">学生ID</th>
                          <th className="px-3 py-2 text-left">日期</th>
                          <th className="px-3 py-2 text-left">任务类型</th>
                          <th className="px-3 py-2 text-left">任务标题</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.slice(0, 10).map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 border-t">{row.studentId}</td>
                            <td className="px-3 py-2 border-t">{row.date}</td>
                            <td className="px-3 py-2 border-t">{row.taskType}</td>
                            <td className="px-3 py-2 border-t">{row.title}</td>
                          </tr>
                        ))}
                        {excelData.length > 10 && (
                          <tr>
                            <td colSpan="4" className="px-3 py-2 text-center text-gray-500 border-t">
                              ... 还有 {excelData.length - 10} 行数据
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={importFromExcel}
                  disabled={!excelData.length}
                  className={`flex-1 px-4 py-2 rounded-md ${
                    excelData.length
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  导入 ({excelData.length} 条记录)
                </button>
                <button
                  onClick={() => {
                    setShowExcelImportForm(false);
                    setExcelFile(null);
                    setExcelData([]);
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