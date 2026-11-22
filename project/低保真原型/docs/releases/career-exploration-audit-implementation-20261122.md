# 职业探索语义一致性与实例完善（2026-11-22，本地）

> 发布状态更新：已于2026-11-22 23:18随[当前完整源码](full-snapshot-20261122.md)上线。下文未部署及验收数字为此前实施记录；本轮依用户要求未重跑检查。


依据audit-plan及improvement-prompt，在现有共享工程继续实施；保留此前未提交工作、十方向/22份产物、真实登录、原计划/技能检验/报告四页签。报告V2仍撤回。未部署、Git提交或推送，未启用模型/邮件，未操作生产账户、累计费用或价格保护。

## 当前结果

1. **本人材料跨页面一致。** 讨论资料复用materialCareerLinks和服务端技能归属校验。仅选中材料中、与讨论职业相关的显式关联进入核对/请求投影；保留材料版本和内容指纹。显式空数组压过旧SQL前缀映射。关联改变/解除及材料撤回使旧依据、授权和依赖草稿失效，历史消息原文保留。关联仍是本人自述，不是检验通过。资料预览的列表渲染错误也已修复，关联可打开原技能节点。
2. **比较理由绑定组合。** 2–3职业无序组合各自保存理由、问题与判断。公共set参数只含职业ID，支持重排、历史返回、刷新、2→3→2及恢复已有组合；旧比较篮入口会以replace补齐当前组合，避免无参数历史页跟随之后的选择。旧无归属笔记可查并手动采用，不自动带入；资料版本变化时理由在目标预览前需本人复核。目标确认沿用原流程，不自动增任务。旧decision继续承载既有目标理由与旧记录，未删除。
3. **入口和草稿语义清楚。** 删除与全部相同的兴趣筛选选项；旧interest链接按自由浏览兼容并明确说明，无兴趣评分。未保存体验稿按账户/职业/案例版本在本机恢复；显式保存区分队列、服务器失败和持久化。暂存不可用时离开有保护。清空需确认、可撤销；旧案例原文/来源版本归档且可复制或真实导出，不重标为新答案。清除账户记录同步清除其本机恢复副本。
4. **实例可核对。** 前端展示必填/格式、等待、重复阻止、输入变化取消、模拟成功/失败；数据工程固定b17/分区及四ID/channel对照，给同数量异内容反例；运维分别用每个请求分母，补技术回落但业务失败分支；测试保留100元示范，增加80元新边界，先尝试再看教学对照。其余方向各增一条短判断分岔；安全补日期时区、E2包含E1及定向补证据。交付提供实际600行原创CSV和稳定字段SHA256清单。
5. **局部阅读和操作。** 比较表头常显代表任务；已加入比较使用勾选次按钮；滚动高亮当前章节且不新增历史。短定义表与验收区按容器并排；AI/安全材料与作答并列、编号定位、空白结构、尝试后教学对照。关联改现有宽详情层，保留未保存/失败选择。修正全站字体覆盖后，实测正文/原文/来源说明为17px；不只依据CSS声明。

## 结构、版本与来源

- 先行结构：[plan.md](images/career-exploration-audit-implementation-20261122/plan.md)、[structure.svg](images/career-exploration-audit-implementation-20261122/structure.svg)，均是结构设计，不是实拍。
- 当前公开职业版本career-exploration-20261122-audit，当前小体验career-trial-20261122-audit；详情、普通比较和AI共用投影。
- 新增career-profiles-20261122-followup.json保存实施前投影；原20261024/20261122快照保留。未知版本仍拒绝，不把旧讨论引用静默改成新内容。
- [本轮来源映射与核对范围](images/career-exploration-audit-implementation-20261122/source-research.md)。原15条来源元数据保留，新增具体章节记录；合成案例与职业事实/方法参考分开。

## 本轮实际验证

