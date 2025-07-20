const { query, transaction } = require('./config/database.js');

async function fixJuly14Final() {
  try {
    console.log('=== 最终修复7月14日休息日问题 ===');
    
    // 1. 确认7月14日是星期几
    const date = new Date('2025-07-14');
    const dayOfWeek = date.getDay();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    console.log(`\n1. 日期确认: 2025年7月14日是星期${dayNames[dayOfWeek]} (数字: ${dayOfWeek})`);
    
    if (dayOfWeek === 1) {
      console.log('✅ 确认：7月14日是星期一，应该是工作日，不应该有休息任务');
    }
    
    // 2. 检查数据库中7月14日的所有任务
    console.log('\n2. 检查数据库中7月14日的任务:');
    const july14Tasks = await query(
      'SELECT * FROM tasks WHERE DATE(task_date) = ? ORDER BY student_id, task_type',
      ['2025-07-14']
    );
    
    console.log(`找到 ${july14Tasks.length} 个任务:`);
    july14Tasks.forEach(task => {
      console.log(`  ${task.student_id}: ${task.task_type} - ${task.title}`);
    });
    
    // 3. 查找并删除任何错误的休息任务
    console.log('\n3. 查找7月14日的休息任务:');
    const restTasks = july14Tasks.filter(task => task.task_type === '休息');
    
    if (restTasks.length > 0) {
      console.log(`❌ 发现 ${restTasks.length} 个错误的休息任务:`);
      restTasks.forEach(task => {
        console.log(`  ${task.student_id}: ${task.title} (ID: ${task.id})`);
      });
      
      console.log('\n删除这些错误的休息任务...');
      for (const task of restTasks) {
        await query('DELETE FROM tasks WHERE id = ?', [task.id]);
        console.log(`  ✅ 删除了任务: ${task.id}`);
      }
    } else {
      console.log('✅ 没有发现休息任务，数据库状态正确');
    }
    
    // 4. 确保每个学生都有正确的学习任务
    console.log('\n4. 确保学习任务完整性:');
    const students = ['ST001', 'ST002'];
    const taskTypes = ['数学', '英语', '专业课'];
    
    for (const studentId of students) {
      console.log(`\n检查学生 ${studentId}:`);
      const studentTasks = july14Tasks.filter(task => 
        task.student_id === studentId && task.task_type !== '休息'
      );
      
      console.log(`  现有任务: ${studentTasks.length} 个`);
      studentTasks.forEach(task => {
        console.log(`    ${task.task_type}: ${task.title}`);
      });
      
      // 检查是否缺少任务类型
      const existingTypes = studentTasks.map(task => task.task_type);
      const missingTypes = taskTypes.filter(type => !existingTypes.includes(type));
      
      if (missingTypes.length > 0) {
        console.log(`  ❌ 缺少任务类型: ${missingTypes.join(', ')}`);
        
        // 添加缺失的任务
        for (const taskType of missingTypes) {
          const taskTitles = {
            ST001: {
              数学: '数理统计方法',
              英语: '听力技巧训练',
              专业课: '云计算架构设计'
            },
            ST002: {
              数学: '数理统计方法',
              英语: '听力技巧训练',
              专业课: '云计算架构设计'
            }
          };
          
          const title = taskTitles[studentId][taskType];
          const taskId = `${studentId}-2025-07-14-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await query(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, duration_hour, duration_minute) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [taskId, studentId, '2025-07-14', taskType, title, 0, 0, 0]
          );
          
          console.log(`  ✅ 添加了任务: ${taskType} - ${title}`);
        }
      } else {
        console.log(`  ✅ 任务完整`);
      }
    }
    
    // 5. 最终验证
    console.log('\n5. 最终验证:');
    const finalTasks = await query(
      'SELECT * FROM tasks WHERE DATE(task_date) = ? ORDER BY student_id, task_type',
      ['2025-07-14']
    );
    
    console.log(`7月14日最终任务数: ${finalTasks.length}`);
    
    const tasksByStudent = {};
    finalTasks.forEach(task => {
      if (!tasksByStudent[task.student_id]) {
        tasksByStudent[task.student_id] = [];
      }
      tasksByStudent[task.student_id].push(task);
    });
    
    Object.keys(tasksByStudent).forEach(studentId => {
      const tasks = tasksByStudent[studentId];
      const restTasks = tasks.filter(t => t.task_type === '休息');
      const learningTasks = tasks.filter(t => t.task_type !== '休息');
      
      console.log(`\n${studentId}:`);
      console.log(`  学习任务: ${learningTasks.length} 个`);
      learningTasks.forEach(task => {
        console.log(`    ${task.task_type}: ${task.title}`);
      });
      
      if (restTasks.length > 0) {
        console.log(`  ❌ 仍有休息任务: ${restTasks.length} 个`);
        restTasks.forEach(task => {
          console.log(`    ${task.task_type}: ${task.title}`);
        });
      } else {
        console.log(`  ✅ 无休息任务`);
      }
    });
    
    console.log('\n✅ 7月14日数据修复完成！');
    console.log('\n建议：');
    console.log('1. 清除浏览器缓存');
    console.log('2. 重新登录前端应用');
    console.log('3. 检查7月14日是否正确显示为工作日');
    
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixJuly14Final();
