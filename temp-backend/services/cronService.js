const cron = require('node-cron');
const moment = require('moment');
const { query } = require('../config/database');
const { handleMidnightTaskReschedule } = require('./taskScheduleService');

/**
 * 定时任务服务
 * 处理24:00的自动任务重新调度
 */

let cronJob = null;

/**
 * 启动定时任务
 */
function startCronJobs() {
  // 每天23:59执行，处理当天未完成的任务
  cronJob = cron.schedule('59 23 * * *', async () => {
    console.log('🕛 开始执行24:00任务重新调度...');
    
    try {
      const today = moment().format('YYYY-MM-DD');
      
      // 获取所有有任务的学生
      const students = await query(`
        SELECT DISTINCT student_id 
        FROM tasks 
        WHERE task_date = ? AND task_type NOT IN ('休息', 'leave')
      `, [today]);

      console.log(`需要处理的学生数量: ${students.length}`);

      // 为每个学生处理未完成任务
      for (const student of students) {
        try {
          await handleMidnightTaskReschedule(student.student_id, today);
          console.log(`✅ 学生 ${student.student_id} 任务重新调度完成`);
        } catch (error) {
          console.error(`❌ 学生 ${student.student_id} 任务重新调度失败:`, error);
        }
      }

      console.log('🎉 24:00任务重新调度完成');

    } catch (error) {
      console.error('❌ 定时任务执行失败:', error);
    }
  }, {
    scheduled: false, // 先不启动，由外部控制
    timezone: "Asia/Shanghai"
  });

  console.log('⏰ 定时任务服务已初始化（24:00任务重新调度）');
}

/**
 * 启动定时任务
 */
function start() {
  if (cronJob) {
    cronJob.start();
    console.log('🚀 定时任务已启动');
  }
}

/**
 * 停止定时任务
 */
function stop() {
  if (cronJob) {
    cronJob.stop();
    console.log('⏹️ 定时任务已停止');
  }
}

/**
 * 手动触发任务重新调度（用于测试）
 */
async function manualReschedule(studentId, targetDate) {
  try {
    console.log(`🔧 手动执行任务重新调度: 学生${studentId}, 日期${targetDate}`);
    await handleMidnightTaskReschedule(studentId, targetDate);
    console.log('✅ 手动任务重新调度完成');
    return { success: true };
  } catch (error) {
    console.error('❌ 手动任务重新调度失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取定时任务状态
 */
function getStatus() {
  return {
    isRunning: cronJob ? cronJob.running : false,
    nextRun: cronJob ? '每日 23:59' : null
  };
}

module.exports = {
  startCronJobs,
  start,
  stop,
  manualReschedule,
  getStatus
};