# 36项本地实施验收矩阵

2026-11-26。本表是实际本地实现与技术验收；不是正式发布、真人审稿或试学。旧4项保留原发布身份与v1/v2，新32项仅本地试用。完整材料摘要、输入/产物、来源和交付包执行记录见[详细JSON](practice-growth-acceptance-20261126.json)。

| ID / 项目 | 方向 / 层次 | 版本 / 材料摘要 | 产物与实际检查 | 页面与历史 | 来源 / 权利 | 后续 | 人审 / 试学 / 发布 |
|---|---|---|---|---|---|---|---|
| quality<br>数据质量与口径复核 | data / 1 | 2 / ed1dbc652b2e | 质量问题清单、处理口径、分组统计和发布建议<br>旧参考独立复算；原流程回归 | 入口已查看；旧流程与v1/v2回归 | 沿用旧来源/许可记录，未重新授予 | multi-source-analysis | 本轮人审未做 / 试学未做 / published |
| multi-source-analysis<br>多来源业务分析 | data / 2 | 1 / 0fb701a8f31c | result.json, notes.md, query.sql<br>独立Node参考、真实错误实现与反例、缺项、修订重评；SQLite执行 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | analysis-change-handoff | 本轮人审未做 / 试学未做 / local_trial |
| analysis-change-handoff<br>数据变化下的分析交付 | data / 3 | 1 / a13b2af50982 | result.json, notes.md, query.sql<br>独立Node参考、真实错误实现与反例、缺项、修订重评；SQLite执行 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-metric-service, cross-migration-launch | 本轮人审未做 / 试学未做 / local_trial |
| ai-eval<br>客服助手评测 | ai / 1 | 2 / ed1dbc652b2e | 评测记录、严重错误清单和上线建议<br>旧参考独立复算；原流程回归 | 入口已查看；旧流程与v1/v2回归 | 沿用旧来源/许可记录，未重新授予 | baseline-evaluation | 本轮人审未做 / 试学未做 / published |
| baseline-evaluation<br>基线与独立评估 | ai / 2 | 1 / ddf8b3c4260c | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | grounded-assistant-delivery | 本轮人审未做 / 试学未做 / local_trial |
| grounded-assistant-delivery<br>受限知识助手交付 | ai / 3 | 1 / df250603eeba | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-knowledge-assistant | 本轮人审未做 / 试学未做 / local_trial |
| log<br>离线日志初筛 | security / 1 | 2 / ed1dbc652b2e | 事件时间线、备选解释与升级交接<br>旧参考独立复算；原流程回归 | 入口已查看；旧流程与v1/v2回归 | 沿用旧来源/许可记录，未重新授予 | app-authorization-retest | 本轮人审未做 / 试学未做 / published |
| app-authorization-retest<br>应用权限整改复验 | security / 2 | 1 / 614435e80037 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | detection-response-handoff | 本轮人审未做 / 试学未做 / local_trial |
| detection-response-handoff<br>检测与响应交接 | security / 3 | 1 / f99c31c4343e | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-knowledge-assistant, cross-security-remediation | 本轮人审未做 / 试学未做 / local_trial |
| restore<br>故障恢复与回退 | ops / 1 | 2 / ed1dbc652b2e | 回退决策、恢复验收记录和复盘行动<br>旧参考独立复算；原流程回归 | 入口已查看；旧流程与v1/v2回归 | 沿用旧来源/许可记录，未重新授予 | alert-rule-regression | 本轮人审未做 / 试学未做 / published |
| alert-rule-regression<br>告警规则与反例 | ops / 2 | 1 / 3d3b3d2f7e16 | result.json, notes.md, rules.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | reliability-release-drill | 本轮人审未做 / 试学未做 / local_trial |
| reliability-release-drill<br>服务上线与可靠性演练 | ops / 3 | 1 / 138e74874774 | result.json, notes.md, rules.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-service-incident, cross-migration-launch | 本轮人审未做 / 试学未做 / local_trial |
| accessible-form<br>可访问表单与状态恢复 | frontend / 1 | 1 / 2a6b1795545f | result.json, notes.md, index.html<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | data-workbench | 本轮人审未做 / 试学未做 / local_trial |
| data-workbench<br>数据工作台与接口异常 | frontend / 2 | 1 / 8514db311a9b | result.json, notes.md, index.html<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | frontend-release-delivery | 本轮人审未做 / 试学未做 / local_trial |
| frontend-release-delivery<br>业务界面完整交付 | frontend / 3 | 1 / a6767bffe825 | result.json, notes.md, index.html<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-registration-service, cross-service-incident, cross-security-remediation | 本轮人审未做 / 试学未做 / local_trial |
| contract-api<br>校验与权限明确的API | backend / 1 | 1 / df0baa22b428 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | retry-concurrency | 本轮人审未做 / 试学未做 / local_trial |
| retry-concurrency<br>重复请求与并发一致性 | backend / 2 | 1 / 871f813c53e4 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | service-evolution-delivery | 本轮人审未做 / 试学未做 / local_trial |
| service-evolution-delivery<br>可演进服务与迁移交接 | backend / 3 | 1 / 0604841289e5 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-registration-service, cross-metric-service, cross-knowledge-assistant, cross-service-incident, cross-security-remediation | 本轮人审未做 / 试学未做 / local_trial |
| relational-model<br>原始表到可复算数据模型 | engineering / 1 | 1 / 64eb0da93de7 | result.json, notes.md, query.sql<br>独立Node参考、真实错误实现与反例、缺项、修订重评；SQLite执行 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | partition-replay | 本轮人审未做 / 试学未做 / local_trial |
| partition-replay<br>固定分区重跑与发布 | engineering / 2 | 1 / bf152c1f76c4 | result.json, notes.md, query.sql<br>独立Node参考、真实错误实现与反例、缺项、修订重评；SQLite执行 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | data-contract-evolution | 本轮人审未做 / 试学未做 / local_trial |
| data-contract-evolution<br>数据契约演进与下游交付 | engineering / 3 | 1 / 3e493d4938d5 | result.json, notes.md, query.sql<br>独立Node参考、真实错误实现与反例、缺项、修订重评；SQLite执行 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-metric-service, cross-knowledge-assistant, cross-migration-launch | 本轮人审未做 / 试学未做 / local_trial |
| defect-evidence<br>需求到可复现缺陷 | testing / 1 | 1 / bab7d4813e46 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | api-ui-regression | 本轮人审未做 / 试学未做 / local_trial |
| api-ui-regression<br>接口与界面回归 | testing / 2 | 1 / dba2befb4a04 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | release-risk-review | 本轮人审未做 / 试学未做 / local_trial |
| release-risk-review<br>发布风险与验证交接 | testing / 3 | 1 / 61ba7ca670b3 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-registration-service, cross-metric-service, cross-knowledge-assistant, cross-service-incident, cross-security-remediation, cross-migration-launch | 本轮人审未做 / 试学未做 / local_trial |
| rule-tool<br>规则或转换工具 | software / 1 | 1 / a7c7cb01d7c3 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | legacy-change | 本轮人审未做 / 试学未做 / local_trial |
| legacy-change<br>遗留代码变更与重构 | software / 2 | 1 / 1f491a113c72 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | versioned-toolkit | 本轮人审未做 / 试学未做 / local_trial |
| versioned-toolkit<br>可发布与可维护工具包 | software / 3 | 1 / 315bb5648ab9 | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-registration-service | 本轮人审未做 / 试学未做 / local_trial |
| config-acceptance<br>需求到配置与验收 | delivery / 1 | 1 / abff579f5129 | result.json, notes.md, solution.mjs, config.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | migration-reconciliation | 本轮人审未做 / 试学未做 / local_trial |
| migration-reconciliation<br>数据迁移与系统集成 | delivery / 2 | 1 / eb0cdd1f553a | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | rollout-support-handoff | 本轮人审未做 / 试学未做 / local_trial |
| rollout-support-handoff<br>上线培训与支持交接 | delivery / 3 | 1 / 5ca62cf1a38f | result.json, notes.md, solution.mjs<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | cross-registration-service, cross-migration-launch | 本轮人审未做 / 试学未做 / local_trial |
| cross-registration-service<br>活动报名服务联合交付 | frontend / integrated | 1 / ad981c12d6d7 | result.json, notes.md, index.html, handoff.json, stage-1.json, stage-2.json, stage-3.json, stage-4.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | 具体技能补强与自主改选 | 本轮人审未做 / 试学未做 / local_trial |
| cross-metric-service<br>指标与数据服务交付 | engineering / integrated | 1 / 677ececffc9b | result.json, notes.md, query.sql, handoff.json, stage-1.json, stage-2.json, stage-3.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评；SQLite执行 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | 具体技能补强与自主改选 | 本轮人审未做 / 试学未做 / local_trial |
| cross-knowledge-assistant<br>受限知识助手联合交付 | ai / integrated | 1 / e36840786abf | result.json, notes.md, handoff.json, solution.mjs, stage-1.json, stage-2.json, stage-3.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | 具体技能补强与自主改选 | 本轮人审未做 / 试学未做 / local_trial |
| cross-service-incident<br>服务发布与故障联合演练 | ops / integrated | 1 / db8acdcae893 | result.json, notes.md, rules.json, handoff.json, stage-1.json, stage-2.json, stage-3.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | 具体技能补强与自主改选 | 本轮人审未做 / 试学未做 / local_trial |
| cross-security-remediation<br>应用安全整改闭环 | security / integrated | 1 / 1ed2de4c91d8 | result.json, notes.md, handoff.json, solution.mjs, stage-1.json, stage-2.json, stage-3.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | 具体技能补强与自主改选 | 本轮人审未做 / 试学未做 / local_trial |
| cross-migration-launch<br>业务系统迁移上线交接 | delivery / integrated | 1 / 3ce028762467 | result.json, notes.md, handoff.json, solution.mjs, stage-1.json, stage-2.json, stage-3.json<br>独立Node参考、真实错误实现与反例、缺项、修订重评 | 入口已查看；实际UI开始至归档；下载SHA核对 | 原创合成；外部候选未采用；公开再分发待定 | 具体技能补强与自主改选 | 本轮人审未做 / 试学未做 / local_trial |

## 交付包与边界

- 新32项主下载位于 public/practice-bundles/{id}/1/practice.zip。全部实际解压、逐文件核对冻结摘要并从解压目录执行公开参考成功；页面下载的SHA也已逐项核对。
- 原材料内的 project.zip 保留原字节作为归档，存在缺少嵌套参考结果的旧打包问题；主入口已改为完整交付包，不能把原归档当作当前可运行包。材料版本未被静默重写。
- 参考执行与用户上传的文件/结果核对不同。平台不在业务进程执行用户代码；本机运行结果由本人提交。
- 配置规则使用原创Node窗口/计数器评价器，实际测了重置、低流量、缺失和恢复，不宣称PromQL兼容或promtool运行。
- 六个跨职业项目含19份接手产物及其内容检查，均是单人教学模拟。
- 两个相关职业的精确技能映射缺乏充分依据，保留unknown，不强行对应。
- 不创建能力评分、职业胜任率或技能长叶；材料候选继续需本人确认。
