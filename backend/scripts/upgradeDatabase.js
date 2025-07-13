const { query } = require('../config/database');

async function upgradeDatabase() {
  try {
    console.log('开始升级数据库结构...');

    // 1. 为tasks表添加新字段支持任务顺延
    const alterColumns = [
      "ADD COLUMN original_date DATE COMMENT '原始计划日期'",
      "ADD COLUMN task_status ENUM('normal', 'deferred', 'carried_over', 'advanced') DEFAULT 'normal' COMMENT '任务状态：正常/顺延/结转/提前完成'",
      "ADD COLUMN defer_reason VARCHAR(100) COMMENT '顺延原因：leave/incomplete'",
      "ADD COLUMN completed_date DATE COMMENT '实际完成日期'",
      "ADD COLUMN is_future_task BOOLEAN DEFAULT FALSE COMMENT '是否为提前完成的未来任务'"
    ];

    for (const columnDef of alterColumns) {
      try {
        await query(`ALTER TABLE tasks ${columnDef}`);
        console.log(`✅ 添加字段: ${columnDef.split(' ')[2]}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️ 字段已存在: ${columnDef.split(' ')[2]}`);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ tasks表结构升级完成');

    // 2. 创建任务顺延历史记录表
    const createTaskHistorySQL = `
      CREATE TABLE IF NOT EXISTS task_schedule_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
        operation_type ENUM('defer', 'carry_over', 'advance', 'leave') NOT NULL COMMENT '操作类型',
        operation_date DATE NOT NULL COMMENT '操作日期',
        affected_tasks INT DEFAULT 0 COMMENT '影响的任务数量',
        details JSON COMMENT '操作详情',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_operation (student_id, operation_date)
      ) COMMENT '任务调度历史记录表'
    `;

    await query(createTaskHistorySQL);
    console.log('✅ 任务调度历史表创建完成');

    // 3. 创建定时任务配置表
    const createScheduleConfigSQL = `
      CREATE TABLE IF NOT EXISTS schedule_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
        daily_task_limit INT DEFAULT 4 COMMENT '每日任务上限',
        carry_over_threshold INT DEFAULT 3 COMMENT '结转阈值（小于此数量结转，大于等于此数量顺延）',
        advance_days_limit INT DEFAULT 5 COMMENT '最多可提前几天完成任务',
        auto_defer_time TIME DEFAULT '00:00:00' COMMENT '自动处理未完成任务的时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_student_config (student_id)
      ) COMMENT '学生任务调度配置表'
    `;

    await query(createScheduleConfigSQL);
    console.log('✅ 任务调度配置表创建完成');

    // 4. 为现有任务数据设置original_date
    const updateExistingTasksSQL = `
      UPDATE tasks 
      SET original_date = task_date 
      WHERE original_date IS NULL
    `;
    
    await query(updateExistingTasksSQL);
    console.log('✅ 现有任务数据升级完成');

    // 5. 插入默认配置
    const insertDefaultConfigSQL = `
      INSERT INTO schedule_config (student_id, daily_task_limit, carry_over_threshold, advance_days_limit) 
      SELECT id, 4, 3, 5 FROM students 
      ON DUPLICATE KEY UPDATE 
        daily_task_limit = VALUES(daily_task_limit),
        carry_over_threshold = VALUES(carry_over_threshold),
        advance_days_limit = VALUES(advance_days_limit)
    `;
    
    await query(insertDefaultConfigSQL);
    console.log('✅ 默认配置插入完成');

    console.log('🎉 数据库升级完成！');

  } catch (error) {
    console.error('❌ 数据库升级失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行升级
if (require.main === module) {
  upgradeDatabase()
    .then(() => {
      console.log('升级脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('升级脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { upgradeDatabase };