# 实践项目内容缺口与来源映射

2026-11-26，本地实施记录。实施前只有四个正式综合项目，其他方向缺少可开始的独立材料、工程入口、实际参考、错误反例及连续路线；本轮保留旧四项，补齐其余32项。任务包的来源候选始终保留为研究线索，没有直接改成授权或已下载记录。

## 材料与方法的区别

新32项输入、代码、界面和交接件为本站原创合成教学材料，AI辅助编写；没有复制第三方课程、生产数据或公司文件。公开方法链接只支持相应方法解释，不支持官方背书、完整职业覆盖、真实企业经历或独立能力认证。实际材料文件、字节数、SHA256和允许使用范围逐项记录在 sources.json。公开再分发政策等待所有者决定。

本轮实际打开阅读的方法资料：MDN Curriculum Core modules、OpenAPI 3.1.1的Data Types及Security Requirement Object、OWASP API1:2023的风险与防护部分、Prometheus规则测试文档与示例。未复制正文、代码或数据；未据此宣称获得再分发许可。其他候选资料未采用，不包装为已读。

旧数据质量项目保留英国交通部数据摘录及GDS案例参考的原出处与许可记录。本轮对本地16行摘录复算并核对摘要，没有重新下载或核实整个上游大文件。对不可访问的OGL许可页和未全文读取的候选，不新增清权声明。

| 项目 | 实际材料 | 方法链接（仅方法） | 参考 / 产物 |
|---|---|---|---|
| quality · 数据质量与口径复核 | 保留原v1/v2及其来源范围 | 沿用旧来源记录；本轮不重新授予 | 旧参考独立复算、原页面提交归档回归 |
| multi-source-analysis · 多来源业务分析 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、query.sql；独立进程复现及反例 |
| analysis-change-handoff · 数据变化下的分析交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、query.sql；独立进程复现及反例 |
| ai-eval · 客服助手评测 | 保留原v1/v2及其来源范围 | 沿用旧来源记录；本轮不重新授予 | 旧参考独立复算、原页面提交归档回归 |
| baseline-evaluation · 基线与独立评估 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| grounded-assistant-delivery · 受限知识助手交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| log · 离线日志初筛 | 保留原v1/v2及其来源范围 | 沿用旧来源记录；本轮不重新授予 | 旧参考独立复算、原页面提交归档回归 |
| app-authorization-retest · 应用权限整改复验 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [API1:2023 Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| detection-response-handoff · 检测与响应交接 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [API1:2023 Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| restore · 故障恢复与回退 | 保留原v1/v2及其来源范围 | 沿用旧来源记录；本轮不重新授予 | 旧参考独立复算、原页面提交归档回归 |
| alert-rule-regression · 告警规则与反例 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) | result.json、notes.md、rules.json；独立进程复现及反例 |
| reliability-release-drill · 服务上线与可靠性演练 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) | result.json、notes.md、rules.json；独立进程复现及反例 |
| accessible-form · 可访问表单与状态恢复 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/) | result.json、notes.md、index.html；独立进程复现及反例 |
| data-workbench · 数据工作台与接口异常 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/) | result.json、notes.md、index.html；独立进程复现及反例 |
| frontend-release-delivery · 业务界面完整交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/) | result.json、notes.md、index.html；独立进程复现及反例 |
| contract-api · 校验与权限明确的API | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| retry-concurrency · 重复请求与并发一致性 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| service-evolution-delivery · 可演进服务与迁移交接 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| relational-model · 原始表到可复算数据模型 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、query.sql；独立进程复现及反例 |
| partition-replay · 固定分区重跑与发布 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、query.sql；独立进程复现及反例 |
| data-contract-evolution · 数据契约演进与下游交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、query.sql；独立进程复现及反例 |
| defect-evidence · 需求到可复现缺陷 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| api-ui-regression · 接口与界面回归 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| release-risk-review · 发布风险与验证交接 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| rule-tool · 规则或转换工具 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| legacy-change · 遗留代码变更与重构 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| versioned-toolkit · 可发布与可维护工具包 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/) | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| config-acceptance · 需求到配置与验收 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、solution.mjs、config.json；独立进程复现及反例 |
| migration-reconciliation · 数据迁移与系统集成 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| rollout-support-handoff · 上线培训与支持交接 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | 原创任务契约；外部候选未采用 | result.json、notes.md、solution.mjs；独立进程复现及反例 |
| cross-registration-service · 活动报名服务联合交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/)、[OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、index.html、handoff.json、stage-1.json、stage-2.json、stage-3.json、stage-4.json；独立进程复现及反例 |
| cross-metric-service · 指标与数据服务交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | result.json、notes.md、query.sql、handoff.json、stage-1.json、stage-2.json、stage-3.json；独立进程复现及反例 |
| cross-knowledge-assistant · 受限知识助手联合交付 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)、[API1:2023 Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | result.json、notes.md、handoff.json、solution.mjs、stage-1.json、stage-2.json、stage-3.json；独立进程复现及反例 |
| cross-service-incident · 服务发布与故障联合演练 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/)、[OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)、[Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) | result.json、notes.md、rules.json、handoff.json、stage-1.json、stage-2.json、stage-3.json；独立进程复现及反例 |
| cross-security-remediation · 应用安全整改闭环 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [MDN Curriculum — Core modules](https://developer.mozilla.org/en-US/curriculum/core/)、[OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)、[API1:2023 Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) | result.json、notes.md、handoff.json、solution.mjs、stage-1.json、stage-2.json、stage-3.json；独立进程复现及反例 |
| cross-migration-launch · 业务系统迁移上线交接 | 原创合成；input/fixture.json、dictionary.md及适用交接/变式 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)、[Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) | result.json、notes.md、handoff.json、solution.mjs、stage-1.json、stage-2.json、stage-3.json；独立进程复现及反例 |

## 未完成的人类工作

所有新项目的独立领域审阅、真人试学、学习耗时校准、指定维护人和正式发布仍待安排；本轮技术验收不能替代这些工作。两个相关职业映射保留unknown，未按名称相似强行匹配。
