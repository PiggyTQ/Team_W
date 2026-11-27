# 技能学习与 AI 工作台视觉统一（本地完成）

2026-11-26，实际工程 `git_file/project/低保真原型`，基线 `dev / 867fff3` 及共用工作区已有修改。根据用户最新两张截图直接实施；本轮未部署、提交、推送，未操作真实账户或生产数据库。

## 技能学习页面

用户图一是问题现状，深蓝横幅来自 `branch-learning.css` 本身的设置。本轮将其改为浅蓝/暖白任务头、深蓝标题与职业图标、浅黄独立产物提示；学习/练习主阶段采用底线导航，课内目录采用轻量浅蓝分段。侧栏、正文卡面、边界说明及来源区域使用同一组边框与留白。

“信任边界与威胁建模”的边界页已单独核对，原学习目标、产物、OWASP资料及关联项目入口保留。其他通用课、SQL、告警及练习也沿用同一视觉。学习位置、随堂作答、练习草稿、Tutor、最终检验和通过后长叶规则保持原链路。

## AI 工作台与关联页面

原账户模式使用 `DiscussionWorkbench`，本机演示使用 `AssistantChat`；演示端仍保留旧的左右布局与四个示例起点。同一网址因此出现两种外观。只读规则审计没有发现上轮 `practice-growth.css` 直接命中 AI 或技能页，不据此认定某次部署改坏了页面。

- 两种模式恢复用户图二的布局：顶部左侧页面名、右侧历史讨论/本人笔记/新讨论；中间原笔记本角色、欢迎标题、副标题；下方大输入面、“本次资料”和黄色操作，再下方三个横向任务入口。低频演示选项按需展开。空稿或模型关闭时仍保留真实禁用/保存状态。
- `/assistant/next-step`、`/assistant/compare`、`/assistant/expression` 同步采用暖白、深蓝、浅蓝与黄色，按材料/对象/比较和讨论的主次关系排布，随容器宽度重排。没有把三个链接改成只填入示例问题的按钮。
- 原三个任务页无条件使用账户接口，本机演示会遇到未登录接口问题；新增本机分支复用原任务准备面板、讨论身份与本机资料，只在明确选中后显示个人正文。临时讨论输入保持未核对状态，问题与选择保存在该讨论中，可刷新或从历史返回；不调用账户接口、不生成服务端签发建议。
- 账户模式继续使用原资料概况、外发授权、来源绑定草稿和原业务确认链路。已有会话、本人笔记、历史改名/归档/恢复等未以“恢复首页”为由清空。Tutor停靠区不受本次 `.assistant-reference-page` 样式影响。

主要实现：`src/branch-learning.css`、`SkillJourneyPage.jsx`，`AssistantWorkspace.jsx`、`AssistantPageHeader.jsx`、`AssistantChat.jsx`、`AssistantTaskPage.jsx`，新增 `assistant-reference-layout.css` 和 `assistant-demo-task-model.js`，及活跃讨论双语登记。保留并行职业探索、学习实践和后台的已有修改。

## 本轮实际验证

- Node **24.22.3**：学习相关 **23/23**、AI任务与讨论相关 **30/30**，共 **53项通过**。包含本机选中资料、讨论身份、输入限制、原账户任务页契约及原学习/练习规则。不是全站全量测试结果。
- 双语检查 **10,959条、缺失0**；账户与本机演示两种构建均成功。既有大分块/登录资源混合导入提示保留。共用 `dist` 会被并行工作刷新，最终验收改用本任务专属 `server-dist`、`demo-dist`；入口和源码摘要记录在 `checks/learning-assistant-visual-20261126/build-identity.json`。
- AI最终双模式同一组专属包完成 **32组布局、34张实拍**。中英文1366×900、1616×973、2539×973、520×900：首页、三入口、问题保存/刷新/历史、同源公开职业比较、作品原文显式选择均通过。账户模式174次API请求无HTTP失败；本机演示0 API请求；页面错误、外部请求、模型调用均为0。原目标、预算、授权、已确认材料、任务证据和技能状态不变。
- 技能最终专属包完成 **13张回归实拍**：诊断与推演保存、键盘切课、Tutor展开/关闭/Escape回焦点、SQL实际运行、告警旧位置、未准备检验回练习、错误检验回看、通过后的首次长叶及刷新均通过。另保存用户图一对应安全课程的 **8张中英/宽窄屏实拍**，来源链接保留，无工作区或页面横向溢出。
- 共 **55张最终实拍**。初轮高速整页导航触发限流，以及不合适的QA请求串行队列与共用构建诊断，均另存检查目录，不计作最终通过截图；未提高产品限流、放宽资料断言或关闭费用保护。正常切页取消过时请求仍有记录，不将其描述为服务HTTP失败。

实际测试仅用临时SQLite与合成账户，没有启用外部模型、邮件或收费服务。本机演示的三个任务页提供本机整理/保存与原工作页返回；不会把本机保存问题伪装成真实模型答复或账户签发建议。线上结果和真人试用仍待实际进行。

## 设计与实际页面

- 用户原图：[学习页问题图](learning-assistant-visual-20261126/reference/learning.png) · [AI目标图](learning-assistant-visual-20261126/reference/assistant-target.png)
- 实施前：[学习方案](learning-assistant-visual-20261126/learning-design.md) · [学习结构示意](learning-assistant-visual-20261126/learning-design.svg) · [AI方案](learning-assistant-visual-20261126/ai-design.md) · [AI结构示意](learning-assistant-visual-20261126/ai-design.svg)
- 最终实拍：[安全课程边界页](learning-assistant-visual-20261126/actual/learning-target/security-limits-zh-1616x973.png) · [性能课程](learning-assistant-visual-20261126/actual/learning-regression/01-performance-lesson-zh-1616x960.png)
- 最终实拍：[本机AI首页](learning-assistant-visual-20261126/actual/assistant/demo-home-zh-1616x973.png) · [账户AI首页](learning-assistant-visual-20261126/actual/assistant/server-home-zh-1616x973.png)
- 最终实拍：[梳理下一步](learning-assistant-visual-20261126/actual/assistant/demo-next-step-zh-1616x973.png) · [职业比较](learning-assistant-visual-20261126/actual/assistant/demo-compare-zh-1616x973.png) · [成果表达](learning-assistant-visual-20261126/actual/assistant/demo-expression-zh-1616x973.png)
- 回执与重现脚本：`checks/learning-assistant-visual-20261126/assistant-browser.json`、`learning/desktop.json`、`learning-target.json`、两组测试日志、双语/构建日志及同目录 `.mjs`。
