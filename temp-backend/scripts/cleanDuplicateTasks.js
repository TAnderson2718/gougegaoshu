const { query } = require('../config/database');

async function cleanDuplicateTasks() {
  try {
    console.log('开始清理重复任务...');

    // 查找重复任务
    const duplicates = await query(`
      SELECT student_id, task_date, task_type, title, COUNT(*) as count 
      FROM tasks 
      GROUP BY student_id, task_date, task_type, title 
      HAVING COUNT(*) > 1
      ORDER BY student_id, task_date
    `);

    console.log(`发现 ${duplicates.length} 组重复任务`);

    if (duplicates.length === 0) {
      console.log('没有重复任务需要清理');
      return;
    }

    // 对每组重复任务，保留最早创建的一个，删除其他的
    for (const duplicate of duplicates) {
      console.log(`清理重复任务: ${duplicate.student_id} - ${duplicate.task_date} - ${duplicate.title} (重复 ${duplicate.count} 次)`);
      
      // 获取所有重复任务，按创建时间排序
      const allTasks = await query(`
        SELECT id, created_at 
        FROM tasks 
        WHERE student_id = ? AND task_date = ? AND task_type = ? AND title = ?
        ORDER BY created_at ASC
      `, [duplicate.student_id, duplicate.task_date, duplicate.task_type, duplicate.title]);

      // 保留第一个（最早的），删除其余的
      const tasksToDelete = allTasks.slice(1);
      
      for (const task of tasksToDelete) {
        await query('DELETE FROM tasks WHERE id = ?', [task.id]);
        console.log(`  删除任务 ID: ${task.id}`);
      }
    }

    console.log('重复任务清理完成！');

    // 统计清理后的结果
    const totalTasks = await query('SELECT COUNT(*) as count FROM tasks');
    console.log(`当前任务总数: ${totalTasks[0].count}`);

  } catch (error) {
    console.error('清理重复任务失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行清理
if (require.main === module) {
  cleanDuplicateTasks()
    .then(() => {
      console.log('清理脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('清理脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { cleanDuplicateTasks };