# 职业与技能地图改版

## 参考和结构

用户图 1 提供从职业根节点向分支与叶节点展开的组织方式。图 2 对照原数据分析页面的取数和质量示例，图 3 对照原网络安全页面的先修和日志路线。三张原图保存在设计同步目录。

四条分支从一个职业根节点展开。选择分支或叶节点后，下面显示该分支的建议学习顺序。叶节点可直接进入，适合已有经验的学习者。桌面显示全树，窄屏展开当前分支。技术资料从框架进入具体官方文档。站内情境检验通过后，按通过的叶节点数显示分支进度，树与下方路径使用同一账户记录。

[实施前线框](skill-tree-layout-20261113.html)展示结构和一个示例通过状态。交互组织参考了社区路线图的点击式技能节点，课程内容依据各领域的原始资料编排。[roadmap.sh 前端路线图](https://roadmap.sh/frontend)

## 实施

10 棵技能树包含 40 条分支、123 个节点、246 道双语情境题。每个技能有目标、官方资料、动手任务、可保存的练习记录与检验。可以通过时间预算预检，将任意节点的动手任务安排到计划。四个现有学习项目从相关分支可直接进入。

旧地图的工作透镜、工具示例和自述进度入口由技能树替代。原任务和草稿保留原交付标准，历史链接会打开对应技能。账户初始通过数为零，之后依据版本化的站内检验记录更新。官方样题和测验在发布方站点练习。

## 各方向的技能依据

| 职业 | 四条分支 | 主要依据 |
| --- | --- | --- |
| 数据分析 | 指标与取数 · 数据质量 · 统计判断 · 建模与表达 | [PL-300 学习指南](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300) · [英国政府数据质量框架](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance) · [NIST 统计手册](https://www.itl.nist.gov/div898/handbook/) |
| 人工智能 | 数据与建模 · 生成式 AI 应用 · 评测与复核 · 上线与治理 | [CS2023 知识领域](https://csed.acm.org/knowledge-areas/) · [Google 机器学习课程](https://developers.google.com/machine-learning/crash-course) · [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) |
| 网络安全 | 网络与授权边界 · 身份与访问控制 · 检测与事件响应 · 应用安全 | [NIST NICE](https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center) · [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) · [NIST 事件响应指南](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf) |
| 运维工程 | 系统与网络 · 交付与基础设施 · 可观测性与可靠性 · 变更、回退与复盘 | [Google SRE](https://sre.google/sre-book/table-of-contents/) · [Kubernetes 文档](https://kubernetes.io/docs/concepts/) |
| 前端开发 | Web 基础 · 交互与无障碍 · 组件与工程化 · 性能与上线 | [MDN Curriculum](https://developer.mozilla.org/en-US/curriculum/) · [W3C WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) |
| 后端开发 | 接口与业务规则 · 数据与事务 · 认证与安全边界 · 验证与可观测性 | [IEEE SWEBOK](https://www.computer.org/education/bodies-of-knowledge/software-engineering) · [HTTP RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) · [OpenAPI](https://spec.openapis.org/oas/latest.html) |
| 数据工程 | 数据模型与存储 · 批处理与编排 · 流式与增量 · 质量、血缘与运维 | [DP-700 学习指南](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700) · [Apache Airflow](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html) · [OpenLineage](https://openlineage.io/docs/spec/object-model/) |
| 软件测试 | 需求与风险 · 测试设计技术 · 执行、缺陷与复核 · 自动化与持续交付 | [ISTQB CTFL 大纲](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf) · [ISTQB 官方样题](https://istqb.org/wp-content/uploads/sdm-uploads/ISTQB_CTFL_v4.0_Sample-Exam-C-Questions_v1.6.pdf) |
| 通用软件开发 | 需求与问题分解 · 编码与算法 · 验证与演进 · 协作与发布 | [IEEE SWEBOK](https://www.computer.org/education/bodies-of-knowledge/software-engineering) · [CS2023 知识领域](https://csed.acm.org/knowledge-areas/) |
| IT 实施交付 | 需求与实施范围 · 配置、权限与迁移 · 验收与上线切换 · 交接、培训与支持 | [SFIA 9 系统实施](https://sfia-online.org/en/sfia-9/skills/systems-installation-removal) · [Microsoft 实施策略指南](https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/implementation-strategy) |

## 实现截图与验证

- [桌面初始状态](images/skill-tree-20261113/01-empty-tree.png) 展示全部分支和 0% 进度。
- [桌面通过状态](images/skill-tree-20261113/02-progress.png) 展示 33% 的枝干、节点和下方学习流程。
- [成果检验](images/skill-tree-20261113/03-check.png) 展示逐题解释、历史尝试与官方资料。
- [手机尺寸截图](images/skill-tree-20261113/04-mobile.png) 展示在 390px 下展开分支与横向步骤。

桌面与 390px、320px 浏览器验证通过。覆盖职业切换、历史链接、键盘操作、记笔记、预算预检、错题反馈、0% 到 100% 进度以及刷新恢复。模拟检验已写入账户、响应途中丢失的情形，可就地取回结果，尝试次数只记一次。窄屏连线经过满进度边界检查。服务器模式和本机演示模式均构建通过。全量模型测试中 481 项通过，1 项跳过，3 项既有 AI 费用测试因定价快照到期失败。与本次发布相关的 106 项在服务器构建环境全部通过。

已发布到阿里云 `skill-tree-20261113-02`。通过 HTTPS 核对地图及学习项目入口，使用临时账户验证登录、十棵树、进度保存、拒绝伪造检验结果、历史课程以及账户数据清理。线上浏览器复测使用服务器 HTTPS 页面和接口，静态文件经 SHA-256 核对后从本机缓存加载。复测覆盖记笔记、错题后通过、进度刷新恢复、窄屏切换职业。首次切换前保存了账户数据库备份，末次补丁只切换网页文件。

