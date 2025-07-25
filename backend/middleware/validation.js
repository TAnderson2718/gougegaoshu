const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');
const { ValidationError } = require('../utils/AppError');

/**
 * 安全的输入验证中间件
 * 防止SQL注入、XSS攻击和其他安全威胁
 */

// 自定义验证规则
const customValidators = {
  // 安全的字符串验证（防止XSS）
  safeString: () => Joi.string().custom((value, helpers) => {
    // 清理HTML标签和脚本
    const cleaned = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    if (cleaned !== value) {
      return helpers.error('string.unsafe', { value });
    }
    return cleaned;
  }).messages({
    'string.unsafe': '输入包含不安全的内容'
  }),

  // 用户ID验证（支持管理员和学生ID）
  userId: () => Joi.string()
    .pattern(/^[A-Za-z0-9]+$/)
    .min(3)
    .max(20)
    .messages({
      'string.pattern.base': '用户ID只能包含字母和数字',
      'string.min': '用户ID长度不能少于3位',
      'string.max': '用户ID长度不能超过20位'
    }),

  // 学生ID验证
  studentId: () => Joi.string()
    .pattern(/^ST\d{3,6}$/)
    .messages({
      'string.pattern.base': '学生ID格式错误，应为ST开头加3-6位数字'
    }),

  // 管理员ID验证
  adminId: () => Joi.string()
    .pattern(/^ADMIN\d{3,6}$/)
    .messages({
      'string.pattern.base': '管理员ID格式错误，应为ADMIN开头加3-6位数字'
    }),

  // 强密码验证
  strongPassword: () => Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.min': '密码长度不能少于8位',
      'string.max': '密码长度不能超过128位',
      'string.pattern.base': '密码必须包含大小写字母、数字和特殊字符(@$!%*?&)'
    }),

  // 基础密码验证（向后兼容）
  basicPassword: () => Joi.string()
    .min(6)
    .max(128)
    .messages({
      'string.min': '密码长度不能少于6位',
      'string.max': '密码长度不能超过128位'
    }),

  // 任务类型验证
  taskType: () => Joi.string()
    .valid('数学', '英语', '政治', '专业课', '复习', '模拟考试', '休息')
    .messages({
      'any.only': '任务类型无效'
    }),

  // 日期验证
  date: () => Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return helpers.error('date.invalid');
      }
      // 检查日期范围（不能太久远的过去或未来）
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 1, 0, 1);
      const maxDate = new Date(now.getFullYear() + 2, 11, 31);
      
      if (date < minDate || date > maxDate) {
        return helpers.error('date.range');
      }
      return value;
    })
    .messages({
      'string.pattern.base': '日期格式错误，应为YYYY-MM-DD',
      'date.invalid': '无效的日期',
      'date.range': '日期超出允许范围'
    }),

  // 文件名验证
  filename: () => Joi.string()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .max(255)
    .messages({
      'string.pattern.base': '文件名只能包含字母、数字、点、下划线和连字符',
      'string.max': '文件名长度不能超过255个字符'
    }),

  // SQL注入防护
  sqlSafe: () => Joi.string().custom((value, helpers) => {
    // 检查常见的SQL注入模式
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|"|`)/,
      /(\bOR\b|\bAND\b).*[=<>]/i,
      /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        return helpers.error('string.sql_injection');
      }
    }
    return value;
  }).messages({
    'string.sql_injection': '输入包含潜在的SQL注入内容'
  })
};

