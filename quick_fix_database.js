const mysql = require('mysql2/promise');

async function fixDatabase() {
  const connection = await mysql.createConnection({
    host: 'dogmath.cn',
    port: 3306,
    user: 'root',
    password: 'Dd20241201',
    database: 'task_manager_db',
    charset: 'utf8mb4',
    timezone: '+08:00'
  });

  try {
    console.log('🔧 开始修复数据库表...');

    // 1. 添加 original_date 字段到 tasks 表
    try {
      await connection.execute('ALTER TABLE tasks ADD COLUMN original_date DATE COMMENT "原始日期（用于跟踪任务调度）"');
      console.log('✅ 添加 original_date 字段成功');
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
      console.log('ℹ️ original_date 字段已存在');
    }

    // 2. 添加索引
    try {
      await connection.execute('ALTER TABLE tasks ADD INDEX idx_original_date (original_date)');
      console.log('✅ 添加 original_date 索引成功');
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
      console.log('ℹ️ original_date 索引已存在');
    }

    // 3. 创建任务调度历史表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS task_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
        task_id INT COMMENT '原任务ID（如果是从任务表移动过来的）',
        task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
        title VARCHAR(200) NOT NULL COMMENT '任务标题',
        original_date DATE NOT NULL COMMENT '原始日期',
        moved_from_date DATE NOT NULL COMMENT '从哪个日期移动过来',
        moved_to_date DATE COMMENT '移动到哪个日期（NULL表示删除）',
        action_type ENUM('defer', 'carry_over', 'delete') NOT NULL COMMENT '操作类型',
        reason VARCHAR(100) COMMENT '操作原因',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_date (student_id, original_date),
        INDEX idx_action_date (action_type, created_at)
      ) COMMENT '任务调度历史记录表'
    `);
    console.log('✅ 创建任务调度历史表成功');

    // 4. 创建任务调度配置表
    await connection.execute(`
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
    `);
    console.log('✅ 创建任务调度配置表成功');

    // 5. 插入默认配置
    await connection.execute(`
      INSERT INTO schedule_config (student_id, daily_task_limit, carry_over_threshold, advance_days_limit) 
      SELECT id, 4, 3, 5 FROM students 
      ON DUPLICATE KEY UPDATE 
        daily_task_limit = VALUES(daily_task_limit),
        carry_over_threshold = VALUES(carry_over_threshold),
        advance_days_limit = VALUES(advance_days_limit)
    `);
    console.log('✅ 插入默认配置成功');

    // 6. 为现有任务设置 original_date
    await connection.execute('UPDATE tasks SET original_date = task_date WHERE original_date IS NULL');
    console.log('✅ 更新现有任务的 original_date 成功');

    console.log('🎉 数据库修复完成！');

  } catch (error) {
    console.error('❌ 数据库修复失败:', error);
  } finally {
    await connection.end();
  }
}

fixDatabase();
