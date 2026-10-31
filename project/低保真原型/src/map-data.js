export const mapSkills = [
  { id: 'foundation', title: '理解问题与数据', skill: '理解表格', stage: '基础', rule: '建议基础', purpose: '先说清问题、表格口径与使用边界。', standard: '问题描述与未知项', dependency: '建议了解表格；未知也可阅读，不作硬性阻止。' },
  { id: 'sql', title: 'SQL 查询', skill: 'SQL', stage: '工具', rule: 'OR 技术替代', purpose: '用查询整理问题所需的合成记录。', standard: '查询思路与结果说明', dependency: 'SQL OR 表格工具，任选一条；不是两者全部必需。' },
  { id: 'sheet', title: '表格工具', skill: '表格工具', stage: '工具', rule: 'OR 技术替代', purpose: '用表格整理同一问题所需的合成记录。', standard: '整理步骤与结果说明', dependency: '与 SQL 为 OR 替代，可接受已有相关材料。' },
  { id: 'quality', title: '质量问题清单', skill: '质量问题清单', stage: '产物', rule: 'AND 必要交付', purpose: '记录发现的问题、原值与处理取舍。', standard: '质量问题清单', dependency: '问题清单 AND 处理理由 AND 限制说明，按本任务交付标准检查。' },
  { id: 'limits', title: '说明处理理由与局限', skill: '表达与局限', stage: '产物', rule: 'AND 必要交付', purpose: '说明为什么这样处理，以及结论不能支持什么。', standard: '处理理由、本人贡献与限制说明', dependency: '与问题清单同时交付；已读、自述不自动满足产物依赖。' },
];