// 通用验证模式
const commonSchemas = {
  // 登录验证
  login: Joi.object({
    userId: customValidators.userId().optional(),
    studentId: customValidators.studentId().optional(),
    password: customValidators.basicPassword().required()
  }).custom((value, helpers) => {
    if (!value.userId && !value.studentId) {
      return helpers.error('any.required', { label: 'userId或studentId' });
    }
    if (value.studentId && !value.userId) {
      value.userId = value.studentId;
    }
    return value;
  }).messages({
    'any.required': 'userId或studentId是必填项'
  }),

  // 管理员登录验证
  adminLogin: Joi.object({
    userId: customValidators.userId().optional(),
    studentId: customValidators.userId().optional(), // 管理员也可以用studentId字段，但验证规则是userId
    password: Joi.string().min(1).required() // 管理员密码验证更宽松
  }).custom((value, helpers) => {
    if (!value.userId && !value.studentId) {
      return helpers.error('any.required', { label: 'userId或studentId' });
    }
    if (value.studentId && !value.userId) {
      value.userId = value.studentId;
    }
    return value;
  }).messages({
    'any.required': 'userId或studentId是必填项'
  }),

  // 修改密码验证
  changePassword: Joi.object({
    oldPassword: customValidators.basicPassword().required(),
    newPassword: customValidators.strongPassword().required()
  }),

  // 强制修改密码验证
  forceChangePassword: Joi.object({
    newPassword: customValidators.strongPassword().required()
  }),

  // 任务更新验证
  updateTask: Joi.object({
    completed: Joi.boolean().optional(),
    duration: Joi.object({
      hour: Joi.number().integer().min(0).max(23).optional(),
      minute: Joi.number().integer().min(0).max(59).optional()
    }).optional(),
    proof: customValidators.filename().optional(),
    completed_date: customValidators.date().optional(),
    is_future_task: Joi.boolean().optional()
  }),

  // 请假申请验证
  leaveRequest: Joi.object({
    date: customValidators.date().required(),
    reason: customValidators.safeString().max(500).optional()
  }),

  // 档案更新验证
  profileUpdate: Joi.object({
    gender: Joi.string().valid('男', '女').optional(),
    age: Joi.number().integer().min(16).max(60).optional(),
    studyStatus: Joi.string().valid(
      '在读应届考研', '在职考研', '二战考研', '三战及以上'
    ).optional(),
    mathType: Joi.string().valid('数学一', '数学二', '数学三', '不考数学').optional(),
    targetScore: Joi.number().integer().min(200).max(500).optional(),
    dailyHours: Joi.number().min(1).max(24).optional(),
    gaokaoYear: Joi.string().pattern(/^\d{4}$/).optional(),
    gaokaoProvince: customValidators.safeString().max(50).optional(),
    gaokaoScore: Joi.number().integer().min(0).max(750).optional(),
    notes: customValidators.safeString().max(1000).optional()
  }),

  // 批量导入验证
  bulkImport: Joi.object({
    csvData: Joi.string().max(10 * 1024 * 1024).required() // 最大10MB
  }),

  // 分页参数验证
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: customValidators.sqlSafe().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // 日期范围验证
  dateRange: Joi.object({
    startDate: customValidators.date().optional(),
    endDate: customValidators.date().optional(),
    view: Joi.string().valid('calendar', 'list', 'month').optional()
  }).custom((value, helpers) => {
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) > new Date(value.endDate)) {
        return helpers.error('dateRange.invalid');
      }
    }
    return value;
  }).messages({
    'dateRange.invalid': '开始日期不能晚于结束日期'
  })
};

/**
 * 创建验证中间件
 */
const createValidator = (schema, target = 'body') => {
  return (req, res, next) => {
    const data = target === 'query' ? req.query : 
                  target === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new ValidationError('输入验证失败', validationErrors));
    }

    // 将验证后的数据保存到req对象
    if (target === 'query') {
      req.validatedQuery = value;
    } else if (target === 'params') {
      req.validatedParams = value;
    } else {
      req.validatedBody = value;
    }

    next();
  };
};

/**
 * 预定义的验证中间件
 */
const validators = {
  login: createValidator(commonSchemas.login),
  adminLogin: createValidator(commonSchemas.adminLogin),
  changePassword: createValidator(commonSchemas.changePassword),
  forceChangePassword: createValidator(commonSchemas.forceChangePassword),
  updateTask: createValidator(commonSchemas.updateTask),
  leaveRequest: createValidator(commonSchemas.leaveRequest),
  profileUpdate: createValidator(commonSchemas.profileUpdate),
  bulkImport: createValidator(commonSchemas.bulkImport),
  pagination: createValidator(commonSchemas.pagination, 'query'),
  dateRange: createValidator(commonSchemas.dateRange, 'query')
};

module.exports = {
  customValidators,
  commonSchemas,
  createValidator,
  validators
};
