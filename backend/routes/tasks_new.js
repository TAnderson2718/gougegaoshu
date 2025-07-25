const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validators } = require('../middleware/validation');
const { createCacheMiddleware } = require('../services/CacheService');
const TaskController = require('../controllers/TaskController');

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);

// 创建任务缓存中间件
const taskCacheMiddleware = createCacheMiddleware({
  ttl: 180, // 3分钟缓存
  cacheType: 'main',
  keyGenerator: (req) => {
    const { startDate, endDate, view } = req.query;
    const studentId = req.user?.studentId;
    return `tasks:${studentId}:${startDate || 'all'}:${endDate || 'all'}:${view || 'default'}`;
  },
  condition: (req) => req.user && req.user.studentId, // 只为学生请求缓存
  skipCache: (req) => req.query.nocache === 'true' // 支持跳过缓存
});

// 学生任务相关路由
router.get('/', validators.dateRange, taskCacheMiddleware, TaskController.getTasks);
router.get('/stats', TaskController.getStudentStats);
router.get('/:taskId', TaskController.getTaskDetail);
router.put('/:taskId', validators.updateTask, TaskController.updateTask);

// 请假相关路由
router.post('/leave', validators.leaveRequest, TaskController.requestLeave);
router.get('/leave/records', TaskController.getLeaveRecords);

// 24:00任务处理路由
router.post('/midnight-process', TaskController.processMidnightTasks);

// 管理员任务管理路由
router.post('/batch', requireAdmin, TaskController.createTasksBatch);
router.delete('/student/:studentId/all', requireAdmin, TaskController.deleteAllStudentTasks);
router.post('/:taskId/reschedule', requireAdmin, TaskController.rescheduleTask);
router.get('/:taskId/history', requireAdmin, TaskController.getTaskHistory);

// 管理员统计路由
router.get('/admin/completion-stats', requireAdmin, TaskController.getCompletionStats);
router.get('/admin/study-time-ranking', requireAdmin, TaskController.getStudyTimeRanking);
router.get('/admin/task-type-stats', requireAdmin, TaskController.getTaskTypeStats);
router.get('/admin/daily-stats', requireAdmin, TaskController.getDailyStats);

// 管理员系统管理路由
router.delete('/admin/cache', requireAdmin, TaskController.clearCache);
router.get('/admin/service-stats', requireAdmin, TaskController.getServiceStats);

module.exports = router;
