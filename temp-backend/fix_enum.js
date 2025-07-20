const { query } = require('./config/database');

async function fixEnum() {
  try {
    console.log('🔧 开始修复operation_type枚举...');
    
    // 修改枚举类型，添加midnight_process
    await query(`
      ALTER TABLE task_schedule_history 
      MODIFY COLUMN operation_type ENUM('defer', 'carry_over', 'advance', 'leave', 'midnight_process') 
      NOT NULL COMMENT '操作类型'
    `);
    
    console.log('✅ operation_type枚举更新成功');
    
    // 检查tasks表的id字段长度
    const columns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'task_manager_db'
      AND TABLE_NAME = 'tasks'
      AND COLUMN_NAME = 'id'
    `);

    console.log('📊 当前tasks.id字段信息:', columns[0]);

    if (columns[0] && columns[0].CHARACTER_MAXIMUM_LENGTH < 150) {
      console.log('🔧 扩展tasks.id字段长度...');
      await query(`ALTER TABLE tasks MODIFY COLUMN id VARCHAR(150) COMMENT '任务ID'`);
      console.log('✅ tasks.id字段长度扩展成功');
    } else {
      console.log('✅ tasks.id字段长度已足够');
    }
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
  
  process.exit(0);
}

fixEnum();
