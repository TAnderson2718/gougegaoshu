-- 考研任务管理系统数据库表结构
-- 创建数据库
CREATE DATABASE IF NOT EXISTS exam_task_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE exam_task_system;

-- 1. 学生表
CREATE TABLE students (
    id VARCHAR(20) PRIMARY KEY COMMENT '学生ID，如ST001',
    name VARCHAR(50) NOT NULL COMMENT '学生姓名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
    force_password_change BOOLEAN DEFAULT TRUE COMMENT '是否强制修改密码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) COMMENT '学生基本信息表';

-- 2. 学生档案表
CREATE TABLE student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
    gender ENUM('男', '女', '') DEFAULT '' COMMENT '性别',
    age INT COMMENT '年龄',
    study_status ENUM('在读应届考研', '无业全职考研', '在职考研', '其他', '') DEFAULT '' COMMENT '学习状态',
    study_status_other VARCHAR(100) COMMENT '其他学习状态说明',
    math_type VARCHAR(50) COMMENT '数学类型',
    math_type_other VARCHAR(100) COMMENT '其他数学类型说明',
    target_score INT COMMENT '目标分数',
    daily_hours DECIMAL(3,1) COMMENT '每日学习小时数',
    
    -- 高考信息
    gaokao_year VARCHAR(10) DEFAULT '未参加' COMMENT '高考年份',
    gaokao_province VARCHAR(50) COMMENT '高考省份',
    gaokao_score INT COMMENT '高考分数',
    
    -- 考研信息
    grad_exam_year VARCHAR(10) DEFAULT '未参加' COMMENT '考研年份',
    grad_exam_math_type ENUM('未考', '数一', '数二', '数三') DEFAULT '未考' COMMENT '考研数学类型',
    grad_exam_score INT COMMENT '考研分数',
    
    -- 专升本信息
    upgrade_exam_year VARCHAR(10) DEFAULT '未参加' COMMENT '专升本年份',
    upgrade_exam_province VARCHAR(50) COMMENT '专升本省份',
    upgrade_exam_math_type ENUM('未分类', '数一', '数二', '数三') DEFAULT '未分类' COMMENT '专升本数学类型',
    upgrade_exam_score INT COMMENT '专升本分数',
    
    purchased_books TEXT COMMENT '已购买图书',
    notes TEXT COMMENT '特殊需求备注',
    is_profile_submitted BOOLEAN DEFAULT FALSE COMMENT '档案是否已提交',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_profile (student_id)
) COMMENT '学生档案详情表';

-- 3. 任务表
CREATE TABLE tasks (
    id VARCHAR(100) PRIMARY KEY COMMENT '任务ID',
    student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
    task_date DATE NOT NULL COMMENT '任务日期',
    task_type VARCHAR(50) NOT NULL COMMENT '任务类型：数学、英语、政治、专业课、复习、休息、leave等',
    title VARCHAR(500) NOT NULL COMMENT '任务标题',
    completed BOOLEAN DEFAULT FALSE COMMENT '是否完成',
    duration_hour INT DEFAULT 0 COMMENT '完成耗时（小时）',
    duration_minute INT DEFAULT 0 COMMENT '完成耗时（分钟）',
    proof_image LONGTEXT COMMENT '完成凭证图片（base64）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_date (student_id, task_date),
    INDEX idx_task_date (task_date),
    INDEX idx_task_type (task_type)
) COMMENT '学习任务表';

-- 4. 请假记录表
CREATE TABLE leave_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
    leave_date DATE NOT NULL COMMENT '请假日期',
    reason VARCHAR(200) COMMENT '请假原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_leave_date (student_id, leave_date)
) COMMENT '学生请假记录表';

-- 5. 系统配置表
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(200) COMMENT '配置说明',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_config_key (config_key)
) COMMENT '系统配置表';

-- 插入初始数据
INSERT INTO students (id, name, password, force_password_change) VALUES 
('ST001', '张三', '$2b$10$example_hashed_password_1', TRUE),
('ST002', '李四', '$2b$10$example_hashed_password_2', TRUE);

INSERT INTO system_config (config_key, config_value, description) VALUES 
('initial_password', 'Hello888', '学生初始密码'),
('system_date', CURDATE(), '系统当前日期（用于模拟）');

-- 创建视图：学生任务完成统计
CREATE VIEW student_task_stats AS
SELECT 
    s.id as student_id,
    s.name as student_name,
    DATE(t.task_date) as task_date,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
    SUM(CASE WHEN t.task_type = 'leave' THEN 1 ELSE 0 END) as leave_tasks,
    SUM(CASE WHEN t.task_type = '休息' THEN 1 ELSE 0 END) as rest_tasks
FROM students s
LEFT JOIN tasks t ON s.id = t.student_id
GROUP BY s.id, s.name, DATE(t.task_date);
