# 学习实践项目改进

以本地 `dev` 的学习资源中心为入口，把四个项目的阅读、角色、证据和交付放进各自的独立页面。使用现有工作区的导航、预算检查、账户记录和成果确认链路。

| 项目 | 原始案例 | 学习者交付 |
| --- | --- | --- |
| 数据质量 | [英国 Government Digital Service 的数据管道改进](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-case-studies#government-digital-service-improving-pipeline-data-quality) | 质量问题清单、可复算的样本统计与发布判断 |
| AI 评测 | [Sierra 等作者的 τ-bench](https://arxiv.org/abs/2406.12045) | 客服助手对照评测、严重错误与上线建议 |
| 安全日志 | [多国网络安全机构联合通报 AA24-038A](https://www.cyber.gov.au/advisory/prc-state-sponsored-actors-compromise-and-maintain-persistent-access-to-us-critical-infrastructure) | 按 UTC 对齐的事件链、备选解释与升级建议 |
| 故障恢复 | [Cloudflare 的 2019-07-02 故障复盘](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) | 暂停或回退决策、恢复验收与交接记录 |

四步依次是明确任务、复核证据、作出决定和交付。成员主要负责取证与向负责人建议。主理人还需明确责任、复核与交付条件。两种角色使用同一事实和数据。项目资料包含原文链接、机构、用途、访问日期及素材边界。真实公开数据只用于数据质量样本，其余案例采用明确标注的教学记录。

数据质量的官方摘录来自英国交通部 2024 年交通碰撞数据。原始摘录、采集地址、筛选规则和文件摘要可在项目中下载。练习表在该摘录基础上加入缺值、非法值、格式异常和重复记录。其余三个项目用自编工单、日志或发布指标演练原案例中的决策过程。[公开数据](https://www.gov.uk/government/statistical-data-sets/road-safety-open-data) · [课程来源表](../../course-packs/practice-20261113/sources.csv)

版本 2 通过现有课程导入机制发布。版本 1 和已创建任务的资料引用继续可访问。完成实践仍需本人提交、自查和确认。助手优先提供当前步骤的站内提示。启用模型且用户明确授权时，只向模型发送主动问题及该步骤的公开资料，实践草稿和历史进度留在账户内。

## 设计与验收截图

用户参考图存放在工作区 `设计参考与同步/用户例图/实践项目_20261113`。图 2 是原资源中心，图 3 是原阅读弹窗，图 4 是原实践范围。图 1 提供服务器连接背景。[实施前线框](practice-projects-layout-20261113.html)

合成测试账户实拍。[角色与预算](images/practice-projects-20261113/03-overview.png) · [独立阅读](images/practice-projects-20261113/02-reading.png) · [证据与助手](images/practice-projects-20261113/05-assistant.png) · [手机阅读](images/practice-projects-20261113/07-mobile-reading.png)

## 2026-11-13 上线

服务器当前版本为 `practice-projects-20261113-02`。首轮发布同步 79 个文件并导入四套课程，导入前后账户业务记录摘要一致。第二轮修正旧任务工作页对版本书签的读取。正式登录、会话、现有账户和旧课件继续使用原服务。发布前创建 SQLite 备份，保留上一版静态目录和源文件备份。[学习与实践中心](https://47.250.133.180/learning)

- 本地与服务器预发布环境的 81 项相关自动检查通过。资料包 4 个项目、16 个章节、21 个出处与 47 个文件的校验通过。
- 线上使用临时账户核对错误密码拒绝、正确登录、四个阅读入口和素材下载、旧课书签、角色与预算、保存和续做，以及数据质量项目的自查和归档下载。AI 评测、安全日志、故障恢复三项另在生产接口验证了草稿校验、提交、自查和完成回执。临时账户均已删除。
- 浏览器直连曾有间歇性等待超时。完整线上流程使用经摘要核对的同版本静态资源，页面、登录和业务请求使用线上服务。另通过服务器 HTTPS 检查页面与静态入口文件一致。
- 项目助手在线上提供按步骤的提示与资料检索。外部模型继续关闭，模型请求的授权和上下文边界通过模拟供应商验收。本次没有调用付费模型。

验收日志在 `checks/practice-projects-20261113`，源代码保存于本地 `dev`，GitHub 分支仍指向 `e0a645f`。服务器备份为 `/var/backups/career-growth/before-practice-projects-20261113-01-auth.sqlite`。
