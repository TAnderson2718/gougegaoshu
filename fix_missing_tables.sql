-- 修复缺失的数据库表
USE exam_task_system;

-- 1. 添加 original_date 字段到 tasks 表
ALTER TABLE tasks ADD COLUMN original_date DATE COMMENT '原始日期（用于跟踪任务调度）';
ALTER TABLE tasks ADD INDEX idx_original_date (original_date);

-- 2. 创建任务调度历史表
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
) COMMENT '任务调度历史记录表';

-- 3. 创建任务调度配置表
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
) COMMENT '学生任务调度配置表';

-- 4. 插入默认配置
INSERT INTO schedule_config (student_id, daily_task_limit, carry_over_threshold, advance_days_limit) 
SELECT id, 4, 3, 5 FROM students 
ON DUPLICATE KEY UPDATE 
    daily_task_limit = VALUES(daily_task_limit),
    carry_over_threshold = VALUES(carry_over_threshold),
    advance_days_limit = VALUES(advance_days_limit);

-- 5. 为现有任务设置 original_date
UPDATE tasks SET original_date = task_date WHERE original_date IS NULL;
