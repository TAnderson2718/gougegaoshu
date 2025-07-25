const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');
const logger = require('../utils/Logger');

/**
 * 用户仓库类
 * 处理学生和管理员的数据访问
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('students'); // 默认表名，会根据方法动态切换
  }

  /**
   * 根据ID查找学生
   */
  async findStudentById(studentId) {
    const sql = `
      SELECT id, name, gender, age, grade, major, bio, avatar, 
             created_at, updated_at
      FROM students 
      WHERE id = ?
    `;
    return await this.queryOne(sql, [studentId]);
  }

  /**
   * 根据ID查找学生（包含密码，用于认证）
   */
  async findStudentByIdWithPassword(studentId) {
    const sql = `SELECT * FROM students WHERE id = ?`;
    return await this.queryOne(sql, [studentId]);
  }

  /**
   * 查找所有学生
   */
  async findAllStudents(options = {}) {
    const { page = 1, limit = 20, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT id, name, gender, age, grade, major, bio, avatar, 
             created_at, updated_at
      FROM students
    `;
    
    const params = [];
    
    if (search) {
      sql += ` WHERE name LIKE ? OR id LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const students = await this.query(sql, params);
    
    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM students`;
    const countParams = [];
    
    if (search) {
      countSql += ` WHERE name LIKE ? OR id LIKE ?`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const countResult = await this.queryOne(countSql, countParams);
    const total = countResult ? countResult.total : 0;
    
    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * 创建学生
   */
  async createStudent(studentData) {
    const { password, ...otherData } = studentData;
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const data = {
      ...otherData,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const sql = `
      INSERT INTO students (id, name, password, gender, age, grade, major, bio, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      data.id, data.name, data.password, data.gender, data.age,
      data.grade, data.major, data.bio, data.avatar, data.created_at, data.updated_at
    ];
    
    const result = await this.execute(sql, values);
    
    if (result.success) {
      logger.logBusiness('student_created', data.id, { name: data.name });
      return await this.findStudentById(data.id);
    }
    
    return null;
  }

  /**
   * 更新学生信息
   */
  async updateStudent(studentId, updateData) {
    const { password, ...otherData } = updateData;
    
    let data = { ...otherData };
    
    // 如果包含密码，需要加密
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    
    data.updated_at = new Date().toISOString();
    
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const sql = `UPDATE students SET ${setClause} WHERE id = ?`;
    const result = await this.execute(sql, [...values, studentId]);
    
    if (result.success) {
      logger.logBusiness('student_updated', studentId, { fields: fields });
      return await this.findStudentById(studentId);
    }
    
    return null;
  }

  /**
   * 验证学生密码
   */
  async validateStudentPassword(studentId, password) {
    const student = await this.findStudentByIdWithPassword(studentId);
    
    if (!student) {
      return { valid: false, student: null };
    }
    
    const isValid = await bcrypt.compare(password, student.password);
    
    logger.logAuth('student_password_validation', studentId, isValid);
    
    return {
      valid: isValid,
      student: isValid ? await this.findStudentById(studentId) : null
    };
  }

  /**
   * 根据ID查找管理员
   */
  async findAdminById(adminId) {
    const sql = `
      SELECT id, name, role, created_at, updated_at
      FROM admins 
      WHERE id = ?
    `;
    return await this.queryOne(sql, [adminId]);
  }

  /**
   * 根据ID查找管理员（包含密码，用于认证）
   */
  async findAdminByIdWithPassword(adminId) {
    const sql = `SELECT * FROM admins WHERE id = ?`;
    return await this.queryOne(sql, [adminId]);
  }

  /**
   * 查找所有管理员
   */
  async findAllAdmins() {
    const sql = `
      SELECT id, name, role, created_at, updated_at
      FROM admins 
      ORDER BY created_at DESC
    `;
    return await this.query(sql);
  }

  /**
   * 创建管理员
   */
  async createAdmin(adminData) {
    const { password, ...otherData } = adminData;
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const data = {
      ...otherData,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const sql = `
      INSERT INTO admins (id, name, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [data.id, data.name, data.password, data.role, data.created_at, data.updated_at];
    const result = await this.execute(sql, values);
    
    if (result.success) {
      logger.logBusiness('admin_created', data.id, { name: data.name, role: data.role });
      return await this.findAdminById(data.id);
    }
    
    return null;
  }

  /**
   * 验证管理员密码
   */
  async validateAdminPassword(adminId, password) {
    const admin = await this.findAdminByIdWithPassword(adminId);
    
    if (!admin) {
      return { valid: false, admin: null };
    }
    
    const isValid = await bcrypt.compare(password, admin.password);
    
    logger.logAuth('admin_password_validation', adminId, isValid);
    
    return {
      valid: isValid,
      admin: isValid ? await this.findAdminById(adminId) : null
    };
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId, newPassword, userType = 'student') {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const tableName = userType === 'admin' ? 'admins' : 'students';
    
    const sql = `
      UPDATE ${tableName} 
      SET password = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = await this.execute(sql, [hashedPassword, userId]);
    
    if (result.success) {
      logger.logBusiness('password_updated', userId, { userType });
    }
    
    return result.success;
  }

  /**
   * 检查用户是否存在
   */
  async userExists(userId, userType = 'student') {
    const tableName = userType === 'admin' ? 'admins' : 'students';
    const sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE id = ?`;
    const result = await this.queryOne(sql, [userId]);
    return result && result.count > 0;
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats() {
    const studentCountSql = `SELECT COUNT(*) as count FROM students`;
    const adminCountSql = `SELECT COUNT(*) as count FROM admins`;
    
    const [studentResult, adminResult] = await Promise.all([
      this.queryOne(studentCountSql),
      this.queryOne(adminCountSql)
    ]);
    
    return {
      students: studentResult ? studentResult.count : 0,
      admins: adminResult ? adminResult.count : 0,
      total: (studentResult ? studentResult.count : 0) + (adminResult ? adminResult.count : 0)
    };
  }

  /**
   * 批量创建学生
   */
  async createStudentsBatch(studentsData) {
    const results = [];
    
    await this.transaction(async (db) => {
      for (const studentData of studentsData) {
        try {
          const student = await this.createStudent(studentData);
          results.push({ success: true, student, id: studentData.id });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message, 
            id: studentData.id 
          });
        }
      }
    });
    
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    logger.logBusiness('students_batch_created', 'system', {
      total: results.length,
      successful,
      failed
    });
    
    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }
}

module.exports = UserRepository;
