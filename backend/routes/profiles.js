const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken, checkPasswordChange } = require('../middleware/auth');

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);
router.use(checkPasswordChange);

// 学生档案验证schema
const profileSchema = Joi.object({
  gender: Joi.string().valid('男', '女', '').allow(''),
  age: Joi.number().integer().min(16).max(60).allow(null),
  studyStatus: Joi.string().valid('在读应届考研', '无业全职考研', '在职考研', '其他', '').allow(''),
  studyStatusOther: Joi.string().max(100).allow(''),
  mathType: Joi.string().max(50).allow(''),
  mathTypeOther: Joi.string().max(100).allow(''),
  targetScore: Joi.number().integer().min(70).max(150).allow(null),
  dailyHours: Joi.number().min(0).max(24).allow(null),
  gaokaoYear: Joi.string().max(10).allow(''),
  gaokaoProvince: Joi.string().max(50).allow(''),
  gaokaoScore: Joi.number().integer().min(0).max(750).allow(null),
  gradExamYear: Joi.string().max(10).allow(''),
  gradExamMathType: Joi.string().valid('未考', '数一', '数二', '数三').allow(''),
  gradExamScore: Joi.number().integer().min(0).max(500).allow(null),
  upgradeExamYear: Joi.string().max(10).allow(''),
  upgradeExamProvince: Joi.string().max(50).allow(''),
  upgradeExamMathType: Joi.string().valid('未分类', '数一', '数二', '数三').allow(''),
  upgradeExamScore: Joi.number().integer().min(0).max(500).allow(null),
  purchasedBooks: Joi.string().allow(''),
  notes: Joi.string().allow('')
});

// 获取学生档案
router.get('/', async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const profiles = await query(
      'SELECT * FROM student_profiles WHERE student_id = ?',
      [studentId]
    );

    if (profiles.length === 0) {
      // 返回空档案模板
      return res.json({
        success: true,
        data: {
          studentId,
          name: req.user.name,
          isProfileSubmitted: false,
          // 其他字段为空
        }
      });
    }

    const profile = profiles[0];
    
    res.json({
      success: true,
      data: {
        studentId: profile.student_id,
        name: req.user.name,
        gender: profile.gender,
        age: profile.age,
        studyStatus: profile.study_status,
        studyStatusOther: profile.study_status_other,
        mathType: profile.math_type,
        mathTypeOther: profile.math_type_other,
        targetScore: profile.target_score,
        dailyHours: profile.daily_hours,
        gaokaoYear: profile.gaokao_year,
        gaokaoProvince: profile.gaokao_province,
        gaokaoScore: profile.gaokao_score,
        gradExamYear: profile.grad_exam_year,
        gradExamMathType: profile.grad_exam_math_type,
        gradExamScore: profile.grad_exam_score,
        upgradeExamYear: profile.upgrade_exam_year,
        upgradeExamProvince: profile.upgrade_exam_province,
        upgradeExamMathType: profile.upgrade_exam_math_type,
        upgradeExamScore: profile.upgrade_exam_score,
        purchasedBooks: profile.purchased_books,
        notes: profile.notes,
        isProfileSubmitted: profile.is_profile_submitted,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });

  } catch (error) {
    console.error('获取档案错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新学生档案
router.put('/', async (req, res) => {
  try {
    const { error, value } = profileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const studentId = req.user.studentId;

    // 检查档案是否已提交
    const existingProfiles = await query(
      'SELECT is_profile_submitted FROM student_profiles WHERE student_id = ?',
      [studentId]
    );

    if (existingProfiles.length > 0 && existingProfiles[0].is_profile_submitted) {
      return res.status(403).json({
        success: false,
        message: '档案已提交，无法修改'
      });
    }

    // 准备数据
    const profileData = {
      student_id: studentId,
      gender: value.gender || '',
      age: value.age,
      study_status: value.studyStatus || '',
      study_status_other: value.studyStatusOther || '',
      math_type: value.mathType || '',
      math_type_other: value.mathTypeOther || '',
      target_score: value.targetScore,
      daily_hours: value.dailyHours,
      gaokao_year: value.gaokaoYear || '未参加',
      gaokao_province: value.gaokaoProvince || '',
      gaokao_score: value.gaokaoScore,
      grad_exam_year: value.gradExamYear || '未参加',
      grad_exam_math_type: value.gradExamMathType || '未考',
      grad_exam_score: value.gradExamScore,
      upgrade_exam_year: value.upgradeExamYear || '未参加',
      upgrade_exam_province: value.upgradeExamProvince || '',
      upgrade_exam_math_type: value.upgradeExamMathType || '未分类',
      upgrade_exam_score: value.upgradeExamScore,
      purchased_books: value.purchasedBooks || '',
      notes: value.notes || '',
      is_profile_submitted: true // 提交时标记为已提交
    };

    if (existingProfiles.length === 0) {
      // 插入新档案
      await query(
        `INSERT INTO student_profiles (
          student_id, gender, age, study_status, study_status_other, math_type, math_type_other,
          target_score, daily_hours, gaokao_year, gaokao_province, gaokao_score,
          grad_exam_year, grad_exam_math_type, grad_exam_score, upgrade_exam_year,
          upgrade_exam_province, upgrade_exam_math_type, upgrade_exam_score,
          purchased_books, notes, is_profile_submitted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(profileData)
      );
    } else {
      // 更新现有档案
      await query(
        `UPDATE student_profiles SET 
          gender = ?, age = ?, study_status = ?, study_status_other = ?, math_type = ?, math_type_other = ?,
          target_score = ?, daily_hours = ?, gaokao_year = ?, gaokao_province = ?, gaokao_score = ?,
          grad_exam_year = ?, grad_exam_math_type = ?, grad_exam_score = ?, upgrade_exam_year = ?,
          upgrade_exam_province = ?, upgrade_exam_math_type = ?, upgrade_exam_score = ?,
          purchased_books = ?, notes = ?, is_profile_submitted = ?, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = ?`,
        [
          profileData.gender, profileData.age, profileData.study_status, profileData.study_status_other,
          profileData.math_type, profileData.math_type_other, profileData.target_score, profileData.daily_hours,
          profileData.gaokao_year, profileData.gaokao_province, profileData.gaokao_score,
          profileData.grad_exam_year, profileData.grad_exam_math_type, profileData.grad_exam_score,
          profileData.upgrade_exam_year, profileData.upgrade_exam_province, profileData.upgrade_exam_math_type,
          profileData.upgrade_exam_score, profileData.purchased_books, profileData.notes,
          profileData.is_profile_submitted, studentId
        ]
      );
    }

    res.json({
      success: true,
      message: '档案保存成功'
    });

  } catch (error) {
    console.error('更新档案错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
