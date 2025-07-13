// 修复调度逻辑脚本
const { query, transaction } = require('../config/database');

async function fixScheduleLogic() {
  try {
    console.log('=== 修复调度逻辑 ===');
    
    // 方案1: 调整结转阈值
    console.log('\n方案1: 调整结转阈值');
    console.log('当前问题: 结转阈值=3，但学生每天有3-6个任务，几乎总是触发整体顺延');
    console.log('建议调整: 将结转阈值提高到5或6，减少整体顺延的触发');
    
    // 方案2: 修改顺延策略
    console.log('\n方案2: 修改顺延策略');
    console.log('当前问题: 整体顺延时会顺延所有未来任务，造成任务堆积');
    console.log('建议修改: 限制顺延范围，只顺延近期任务（如7天内）');
    
    // 方案3: 智能顺延
    console.log('\n方案3: 智能顺延');
    console.log('建议: 根据任务类型和重要性进行差异化处理');
    
    console.log('\n请选择修复方案:');
    console.log('1. 调整结转阈值 (推荐)');
    console.log('2. 限制顺延范围');
    console.log('3. 综合修复');
    
    // 执行综合修复
    await comprehensiveFix();
    
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  }
}

async function comprehensiveFix() {
  try {
    console.log('\n=== 执行综合修复 ===');
    
    await transaction(async (connection) => {
      // 1. 调整结转阈值
      console.log('\n1. 调整结转阈值...');
      await connection.execute(`
        UPDATE schedule_config 
        SET carry_over_threshold = 5 
        WHERE carry_over_threshold = 3
      `);
      console.log('✅ 结转阈值从3调整为5');
      
      // 2. 添加顺延限制配置
      console.log('\n2. 添加顺延限制配置...');
      
      // 检查是否已有配置
      const [existingConfig] = await connection.execute(`
        SELECT * FROM schedule_config WHERE student_id = 'ST001'
      `);
      
      if (existingConfig.length > 0) {
        await connection.execute(`
          UPDATE schedule_config 
          SET 
            carry_over_threshold = 5,
            advance_days_limit = 7,
            daily_task_limit = 6
          WHERE student_id = 'ST001'
        `);
      }
      
      console.log('✅ 更新了ST001的调度配置');
      
      // 3. 清理过度顺延的任务
      console.log('\n3. 分析当前顺延情况...');
      
      const [deferredTasks] = await connection.execute(`
        SELECT original_date, task_date, COUNT(*) as count
        FROM tasks 
        WHERE student_id = 'ST001' 
          AND task_status = 'deferred' 
          AND original_date IS NOT NULL
          AND task_date > DATE_ADD(original_date, INTERVAL 7 DAY)
        GROUP BY original_date, task_date
        ORDER BY original_date
      `);
      
      console.log(`发现 ${deferredTasks.length} 组过度顺延的任务`);
      
      if (deferredTasks.length > 0) {
        console.log('过度顺延的任务:');
        deferredTasks.forEach(row => {
          const originalDate = row.original_date.toISOString().split('T')[0];
          const currentDate = row.task_date.toISOString().split('T')[0];
          console.log(`  ${originalDate} -> ${currentDate}: ${row.count}个任务`);
        });
      }
    });
    
    console.log('\n=== 综合修复完成 ===');
    
    // 4. 验证修复效果
    await verifyFix();
    
  } catch (error) {
    console.error('综合修复失败:', error);
    throw error;
  }
}

async function verifyFix() {
  try {
    console.log('\n=== 验证修复效果 ===');
    
    // 检查新的配置
    const configs = await query('SELECT * FROM schedule_config WHERE student_id = "ST001"');
    if (configs.length > 0) {
      const config = configs[0];
      console.log('ST001的新配置:');
      console.log(`  结转阈值: ${config.carry_over_threshold}`);
      console.log(`  每日任务限制: ${config.daily_task_limit}`);
      console.log(`  提前天数限制: ${config.advance_days_limit}`);
    }
    
    // 模拟24:00处理逻辑
    console.log('\n模拟24:00处理逻辑:');
    const testDates = ['2025-07-16', '2025-07-17', '2025-07-18'];
    
    for (const date of testDates) {
      const tasks = await query(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as incomplete
        FROM tasks 
        WHERE student_id = 'ST001' AND task_date = ?
          AND task_type NOT IN ('leave', '休息')
      `, [date]);
      
      if (tasks.length > 0) {
        const { total, incomplete } = tasks[0];
        const threshold = 5; // 新阈值
        
        console.log(`  ${date}: 总计${total}个, 未完成${incomplete}个`);
        
        if (incomplete >= threshold) {
          console.log(`    -> 触发整体顺延 (${incomplete} >= ${threshold})`);
        } else {
          console.log(`    -> 使用结转模式 (${incomplete} < ${threshold})`);
        }
      }
    }
    
  } catch (error) {
    console.error('验证失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixScheduleLogic()
    .then(() => {
      console.log('\n调度逻辑修复完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { fixScheduleLogic, comprehensiveFix, verifyFix };
