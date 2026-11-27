# 分支学习工作区改版

2026-11-26 在本地 `dev` 实施，基线 `867fff3`。本次处理职业与技能地图中的分支学习与练习页。另有学习与实践中心扩展工作已在工作区进行，本次沿用其现有文件。

## 用户参考与实施前设计

- [用户截图](images/branch-learning-20261126/reference.png)显示「加载与交互体验」的操作章节。目标藏在折叠说明中，分支进度与技能目录分散，操作和示范正文使用同一底色。
- [实施前结构示意](images/branch-learning-20261126/design.svg)用左侧技能路线、深蓝任务简介、浅蓝互动区和白底阅读区重排信息。图中的内容和位置用于说明布局。

## 实施内容

- 40 条分支常驻技能导航、分支用途与真实通过进度。可从同一侧栏切课、续看已保存位置或回到整树。
- 123 个技能首屏各有一条中英学习目标和独立练习产物。产物随课变化，例如 SQL 查询与对账、告警规则与时间线、决策表及边界核对。
- 阅读章节和练习分工使用独立区域。通用课可先为合成案例写判断，再展开方法推演和结果。说明与参考资料仍可查阅，练习材料与作答区域能随可用宽度重排。检验条件在练习末尾就地查看。
- 「加载与交互体验」先对应三类前端体验问题，再让学习者为补货提示条引起的跳动选择指标。选择 CLS 后，对比受控复测数据，判断可以写入结论的证据与需要现场复核的范围。样本为合成教学数据。指标含义及现场分组使用参照 [Web Vitals](https://web.dev/articles/vitals) 与 [CLS](https://web.dev/articles/cls)。
- 随堂判断使用现有学习状态字段保存。练习、最终检验、持久化与成长树继续沿用现有记录和评分链路。专题课 SQL、决策表、交接、告警继续使用各自的操作工作区。

## 本地验证

- 10 职业、40 分支、123 个技能 ID 与双语目标、独立练习产物逐项吻合。42 项学习、检验、成长和讨论相关测试通过。
- 当前工作区全量 595 项，591 通过、3 个既有 `AI_BUDGET_PRICE_EXPIRED` 失败、1 跳过。全量执行后补了侧栏状态和排版调整，最终构建及桌面验证覆盖这些调整。双语检查 10,637 条无缺译，服务器模式构建成功。
- Edge 隔离账户跑中英 1366×900 和 1616×960。最终构建完成 7 组桌面场景，保存 13 张实际截图，页面运行错误及横向溢出均为 0。浏览器检查包括随堂诊断、推演便笺、跨课和刷新恢复、Tutor 开合、SQL 实跑、告警旧章节、检验未通过回看和通过后首次长叶。脚本和日志在 `checks/branch-learning-20261126/`。

### 实际桌面截图

| 场景 | 实际页面 |
| --- | --- |
| 性能课程 | [中文首屏](images/branch-learning-20261126/actual/01-performance-lesson-zh-1616x960.png) · [诊断与复测](images/branch-learning-20261126/actual/02-performance-diagnosis-zh-1616x960.png) · [方法与推演](images/branch-learning-20261126/actual/03-performance-method-zh-1616x960.png) · [英文首屏](images/branch-learning-20261126/actual/11-performance-lesson-en-1366x900.png) |
| Tutor 与练习 | [Tutor 打开](images/branch-learning-20261126/actual/04-performance-tutor-zh-1366x900.png) · [性能练习](images/branch-learning-20261126/actual/05-performance-practice-zh-1366x900.png) · [SQL 追踪](images/branch-learning-20261126/actual/06-sql-trace-zh-1366x900.png) · [SQL 执行](images/branch-learning-20261126/actual/07-sql-practice-zh-1366x900.png) |
| 告警与检验 | [告警复核](images/branch-learning-20261126/actual/08-alert-validation-zh-1366x900.png) · [树旁检验](images/branch-learning-20261126/actual/09-alert-check-zh-1366x900.png) · [通过后长叶](images/branch-learning-20261126/actual/10-alert-check-passed-zh-1366x900.png) |

本轮交付为本地源码和隔离验收。真人试学与线上验收待后续安排。
