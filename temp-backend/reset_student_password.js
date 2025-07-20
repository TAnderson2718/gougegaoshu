const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function resetStudentPassword() {
  try {
    console.log('🔄 开始重置学生密码...');
    
    const newPassword = 'Hello888';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔐 新密码哈希:', hashedPassword.substring(0, 20) + '...');
    
    // 重置ST001和ST002的密码，并取消强制修改密码
    const result1 = await query(
      'UPDATE students SET password = ?, force_password_change = FALSE WHERE id = ?',
      [hashedPassword, 'ST001']
    );
    
    const result2 = await query(
      'UPDATE students SET password = ?, force_password_change = FALSE WHERE id = ?',
      [hashedPassword, 'ST002']
    );
    
    console.log('✅ ST001密码已重置，影响行数:', result1.affectedRows);
    console.log('✅ ST002密码已重置，影响行数:', result2.affectedRows);
    
    // 验证更新
    const students = await query('SELECT id, name, force_password_change FROM students WHERE id IN ("ST001", "ST002")');
    console.log('📋 学生信息:');
    students.forEach(student => {
      console.log(`  ${student.id} (${student.name}): 强制修改密码=${student.force_password_change}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
    process.exit(1);
  }
}

resetStudentPassword();
