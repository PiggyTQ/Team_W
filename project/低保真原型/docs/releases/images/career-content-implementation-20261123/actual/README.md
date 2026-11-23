# 实际页面截图

65 张图片来自 2026-11-23 本地服务器模式构建，使用 Edge、隔离测试账户和合成输入。[实施前结构](../structure.svg)另存。

| 场景 | 图片 |
| --- | --- |
| 中文详情首屏，1366 × 900 | [数据分析](data-zh-1366x900.png) |
| 英文工作链和侧重，1616 × 960 | [数据分析职业全貌](overview-en-1616x960.png) |
| 中文职业范围与案例交界 | [人工智能](occupation-ai-zh-1616.png)、[数据工程](occupation-engineering-zh-1616.png)、[IT 实施交付](occupation-delivery-zh-1616.png) |
| 两个或三个方向的普通比较 | [中文双列](compare-zh-1616x900.png)、[英文三列](compare-en-1366x960.png) |
| AI 工作台的同源公共对照 | [英文对照](ai-public-comparison-en.png) |
| 代表案例和具体产物 | [数据表图](outputs-en-1616x960.png)、[R2 边界体验](case-testing-zh-1616.png)、[迁移回退分岔](case-delivery-zh-1616.png) |
| 来源、章节与采用范围 | [商务数据分析机构公开件](data-standard-zh.png)、[人工智能政务镜像](sources-expanded-en-1366.png)、[测试边界值与缺陷章节](istqb-boundary-source-en-1366.png) |
| 原账户流程 | [材料关联](03-material-three-saved.png)、[授权核对](04-selected-material-ai-review.png)、[目标预览](06-target-current-set-reason.png)、[草稿保存失败](07-trial-save-failure.png) |
| 失败和并发边界 | [关联失败](edge-material-save-failure.png)、[材料版本竞争](edge-material-version-conflict.png)、[草稿保存队列](edge-trial-save-queue.png) |

同目录 `data-*`、`overview-*`、`outputs-*` 和 `compare-*` 包含 1366/1616 × 900/960 × 中英文的桌面矩阵。主流程的十个 `case-*` 展示原有案例分岔。浏览器检查了章节跳转和引用、体验草稿的本机恢复与账户重试、真实导出及来源版本、材料版本冲突、笔记复核及目标。学习回归运行原 SQL 练习，错稿保持可改，Tutor 可主动打开和关闭。

脚本和本轮回执在工程的 `checks/career-content-implementation-20261123/`。自动化检查覆盖主内容横向溢出和浏览器页面错误；截图用于人工比对职业层、案例层与来源展开。未测移动端或真人学习效果。
