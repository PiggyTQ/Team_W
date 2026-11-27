# Security / Ops 教学正文与一手来源核对

核对日期：2026-11-26 至 2026-11-27。内容文件：`src/skill-teaching/security-ops.json`。本文件只说明这一批教学内容的来源和校核，不代表全站、线上系统或既有检验规则已通过验收。

## 本批覆盖与设计

- 按真实技能树核对 security 12 课与 ops 12 课，共 24 课，缺失和多余键均为 0。
- 每课包含两个带因果解释的概念、给定条件完整的案例、至少三步中间推理与结果、错误修正、三个逐项解释的微练习选项，以及开放迁移练习的参考思路和评价条件。
- 微练习用于即时教学反馈；开放迁移不能仅因填写文字就宣称答对或掌握。它们不替代既有成果检验。
- 特别重写 threat-model：以合成上传服务为贯穿案例，列资产、数据流、身份/元数据/存储边界，解释上传限制与下载授权分别解决什么风险，将控制映射到允许/拒绝及无泄漏证据。
- 案例、数字、角色、资源名、问题和解释为本次原创教学材料。来源用于核对原则，不表示来源机构采用或认可这些案例。
- 安全内容使用合成、离线或自有受控环境；文中的计划、期望结果与实际执行明确区分，没有执行真实探测或攻击。

## 核对的一手资料及用途

| 资料 | 核对的原则 / 对应课程 |
| --- | --- |
| [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html)、[RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html)、[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) | 名称解析、TLS 与 HTTP 职责分层；连接、加密身份验证及应用响应不能互相代替。network-path、transport-trust、http-diagnosis。 |
| [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | 默认拒绝、每次请求及具体对象/动作的授权，正反对照与回归。authorized-scope、authorization、threat-model、verify-control。 |
| [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | 会话生命周期、服务端失效与退出；浏览器窗口关闭不是撤销证据。authentication。 |
| [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) | 撤销、轮换、消费者迁移与泄漏副本；轮换顺序取决于事件策略与系统能力。secrets。 |
| [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | 事件时间与采集时间、交互标识、日志上下文与敏感信息最小化。event-logs、triage、incident-handoff。 |
| [OWASP Threat Modeling](https://community.owasp.org/Threat_Modeling)、[File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | 资产/流/边界/威胁/控制及验证；上传格式限制不能代替下载对象授权。threat-model。 |
| [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) | 值使用参数绑定，结构性选择使用开发者固定映射；具体驱动占位符需另核。safe-input。 |
| [Linux path_resolution(7)](https://man7.org/linux/man-pages/man7/path_resolution.7.html) | 路径遍历与文件访问检查；目录读取和查找已知项不同。service-account。这里只讲基本模式位推理，实际仍需考虑 ACL、身份映射等。 |
| [Docker Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)、[Build secrets](https://docs.docker.com/build/building/secrets/) | 分开构建材料与运行产物；构建秘密不应写入 ARG/ENV 或普通复制层。container-build。 |
| [Kubernetes Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/) | 启动探针成功前不执行存活和就绪探针；就绪摘流量与存活重启的职责不同。deployment-health。使用当前规范页面，不固定声称某产品版本。 |
| [Terraform State](https://developer.hashicorp.com/terraform/language/state)、[Plan](https://developer.hashicorp.com/terraform/cli/commands/plan) | 配置地址与真实资源绑定、计划不等于执行、原地变更与替换区别。infra-state。 |
| [Google SRE Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/) | 四类信号、用户影响、告警可操作性、均值与尾部。signal-triage、four-signals。 |
| [Google SRE Implementing SLOs](https://sre.google/workbook/implementing-slos/) | 好事件/有效事件、目标与窗口、请求型预算及测量盲区。slo-budget。 |
| [OpenTelemetry Signals](https://opentelemetry.io/docs/concepts/signals/)、[Traces](https://opentelemetry.io/docs/concepts/signals/traces/) | 指标/日志/追踪的互补、span 父子关系与时长、关联与观测覆盖。telemetry。案例区间为原创。 |
| [Google SRE Canarying](https://sre.google/workbook/canarying-releases/) | 限制变更范围、候选与对照评估、发布与回退证据。canary-gate、rollback-verify。 |
| [Google SRE Incident Response](https://sre.google/workbook/incident-response/)、[Postmortem Culture](https://sre.google/workbook/postmortem-culture/) | 处置与沟通分工、持续记录、可接手状态、无责复盘与可执行行动项。incident-handoff、rollback-verify、incident-review。 |

以上链接已读取相关正文或原则段落；没有将仅可打开的跳转页当成已读规范。未复制长段原文，中文与英文均为本次释义及原创案例。

## 具体数值与结论校核

- SLO 例题为**已结束且分母固定的请求窗口**：100000 次、99.9% 目标允许 100 次坏事件，80 次已耗、20 次剩余；独立微练习为 20000 次、99.5%、75 次坏事件，剩余 25 次。不把请求比例直接换算停机分钟。
- 灰度候选 10/100=10%，对照 9/900=1%，合并 19/1000=1.9%；9 为**百分点**差。题内 2% 门槛和 100 次样本仅用于演示，并非生产建议。
- 串行追踪：0–40ms 与 40–460ms 覆盖 460ms，500ms 父请求留 40ms 未解释；不再重复相加父 span。
- 并行微练习：0–180ms 与 20–190ms 联合覆盖 190ms，300ms 请求尾部 110ms；不能将子跨度总和当墙钟时长。
- 09:00→09:08 为 8 分钟，09:08→09:20 为 12 分钟，影响区间共 20 分钟；不冒称长期平均值。
- 探针周期乘阈值仅用于配置预算估计，不承诺精确重启时刻。健康成功不能替代业务与副作用验收。

## 本轮验证记录

使用临时只读检查脚本校验双语字段、步骤数、三个不同选项 ID、正确答案引用、迁移评价条件、HTTPS 来源及来源去重，全部通过。直接导入两份真实技能树，比对预期 24 个键，结果 `missing=[]`、`extra=[]`。

这批数据的 UI 呈现、键盘体验、状态持久化与整站回归由根任务统一验证；本文件不将上述检查冒称为浏览器实测。

