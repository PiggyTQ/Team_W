# 工作区导航比例：本轮验收截图

2026-11-27，本机隔离演示与 Edge headless，使用全新临时浏览器上下文、英文优先、关闭操作引导。没有使用真实用户存储、真实账号、外部模型或招聘源。

## 最终主矩阵

最终源码独立冻结到 `checks/workspace-nav-proportions-20261127/after-dist`；构建完成于本机时间 11:36:28。完整矩阵最终运行完成于 11:42:06。结果为 **21 组几何记录、24 张截图、4 类功能检查通过，页面 JavaScript 错误 0**。截图等待可见伙伴图像加载后拍摄；伙伴姿态属于动画即时状态。

| 视口 | 侧栏实际宽度 | 主区实际宽度 | 侧栏占视口 | 主导航文字 |
| --- | --- | --- | --- | --- |
| 1366×900 | 280px | 1086px | 20.5% | 15px、全部单行 |
| 1616×960 | 296px | 1320px | 18.3% | 15px、全部单行 |
| 1920×1080 | 320px | 1600px | 16.7% | 15px、全部单行 |
| 2560×1440 | 320px | 2240px | 12.5% | 15px、全部单行 |
| 1024×900 | 256px | 768px | 25.0% | 15px、自然按词换行、不裁切 |
| 768×1024 | 240px | 528px | 31.3% | 15px、自然按词换行、不裁切 |
| 1366×900，折叠 | 76px | 1290px | 5.6% | 图标与完整英文浮层 |
| 390×844，抽屉关闭 | 0px | 390px | — | 手机抽屉承载完整名称 |

1366×900 的导航滚动区 `clientHeight/scrollHeight` 为 440/440px；1616×960 为 500/500px，八个主入口默认全部可见。低高度桌面使用 44px 行和横排伙伴，1920×1080 保持 48px 行及常规伙伴。1024×900 的主导航可在自身区域滚动，不挤压固定在底部的账号入口。

除页面与主区没有横向溢出外，还额外验证实际可读尺寸：1024px 职业页卡片为 349px，768px 卡片为 470px，避免英文被挤成逐字母竖排。768px 筛选区移至结果上方、模式导航为两行。折叠后品牌图右边界 178px，搜索框左边界 196px，完整 Logo 未被搜索覆盖。

通过的功能检查包括：折叠/展开、英文浮层及 Escape、刷新记住折叠状态、Ctrl+Backslash、键盘跳转、手机抽屉打开与跳转后关闭。导航操作前后职业目标、本人经历、岗位、任务、技能学习、报告等业务记录一致。

## 桌面英文三页面

| 视口 | 工作区首页 | 职业探索 | AI 工作台 |
| --- | --- | --- | --- |
| 1366×900 | [首页](home-en-1366x900.png) | [职业探索](careers-en-1366x900.png) | [AI 工作台](assistant-en-1366x900.png) |
| 1616×960 | [首页](home-en-1616x960.png) | [职业探索](careers-en-1616x960.png) | [AI 工作台](assistant-en-1616x960.png) |
| 1920×1080 | [首页](home-en-1920x1080.png) | [职业探索](careers-en-1920x1080.png) | [AI 工作台](assistant-en-1920x1080.png) |
| 2560×1440 | [首页](home-en-2560x1440.png) | [职业探索](careers-en-2560x1440.png) | [AI 工作台](assistant-en-2560x1440.png) |

## 中文与窄屏

- [1366×900 中文首页](home-zh-1366x900.png)
- [1616×960 中文首页](home-zh-1616x960.png)
- [1024×900 职业探索页头](narrow-careers-en-1024x900.png)
- [1024×900 职业卡片实拍](narrow-career-cards-en-1024x900.png)
- [1024×900 AI 工作台](narrow-assistant-en-1024x900.png)
- [768×1024 职业探索页头](narrow-careers-en-768x1024.png)
- [768×1024 职业卡片实拍](narrow-career-cards-en-768x1024.png)
- [768×1024 AI 工作台](narrow-assistant-en-768x1024.png)

## 折叠与手机

- [1366px 折叠导航与完整品牌](collapsed-en-1366.png)
- [1366px 完整英文浮层](collapsed-tooltip-en-1366.png)
- [390px 英文导航抽屉](mobile-drawer-en-390.png)
- [390px 抽屉关闭后的 AI 工作台](mobile-assistant-en-390.png)

## 账号模式课程与 Tutor 独立检查

另有 2 张账号模式截图，总计本轮 after 截图 **26 张**。使用临时 SQLite 与一次性本机账号；邮件传输关闭、模型能力关闭。账号模式检查于 **11:17:52** 完成，属于此前已通过的课程/Tutor 检查，不冒称为 11:42 的主矩阵。该检查使用的侧栏断点、菜单字号和紧凑高度规则与最终版相同；其后改动为职业探索窄主区布局与折叠头部品牌占位。最终 `after-server-dist` 已于 **11:36:34** 重新冻结，但按避免重复已通过功能检查的安排没有再次运行 Tutor 交互。

1366×900 账号模式侧栏 280px、主区 1086px。Tutor 关闭时课程正文 999px；打开后正文 621px、Tutor 360px，两者不重叠，主区无横向溢出。Escape 关闭后焦点回到触发按钮，目标、经历、岗位、事件、任务与技能学习记录未变；没有实际模型调用。

- [账号模式课程：Tutor 关闭](account/lesson-tutor-closed-en-1366.png)
- [账号模式课程：Tutor 打开](account/lesson-tutor-open-en-1366.png)

## 可复查记录

- [最终主矩阵 JSON](../../../../checks/workspace-nav-proportions-20261127/after-results.json)
- [账号 Tutor 检查 JSON](../../../../checks/workspace-nav-proportions-20261127/after-account-results.json)
- [最终主矩阵脚本](../../../../checks/workspace-nav-proportions-20261127/after.mjs)
- [账号 Tutor 脚本](../../../../checks/workspace-nav-proportions-20261127/after-account.mjs)
- [改动前实测与 8 张基线截图](../baseline/README.md)

实测命令使用本机 Node 24 执行 `node_modules/vite/bin/vite.js build --outDir checks/workspace-nav-proportions-20261127/after-dist`，以及 `build --mode server --outDir checks/workspace-nav-proportions-20261127/after-server-dist`，然后执行 `checks/workspace-nav-proportions-20261127/after.mjs`。账号独立检查命令为执行 `checks/workspace-nav-proportions-20261127/after-account.mjs`。这些命令不部署服务器，也不读写用户真实浏览器状态。
