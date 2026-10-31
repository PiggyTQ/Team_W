// 原创职业认知与练习内容，依据项目正式基础画像整理。
// O*NET 只核对职业功能；不沿用美国薪资、学历分布或就业前景。
// 技能层级和成长阶段为学习组织方式，不是统一招聘条件或晋升规则。
const onet = (code, label) => ({label: `O*NET · ${label}`, url: `https://www.onetonline.org/link/summary/${code}`});

export const careerDetailNotes = {
  content: '职业知识与练习为项目原创整理；练习情境为模拟任务，不代表企业真实项目。',
  skills: '基础、核心与进阶用于安排学习顺序；技术路径按方向选择，不要求全部掌握。',
  growth: '按可观察成果组织学习阶段，不对应固定年限、职级或晋升承诺。',
  related: '相邻方向用于比较任务与学习基础，不表示转岗概率或个人适合度。',
  source: 'O*NET 用于职业功能术语参考，不作为国内学历、薪酬或招聘门槛。官方链接于 2026-10-24 核对。'
};

export const careerDetailContent = {
  data: {
    englishName: 'Data Analyst',
    lead: '把模糊的业务疑问，转成有数据依据、能解释局限的判断。',
    scenario: '模拟情境：业务方发现活动报名减少。你需要核对统计口径，检查缺失与重复，按渠道和日期描述变化，并说明现有数据还不能回答什么。',
    workflow: [
      {title: '问清问题', description: '确认谁需要决策、比较什么、统计对象和时间范围是什么。', output: '问题与指标口径'},
      {title: '检查数据', description: '用 SQL 或表格核对来源、缺失、重复和异常，保留处理理由。', output: '可复核的数据集'},
      {title: '分析表达', description: '分组比较、选择图表，区分看到的差异与可能的解释。', output: '图表与分析说明'},
      {title: '沟通复核', description: '回答业务追问，记录替代解释、样本限制和下一步验证。', output: '建议与未知项清单'}
    ],
    skills: [
      {label: '基础', items: ['表格处理', 'SQL', '描述统计'], application: '理解字段与分母，完成筛选、分组和基础核对。'},
      {label: '核心', items: ['指标口径', '数据质量', '图表表达'], application: '围绕同一问题组织证据，让结论能回到原始数据。'},
      {label: '进阶', items: ['实验设计', '数据建模', '领域分析'], application: '按业务方向深入；在明确条件下区分关联与因果。'}
    ],
    deliverables: [
      {title: '问题与口径说明', description: '把业务语言转成可计算的问题。', checks: ['对象、范围与分母明确', '字段来源可追溯']},
      {title: '分析脚本与图表', description: '记录查询、清洗和比较过程。', checks: ['缺失与重复处理有理由', '图表单位、口径一致']},
      {title: '结论与限制', description: '用证据说明发现及其适用范围。', checks: ['发现与推测分开', '列出无法验证的解释']}
    ],
    collaboration: [
      {role: '业务与产品', exchange: '对齐问题、指标定义与需要采取的行动。'},
      {role: '数据工程', exchange: '确认字段来源、更新机制和数据质量问题。'},
      {role: '开发与运营', exchange: '核实采集逻辑、活动变化与结果解释。'}
    ],
    growth: [
      {stage: '01', title: '读懂一份数据', description: '在指导下完成口径核对和描述分析，解释自己的处理。'},
      {stage: '02', title: '独立回答问题', description: '交付可重跑的分析，主动检查异常与结论限制。'},
      {stage: '03', title: '支持复杂决策', description: '比较多种方法，与业务协作设计进一步验证。'}
    ],
    practice: {
      title: '做一次数据质量与分析练习',
      brief: '选择一份明确标注为合成或公开许可的活动数据，回答“不同渠道的报名情况有什么差异”。',
      steps: ['写清问题、字段定义和统计范围。', '记录缺失、重复与异常，保留原值和处理理由。', '用表格或 SQL 形成分组结果与一张图。', '写出观察、替代解释和未解决问题。'],
      deliverable: '问题清单、处理记录、分析图表与限制说明',
      checks: ['比例均有分母与范围', '处理步骤能够复现', '不把合成结果解释为真实市场趋势']
    },
    pitfalls: ['会使用工具不等于已理解业务口径。', '相关变化不能直接证明因果关系。', '样本缺失与选择偏差会改变结论范围。'],
    related: ['engineering', 'ai'],
    source: onet('15-2051.01', 'Business Intelligence Analysts')
  },
  ai: {
    englishName: 'AI / Machine Learning Engineer',
    lead: '让模型围绕明确任务工作，并用可复核的评估判断它是否可靠。',
    scenario: '模拟情境：制作职业资料问答原型。你需要限定知识范围，组织检索与生成流程，用独立问题检查引用、错误和未知回答，再记录可改进之处。',
    workflow: [
      {title: '定义任务', description: '说明输入、预期输出、使用边界和什么算失败。', output: '任务与评估规则'},
      {title: '准备流程', description: '检查数据质量，搭建模型调用或离线模拟流程。', output: '可演示原型'},
      {title: '独立评估', description: '保留独立测试问题，分类记录回答错误与引用问题。', output: '输入输出与错误记录'},
      {title: '迭代集成', description: '比较改动前后表现，处理无依据回答和服务异常。', output: '改进说明与运行边界'}
    ],
    skills: [
      {label: '基础', items: ['Python', '数据处理', 'Git'], application: '组织实验输入、调用逻辑和可复现的代码版本。'},
      {label: '核心', items: ['模型评估', '错误分析', '数据质量'], application: '先定义检查标准，再分析模型在哪些情况失败。'},
      {label: '进阶', items: ['检索增强', '模型部署', 'MLOps'], application: '按应用、算法或平台方向选择，补充运行与监测能力。'}
    ],
    deliverables: [
      {title: '任务与数据说明', description: '明确模型在什么范围内回答什么问题。', checks: ['数据使用范围清楚', '预期结果与失败条件明确']},
      {title: '原型与实验记录', description: '保留版本、输入输出和运行方法。', checks: ['调用或离线方式已标注', '示例与独立测试分开']},
      {title: '评估与错误分析', description: '定位错误类型，说明改动及未解决问题。', checks: ['引用实际支持结论', '无依据时保留未知']}
    ],
    collaboration: [
      {role: '产品与领域专家', exchange: '确认任务价值、错误代价和可接受的输出形式。'},
      {role: '数据工程', exchange: '对齐数据来源、清洗规则和更新方式。'},
      {role: '后端与运维', exchange: '约定服务接口、失败处理和运行监控。'}
    ],
    growth: [
      {stage: '01', title: '复现一个任务', description: '读懂示例，记录输入输出并解释自己的改动。'},
      {stage: '02', title: '完成评估闭环', description: '独立准备测试集，分析失败并验证改进。'},
      {stage: '03', title: '处理复杂约束', description: '结合成本、延迟、质量与风险比较方案并协作集成。'}
    ],
    practice: {
      title: '制作 AI 调用与评估记录',
      brief: '以职业资料问答为任务，允许用离线合成输入输出完成评估，不要求调用真实模型。',
      steps: ['定义回答范围、引用要求和未知回答规则。', '准备开发示例与独立测试问题。', '记录每次输入、输出、依据及错误类型。', '选择一个错误提出修订，写清复核方式与局限。'],
      deliverable: '任务说明、输入输出表、评估规则与错误分析',
      checks: ['合成输出已明确标注', '没有把流畅表达当作正确证据', '未测试部分保持未知']
    },
    pitfalls: ['一般 AI 工具使用不能直接等同于算法开发能力。', '把测试问题用于反复调试，会削弱独立评估。', '模型应用、算法研发和训练平台是不同技术路径。'],
    related: ['engineering', 'data'],
    source: onet('15-2051.00', 'Data Scientists')
  },
  security: {
    englishName: 'Cybersecurity Engineer',
    lead: '在明确授权的范围内识别风险，用证据推动整改与复核。',
    scenario: '模拟情境：一组离线合成登录日志出现异常记录。你需要建立事件时间线，区分可观察事实与推测，提出补充核实和处理建议，不操作真实账户或网络。',
    workflow: [
      {title: '确认范围', description: '核对授权对象、允许操作和需要保护的信息。', output: '授权与资产范围'},
      {title: '整理线索', description: '检查日志、配置或访问记录，保存可追溯证据。', output: '事实与线索清单'},
      {title: '分析响应', description: '评估可能影响，提出替代解释和分级处理建议。', output: '风险分析与处理建议'},
      {title: '整改复核', description: '核对修复结果，记录仍未验证的条件和风险。', output: '复核报告与待办'}
    ],
    skills: [
      {label: '基础', items: ['网络基础', 'Linux', '访问控制'], application: '读懂系统、账户权限与常见通信过程。'},
      {label: '核心', items: ['日志分析', '风险判断', '证据记录'], application: '让每项风险结论都有事实支撑，并说明不确定性。'},
      {label: '进阶', items: ['安全加固', '应用安全', '自动化分析'], application: '按安全运营、应用安全或咨询方向深入。'}
    ],
    deliverables: [
      {title: '授权与检查范围', description: '写清检查对象、边界和允许的方法。', checks: ['对象属于授权范围', '敏感信息处理方式明确']},
      {title: '线索与风险记录', description: '把事件事实、推测和补充核实需求分开。', checks: ['证据与时间可追溯', '记录合理的替代解释']},
      {title: '整改与复核报告', description: '说明处理建议、责任衔接和复核结果。', checks: ['修复后有复核记录', '未验证项没有冒称已解决']}
    ],
    collaboration: [
      {role: '运维与系统管理员', exchange: '核对资产、日志完整性和运行影响。'},
      {role: '开发与测试', exchange: '提供复现条件，确认权限修复及回归范围。'},
      {role: '业务与数据负责人', exchange: '明确风险影响、数据范围和处理优先级。'}
    ],
    growth: [
      {stage: '01', title: '辨认事实与线索', description: '在合成材料中整理异常，说明判断依据。'},
      {stage: '02', title: '完成检查闭环', description: '在授权实验环境中检查、记录、修复并复核。'},
      {stage: '03', title: '改善风险机制', description: '结合业务影响协作改进监测、响应和安全控制。'}
    ],
    practice: {
      title: '分析离线合成登录日志',
      brief: '仅使用合成日志，练习建立时间线、定位异常和表达结论边界。',
      steps: ['注明数据为合成材料，并确认分析范围。', '按时间和账户整理可疑事件及原始行号。', '为每个异常写出可能原因与替代解释。', '列出需要核实的信息、处理建议及未验证项。'],
      deliverable: '事件时间线、线索表、替代解释与分析限制',
      checks: ['未接触真实网络或账户', '每项线索可回到原始日志', '异常未被直接宣称为已确认入侵']
    },
    pitfalls: ['异常记录不必然等于攻击或入侵。', '未授权操作不能成为实践成果。', '渗透测试、安全运营与数据安全不能合成单一门槛。'],
    related: ['ops', 'backend'],
    source: onet('15-1212.00', 'Information Security Analysts')
  },
  ops: {
    englishName: 'Operations / DevOps / SRE Engineer',
    lead: '让服务可观察、变更可回退、故障可恢复，并从复盘中减少重复风险。',
    scenario: '模拟情境：新版本发布后服务请求失败。你需要从给定监控和故障记录判断影响范围，组织恢复顺序、回退条件和数据核对，形成可执行的演练说明。',
    workflow: [
      {title: '配置交付', description: '核对运行环境、配置依赖、部署步骤和变更范围。', output: '部署与配置说明'},
      {title: '监控定位', description: '从指标、日志和告警判断影响，记录待验证假设。', output: '故障时间线'},
      {title: '恢复回退', description: '按预案控制变更、恢复服务并核对数据完整性。', output: '恢复与回退记录'},
      {title: '复盘改进', description: '检查触发条件和监测盲点，改进脚本与操作流程。', output: '复盘与改进清单'}
    ],
    skills: [
      {label: '基础', items: ['Linux', '网络基础', 'Shell'], application: '理解进程、配置、日志与常见服务连接问题。'},
      {label: '核心', items: ['监控告警', '备份恢复', '变更回退'], application: '把故障发现、影响判断和恢复检查串成闭环。'},
      {label: '进阶', items: ['持续交付', '基础设施自动化', '可靠性设计'], application: '按系统运维、DevOps 或 SRE 方向选择深入。'}
    ],
    deliverables: [
      {title: '运行与部署说明', description: '记录环境、依赖和可重复的部署过程。', checks: ['配置与代码版本对应', '敏感凭据未进入公开材料']},
      {title: '故障与恢复记录', description: '保留影响、排查假设和每一步恢复结果。', checks: ['回退触发条件清晰', '恢复后核对服务及数据']},
      {title: '复盘与改进方案', description: '从故障暴露的问题提取可执行改进。', checks: ['事实与假设分开', '未演练内容明确标注']}
    ],
    collaboration: [
      {role: '开发', exchange: '确认版本变化、运行依赖和回退兼容性。'},
      {role: '测试与交付', exchange: '核对发布条件、演练范围和验收标准。'},
      {role: '安全与业务', exchange: '沟通权限、风险影响和恢复优先级。'}
    ],
    growth: [
      {stage: '01', title: '读懂运行过程', description: '按指导完成实验环境操作，解释配置与日志。'},
      {stage: '02', title: '完成恢复演练', description: '独立记录告警、回退、备份恢复与核对结果。'},
      {stage: '03', title: '改进服务可靠性', description: '比较运行方案，用自动化与协作降低重复故障。'}
    ],
    practice: {
      title: '编写模拟故障恢复记录',
      brief: '根据给定的模拟发布故障材料设计恢复方案，不执行生产环境操作。',
      steps: ['整理故障现象、影响范围和已有证据。', '列出排查顺序与每一步的预期观察。', '编写恢复步骤、停止条件和回退方案。', '补充服务、数据与备份核对清单，标明未演练项。'],
      deliverable: '故障时间线、恢复步骤、回退条件与复盘',
      checks: ['操作范围限于模拟材料', '恢复后有数据完整性核对', '方案与实际执行结果明确区分']
    },
    pitfalls: ['重启成功不代表故障原因已查明。', '备份存在不代表能够成功恢复。', '是否值班、轮班或驻场须按具体岗位核对。'],
    related: ['security', 'backend'],
    source: onet('15-1244.00', 'Network and Computer Systems Administrators')
  },
  frontend: {
    englishName: 'Frontend Developer',
    lead: '把产品交互变成可使用的界面，让每个状态与操作都有清楚反馈。',
    scenario: '模拟情境：实现职业卡片及详情页面。你需要让卡片、按钮和键盘操作一致，处理返回、加载失败与空内容，并检查手机上的阅读和交互。',
    workflow: [
      {title: '拆解交互', description: '梳理页面层级、操作路径以及加载、空白和错误状态。', output: '界面与状态清单'},
      {title: '实现组件', description: '用 HTML、CSS 和 JavaScript 组织结构、样式与交互。', output: '可操作页面'},
      {title: '连接数据', description: '对齐接口字段，管理状态、校验和失败后的恢复。', output: '接口与状态说明'},
      {title: '验证体验', description: '检查响应布局、键盘操作、浏览器兼容和用户反馈。', output: '验证与修订记录'}
    ],
    skills: [
      {label: '基础', items: ['HTML', 'CSS', 'JavaScript'], application: '建立清楚的页面语义、布局和浏览器交互。'},
      {label: '核心', items: ['组件与状态', '接口协作', '可访问性'], application: '实现完整任务流程，覆盖正常、空白和失败状态。'},
      {label: '进阶', items: ['TypeScript', '性能分析', '自动化检查'], application: '按项目选择框架与工具，改善复杂界面的可靠性。'}
    ],
    deliverables: [
      {title: '页面与交互实现', description: '把设计和规则落实为可操作组件。', checks: ['主要入口明确可达', '加载、空白、错误状态齐备']},
      {title: '接口与状态说明', description: '记录数据契约、页面状态和恢复行为。', checks: ['返回时状态合理保留', '失败不丢失用户输入']},
      {title: '体验验证记录', description: '记录设备、操作方式及实际发现的问题。', checks: ['手机布局可阅读', '键盘能完成主流程']}
    ],
    collaboration: [
      {role: '产品与设计', exchange: '明确用户任务、信息层级和交互细节。'},
      {role: '后端', exchange: '约定字段、权限、错误码与数据更新方式。'},
      {role: '测试', exchange: '提供复现步骤，确认边界状态和回归范围。'}
    ],
    growth: [
      {stage: '01', title: '实现一个组件', description: '按说明还原结构和交互，解释事件与样式。'},
      {stage: '02', title: '交付完整流程', description: '独立连接数据并覆盖异常，提供操作验证记录。'},
      {stage: '03', title: '管理复杂界面', description: '比较状态与组件方案，持续改进性能和可访问性。'}
    ],
    practice: {
      title: '实现可恢复的资料确认界面',
      brief: '用模拟接口制作可编辑、确认与返回的页面，重点验证交互完整性。',
      steps: ['列出编辑、确认、返回和请求失败的状态。', '实现表单与组件，并标明字段校验。', '用模拟请求验证成功、失败与重试。', '在手机布局和键盘操作下走完主流程。'],
      deliverable: '界面原型、状态说明与操作检查记录',
      checks: ['失败后保留输入', '返回后保留合理选择', '主流程可用键盘完成']
    },
    pitfalls: ['视觉还原完成不代表交互状态完整。', '点击可用不代表键盘和触屏也可用。', 'React、Vue 等是可选路径，不是全部必学清单。'],
    related: ['backend', 'testing'],
    source: onet('15-1254.00', 'Web Developers')
  },
  backend: {
    englishName: 'Backend Developer',
    lead: '把业务规则实现为可靠的接口与数据处理，守住校验、权限和一致性。',
    scenario: '模拟情境：实现个人资料导入与检索服务。你需要约定字段、处理重复导入和非法输入，确保不同账户只能读取允许访问的资料，并留下测试依据。',
    workflow: [
      {title: '澄清规则', description: '确认业务动作、角色权限、输入输出与异常条件。', output: '规则与接口契约'},
      {title: '设计数据', description: '组织字段、数据关系、校验和一致性要求。', output: '数据模型与约束'},
      {title: '实现服务', description: '编写接口、数据读写、权限检查和可解释的错误处理。', output: '服务代码与运行说明'},
      {title: '测试维护', description: '检查重复请求、权限与异常，定位问题并记录影响。', output: '测试与变更记录'}
    ],
    skills: [
      {label: '基础', items: ['一门编程语言', 'SQL', 'Git'], application: '完成基本数据处理、版本管理和数据库读写。'},
      {label: '核心', items: ['接口设计', '权限与校验', '单元测试'], application: '让业务规则在正常与异常条件下都能解释和验证。'},
      {label: '进阶', items: ['缓存策略', '分布式系统', '容器部署'], application: '在确有规模与运行需求时选择相应技术方案。'}
    ],
    deliverables: [
      {title: '接口与数据模型', description: '明确输入输出、字段关系和约束。', checks: ['字段和错误含义清楚', '重复请求处理已约定']},
      {title: '服务与运行说明', description: '交付可运行实现及必要的配置方法。', checks: ['权限在服务端检查', '异常不会静默损坏数据']},
      {title: '测试与变更依据', description: '保留测试场景、结果和未覆盖范围。', checks: ['非法输入与越权均有检查', '结果可按说明复现']}
    ],
    collaboration: [
      {role: '产品与业务', exchange: '澄清业务规则、权限角色和异常处理原则。'},
      {role: '前端与测试', exchange: '对齐接口字段、错误反馈和关键测试场景。'},
      {role: '数据与运维', exchange: '确认数据一致性、运行依赖和发布影响。'}
    ],
    growth: [
      {stage: '01', title: '完成一个接口', description: '按约定实现输入输出，解释校验与数据流。'},
      {stage: '02', title: '交付可靠服务', description: '独立处理权限、重复与异常，并提供可复现测试。'},
      {stage: '03', title: '解决复杂约束', description: '比较架构与一致性方案，说明规模、性能和维护取舍。'}
    ],
    practice: {
      title: '设计资料导入与检索接口',
      brief: '用合成资料设计小型服务，可以先交付接口说明再实现验证。',
      steps: ['定义导入、查询和删除的输入输出。', '画出数据关系并说明权限角色。', '设计重复导入、非法字段和无权限的处理。', '记录实际运行的测试与尚未验证的接口。'],
      deliverable: '接口契约、数据模型、权限说明与测试记录',
      checks: ['重复导入保持一致', '无权限者无法读取私有资料', '未运行检查没有标为通过']
    },
    pitfalls: ['客户端校验不能替代服务端校验与鉴权。', '接口能返回结果不代表并发和重复请求处理正确。', 'Java、Python、Node.js 是可选择的技术路径。'],
    related: ['frontend', 'engineering'],
    source: onet('15-1252.00', 'Software Developers')
  },
  engineering: {
    englishName: 'Data Engineer',
    lead: '把分散的数据变成可持续交付、可追溯、出错后能恢复的数据流程。',
    scenario: '模拟情境：将不同格式的活动记录定期导入分析库。你需要约定字段、处理缺失与重复，保证重复运行不叠加数据，并能定位来源和失败环节。',
    workflow: [
      {title: '定义契约', description: '确认数据来源、字段含义、更新方式与使用权限。', output: '字段与交付契约'},
      {title: '构建管线', description: '设计采集、清洗、转换和存储之间的数据流。', output: '处理程序与数据模型'},
      {title: '质量与恢复', description: '建立校验规则，处理重复、失败和重新运行。', output: '质量与失败记录'},
      {title: '交付维护', description: '说明血缘、版本和运行方式，核对下游使用结果。', output: '可追溯数据集'}
    ],
    skills: [
      {label: '基础', items: ['SQL', 'Python', '数据模型'], application: '理解结构、关联与转换，完成可读的数据处理。'},
      {label: '核心', items: ['ETL / ELT', '数据质量', '可重复执行'], application: '让数据按约定持续到达，并在失败后安全重跑。'},
      {label: '进阶', items: ['任务调度', '数据治理', '权限与血缘'], application: '按平台规模组织依赖、追溯关系和数据使用约束。'}
    ],
    deliverables: [
      {title: '字段契约与数据流图', description: '解释数据从哪里来、经过哪些转换。', checks: ['字段含义与来源明确', '转换规则带版本']},
      {title: '管线与质量检查', description: '交付处理逻辑、校验和异常记录。', checks: ['重复执行不新增重复数据', '缺失值不被任意补猜']},
      {title: '运行与恢复说明', description: '记录调度、失败恢复与下游交付方式。', checks: ['失败不损坏旧结果', '权限和数据血缘可查']}
    ],
    collaboration: [
      {role: '业务与源系统开发', exchange: '确认字段变化、采集逻辑和更新周期。'},
      {role: '数据分析与 AI', exchange: '约定口径、可用字段和质量验收。'},
      {role: '平台与运维', exchange: '对齐任务调度、存储资源和故障恢复。'}
    ],
    growth: [
      {stage: '01', title: '处理一份数据', description: '按说明完成转换，解释清洗规则与输出字段。'},
      {stage: '02', title: '交付可重跑管线', description: '独立完成校验、异常隔离与失败恢复。'},
      {stage: '03', title: '组织可靠数据平台', description: '在多来源和复杂依赖下改进治理、调度与协作。'}
    ],
    practice: {
      title: '构建可重复运行的导入流程',
      brief: '用合成数据制作小型导入管线，重点检查质量、重复执行和失败恢复。',
      steps: ['写明字段契约、来源和允许的缺失状态。', '绘制采集、转换、校验与入库流程。', '实现或模拟重复输入、错误记录和中途失败。', '核对输出、记录规则版本并编写重跑说明。'],
      deliverable: '字段契约、数据流图、处理逻辑与质量记录',
      checks: ['重复运行结果一致', '失败记录可定位', '来源与转换规则可追溯']
    },
    pitfalls: ['一次导入成功不代表管线能长期可靠运行。', '清洗不能抹掉原始值与处理依据。', '数据工程侧重稳定交付，分析侧重解释业务问题。'],
    related: ['data', 'backend'],
    source: onet('15-1243.01', 'Data Warehousing Specialists')
  },
  testing: {
    englishName: 'Software QA Analyst / Tester',
    lead: '把质量疑问变成可执行的检查，用可复现证据支持缺陷修复。',
    scenario: '模拟情境：职业规划系统准备发布资料确认流程。你需要检查未知信息、重复提交、取消与私有资料访问，记录缺陷，并在修复后复核原问题及相关流程。',
    workflow: [
      {title: '识别风险', description: '阅读需求，确认关键规则、影响和测试范围。', output: '测试计划与风险清单'},
      {title: '设计场景', description: '从正常、边界、异常和权限角度准备数据与用例。', output: '测试用例与数据'},
      {title: '执行定位', description: '比较实际与预期，记录环境、步骤和可复现证据。', output: '缺陷与执行记录'},
      {title: '回归报告', description: '复核修复，检查受影响流程并说明剩余风险。', output: '回归结论与覆盖范围'}
    ],
    skills: [
      {label: '基础', items: ['需求理解', '测试用例', '技术记录'], application: '把文字规则转成有明确预期的检查步骤。'},
      {label: '核心', items: ['边界与异常', '缺陷复现', '回归验证'], application: '准确定位差异，跟踪修复并说明覆盖和遗漏。'},
      {label: '进阶', items: ['接口检查', '自动化测试', '性能测试'], application: '按产品风险与测试方向选择工具和检查深度。'}
    ],
    deliverables: [
      {title: '风险与测试用例', description: '把需求、场景和预期结果连接起来。', checks: ['覆盖关键规则与边界', '测试数据可重建']},
      {title: '缺陷复现记录', description: '让开发能够观察并定位同一个问题。', checks: ['环境、版本和步骤齐全', '实际与预期明确分开']},
      {title: '回归与质量报告', description: '说明本轮检查结果及剩余风险。', checks: ['修复后重新执行检查', '未测范围没有标成通过']}
    ],
    collaboration: [
      {role: '产品', exchange: '澄清歧义、验收标准和风险优先级。'},
      {role: '前端与后端', exchange: '提供复现证据，核对修复范围及影响。'},
      {role: '运维与交付', exchange: '确认环境差异、发布条件和回归安排。'}
    ],
    growth: [
      {stage: '01', title: '执行并记录', description: '按用例检查，清楚描述实际与预期差异。'},
      {stage: '02', title: '独立设计验证', description: '从风险推导场景，交付可复现的缺陷与回归记录。'},
      {stage: '03', title: '改善质量机制', description: '比较自动化、流程与专项检查的收益及覆盖局限。'}
    ],
    practice: {
      title: '验证资料确认的关键规则',
      brief: '对模拟职业规划流程设计并执行测试，重点观察未知信息与异常操作。',
      steps: ['列出未知信息、私有资料、重复提交和取消的业务规则。', '为每项规则编写正常、边界与异常场景。', '执行可用场景并记录环境、步骤、实际和预期。', '整理缺陷、回归结果和本轮未覆盖内容。'],
      deliverable: '测试用例、缺陷复现记录与回归总结',
      checks: ['未知能力没有被记为零分', '私有资料访问符合角色边界', '报告结论对应实际测试版本']
    },
    pitfalls: ['没有发现缺陷不等于软件没有缺陷。', '只记录“不能用”不足以支持复现。', '自动化数量不能替代风险覆盖与测试设计。'],
    related: ['frontend', 'backend'],
    source: onet('15-1253.00', 'Software Quality Assurance Analysts and Testers')
  },
  software: {
    englishName: 'Software Developer',
    lead: '把具体问题拆成可维护的程序，并用调试与验证说明它如何工作。',
    scenario: '模拟情境：编写一个整理合成活动记录的小工具。你需要明确输入输出、拆分模块，处理格式错误和边界情况，让他人能按说明构建并复现结果。',
    workflow: [
      {title: '建模拆解', description: '明确输入输出、约束、使用平台和模块边界。', output: '需求与模块设计'},
      {title: '编码实现', description: '选择合适的数据结构，组织可读代码与版本。', output: '程序与构建配置'},
      {title: '调试验证', description: '检查正常、异常和边界，用证据定位问题。', output: '测试与修复记录'},
      {title: '维护交接', description: '说明使用方式、依赖、变更影响和已知局限。', output: '运行与维护文档'}
    ],
    skills: [
      {label: '基础', items: ['一门编程语言', '数据结构', 'Git'], application: '表达处理逻辑，选择适合问题的数据组织方式。'},
      {label: '核心', items: ['模块设计', '调试', '单元测试'], application: '隔离复杂度、定位错误并验证程序行为。'},
      {label: '进阶', items: ['系统设计', '平台能力', '性能分析'], application: '围绕选定的应用或系统方向处理更复杂约束。'}
    ],
    deliverables: [
      {title: '需求与模块说明', description: '解释程序解决的问题、约束和职责划分。', checks: ['输入输出与边界明确', '模块职责可以解释']},
      {title: '代码与运行包', description: '交付源代码、构建步骤和使用示例。', checks: ['依赖和环境写明', '异常不会静默损坏输出']},
      {title: '验证与维护记录', description: '记录检查方式、修复和未解决的问题。', checks: ['结果可在说明环境复现', '个人贡献与参考内容分开']}
    ],
    collaboration: [
      {role: '需求方', exchange: '澄清使用方式、约束和可接受的程序行为。'},
      {role: '其他开发', exchange: '约定模块接口、代码变更与评审内容。'},
      {role: '测试与使用者', exchange: '获取复现条件，核对功能与异常处理。'}
    ],
    growth: [
      {stage: '01', title: '完成一项小功能', description: '在指导下实现并解释代码、输入输出和自身贡献。'},
      {stage: '02', title: '交付可复现工具', description: '独立组织模块、错误处理、测试和运行说明。'},
      {stage: '03', title: '处理系统约束', description: '比较设计方案，与团队改进性能、质量和维护成本。'}
    ],
    practice: {
      title: '制作有说明的数据处理工具',
      brief: '选择一门语言处理合成记录，重点展示模块、错误处理和可复现验证。',
      steps: ['定义输入格式、预期输出和处理约束。', '拆分读取、转换、校验与输出模块。', '准备正常、空输入、错误格式与边界案例。', '记录结果和失败修复，补充构建与使用说明。'],
      deliverable: '程序、模块说明、运行方法与验证记录',
      checks: ['错误输入有明确反馈', '不会覆盖或损坏原始输入', '能解释一个失败案例及修复']
    },
    pitfalls: ['通用软件开发不等于必须掌握所有平台或语言。', '能运行一次不能证明所有边界都正确。', '复制代码需要理解，并区分本人贡献与借鉴内容。'],
    related: ['backend', 'ai'],
    source: onet('15-1252.00', 'Software Developers')
  },
  delivery: {
    englishName: 'IT Implementation / Delivery Engineer',
    lead: '把客户需求落实为能配置、能验收、有人接手的信息系统。',
    scenario: '模拟情境：为一个虚构组织上线活动管理系统。你需要梳理业务流程、准备配置和迁移核对，组织联调与使用培训，再以清单完成验收和问题交接。',
    workflow: [
      {title: '确认需求', description: '梳理客户流程、角色、环境和验收口径。', output: '需求与范围清单'},
      {title: '配置集成', description: '完成参数配置、接口联调和数据准备核对。', output: '配置与迁移记录'},
      {title: '培训验收', description: '按真实使用路径演示，核对验收项与遗留问题。', output: '手册与验收记录'},
      {title: '上线交接', description: '明确上线条件、回退方案、责任人与支持方式。', output: '交付包与问题台账'}
    ],
    skills: [
      {label: '基础', items: ['需求记录', 'SQL 基础', '技术文档'], application: '理解客户语言，核对数据并形成清楚的交付说明。'},
      {label: '核心', items: ['系统配置', '接口联调', '验收与培训'], application: '把需求、配置、操作和验收标准逐项对应。'},
      {label: '进阶', items: ['数据迁移', '自动化部署', '复杂系统集成'], application: '按业务软件、网络云或行业系统方向进一步选择。'}
    ],
    deliverables: [
      {title: '需求与配置说明', description: '记录业务流程、环境和参数的对应关系。', checks: ['需求变更有记录', '配置范围与验收口径一致']},
      {title: '迁移与上线方案', description: '说明数据核对、上线步骤和回退条件。', checks: ['数量与关键字段已核对', '停止与回退责任明确']},
      {title: '手册与验收包', description: '让使用者与接手团队能继续操作和处理问题。', checks: ['主要操作可按手册复现', '遗留问题有状态与责任人']}
    ],
    collaboration: [
      {role: '客户与业务负责人', exchange: '确认流程、需求优先级和最终验收口径。'},
      {role: '开发与运维', exchange: '定位集成问题，核对部署、权限与回退。'},
      {role: '用户与支持团队', exchange: '培训操作、接收反馈并完成后续支持交接。'}
    ],
    growth: [
      {stage: '01', title: '完成配置小任务', description: '在指导下按清单操作，记录结果与疑问。'},
      {stage: '02', title: '交付完整模拟项目', description: '独立组织需求、配置、验收和交接材料。'},
      {stage: '03', title: '协调复杂交付', description: '在多方依赖与变更中比较方案，推动问题闭环。'}
    ],
    practice: {
      title: '制作模拟客户系统交付包',
      brief: '为虚构组织编制上线交付材料，选择一个业务流程即可。',
      steps: ['记录客户角色、流程、范围和验收条件。', '整理配置清单、接口依赖与数据迁移核对。', '编写用户操作手册、培训提纲和验收步骤。', '补充上线与回退方案、问题台账和交接责任。'],
      deliverable: '需求说明、配置清单、操作手册与验收交付包',
      checks: ['每个验收项对应需求', '迁移数量与关键字段可核对', '遗留问题与未验证项可追踪']
    },
    pitfalls: ['交付完成需要验收与交接，不能只看安装成功。', '客户口头变更应落实到范围与记录。', '驻场、出差和行业资格要求按具体岗位核对。'],
    related: ['backend', 'data'],
    source: onet('15-1211.00', 'Computer Systems Analysts')
  }
};