| 检查 | 结果 |
| --- | --- |
| Node | v24.22.1 |
| 针对性测试 | 51/51，通过材料精确关联/解除/撤回、指纹与依赖草稿、未选及跨账户隔离、粗SQL不推断、组合笔记与版本、草稿历史、十方向双语、工程/运维/测试计算、600行交付摘要等。 |
| 全量 | 569项：565通过、3失败、1原有跳过。3失败均在agent-budget-integration.test.mjs，实际AI_BUDGET_PRICE_EXPIRED先于测试预期的成功/预算超限/超时；与既有过期价格快照一致。本轮未放松保护或删除测试。 |
| 双语及服务构建 | npm run build:server通过，10121条exactMissing=0。原动态/静态引用和大包警告仍存在，无新依赖。 |
| 正常UI主链 | 普通录入/确认→三职业精确关联→详情/比较/AI选中资料→解除；无真实模型。比较AB/CD独立、2→3→2、重排、刷新、历史与目标理由；草稿离开恢复、失败重试、清空/撤销和旧版本保留通过。 |
| 附加9场景 | 材料命令失败保持选择与全局重试；版本冲突不覆盖；原目标确认且预算/任务不变；自然滚动不加历史；队列与真实导出；暂存被禁用时离开保护；报告四页签与键盘；原SQL运行/按需Tutor且不判通过；旧依据笔记复核后才带入目标理由。 |
| 桌面与语言 | 1366/1616×900/960/1100×中英文关键矩阵；2/3职业、十方向分岔、AI/安全长稿和教学对照、来源展开、材料加载/失败/冲突。62张主流程及3张边界实拍，共65张，无主内容横向溢出或页面运行错误。 |
| 实际可读性 | 184处正文、原文、限制/来源说明抽样，17px；前景与最近不透明背景按WCAG sRGB计算最低5.24:1。记录实际行宽/max-width/行高，表图使用宽区；这不是全站可访问性认证。 |
| 设计检测 | 单次125条均为既有品牌色值/字号/圆角文档建议，0主问题；未换品牌。视觉一次批量检查、一次确认。 |

证据位于checks/career-exploration-audit-implementation-20261122/，含三个可复跑浏览器脚本、desktop-results.json、edge-results.json、typography-results.json、各测试/构建日志及一次检测。验证账户与临时数据库已清除。截图：[实际网页索引](images/career-exploration-audit-implementation-20261122/actual/README.md)与SHA256清单，概念设计另存。

## 关键实现位置

- AI材料：server/agent/discussion-context.mjs、discussion-workflow.mjs、src/DiscussionWorkbench.jsx；未改付费供应商、12条引用/6近期消息或AI任务页布局。
- 比较/入口：src/career-comparison-notes.js、CareerComparisonPage.jsx、CareerBrowser.jsx、storage-recovery-model.js、main.jsx。
- 草稿/清理：src/career-trial-model.js、CareerTrial.jsx、AccountSecurityPanel.jsx、main.jsx。
- 页面/实例：src/CareerReadingPage.jsx、CareerMaterialLinks.jsx、CareerArtifactExamples.jsx、career-exploration-reading.css。
- 内容/投影/英文：src/content/career-exploration.json、career-profiles-20261122-followup.json、career-exploration-model.js、career-comparison.js、src/i18n/career-exploration-en.json。
- 回归：tests/career-exploration-audit.test.mjs；原followup测试只同步新增A4教学说明的项数与含义，未删除测试。

## 尚未声明完成的范围

没有移动端验收、真人学习效果或职业专家/法律审稿，也未验收真实模型效果。本地草稿恢复依赖当前浏览器；被禁用时提供阻止离开及显式保存，不宣称跨设备未保存同步。旧案例快照上限10份，满额不覆盖，用户可导出。前端、Airflow、迁移与优惠都是明确合成演练，未接真实外部执行器或生产系统。生产状态仅沿用交接所载2026-11-21 17:44历史基线，本轮未连接生产重验。
