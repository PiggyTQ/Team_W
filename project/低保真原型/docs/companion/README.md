# 芝识分子悬浮对话 · 实施与验收（2026-10-31）

## 设计与现状检查

- React 19 + Vite，CSS 文件与全局主题并存，已有 GSAP；此次使用原生 Web Animations API，无新增依赖。
- 吉祥物入口为 `src/SidebarCompanion.jsx`；继续复用 `CheeseAvatar` / `CheesePose` 和 `/mascot/q-*.png`，未修改图片。
- 导航由 `WorkspaceSidebar` 和 main 中的 go/move 管理，AI 工作台为 U11 `/assistant`，不是 React Router。
- 工作台通过 `AssistantWorkspace` / `AssistantChat` 使用 main 的当前 conv、aiDraft、sendAI。模拟回复同步产生；服务模式使用 useAgentSession，保留外发授权、资料范围、模式及服务能力检查。
- 侧栏与根布局有 overflow:hidden / clip。对话框 Portal 到 document.body，fixed、z-index:1900，无遮罩、不锁页面滚动。窗口消息自行滚动并隔离滚动链。
- 原吉祥物看书/趴着、休息/唤醒、隐藏/恢复仍由原偏好控制。休息、隐藏和切页关闭浮窗；唤醒按钮只唤醒，形象按钮才切换对话。工作台内点击形象保持在工作台。
- 仓库 AGENTS 提及的 `设计参考与同步/设计参考与图片同步约定.md` 在当前检出中未找到。本次用户已明确要求视觉深化，因此采用指定品牌色。

## 文件与职责

| 文件 | 用途 |
| --- | --- |
| src/AiCompanionPopover.jsx（新增） | Portal 对话、响应式定位、动画生命周期、欢迎/快捷提问、共享消息展示、输入和工作台入口 |
| src/ai-companion.css（新增） | 奶油白/暖黄/深蓝样式，气泡、分层阴影、内部渐显、窄屏/低高度/减少动画适配；隔离全局 footer 与消息段落样式 |
| src/SidebarCompanion.jsx | 形象入口、展开语义、关闭意图、休息/隐藏/路由联动与焦点恢复 |
| src/WorkspaceSidebar.jsx | 向现有吉祥物传入 AI 状态、操作和当前路由 |
| src/main.jsx | 将同一 conv/update/sendAI 传给浮窗；sendAI 接收可选问题；打开时收起原 AI 侧栏 |
| src/useAgentSession.js | 允许快捷问题传入既有 send；失败保留相同草稿；主动转入工作台时保留在途请求的原始上下文 |
| src/i18n/reviewed-en.json | 新文案的完整英文映射，与 useLanguage 一起工作 |
| tests/companion-browser.mjs（新增） | 隔离浏览器合成数据的功能回归和截图，不修改用户日常浏览器记录 |
| docs/companion/ | 设计图、实际截图、检查日志和本说明 |

## 数据与交互链路

形象 → 打开浮窗 → 使用现有 conversations / conversationId / aiDraft → 同一个 sendAI / liveAgent.send → 工作台读取同一状态。

打开不会新建会话；关闭不删除会话；既有存储和账户同步负责恢复。工作台跳转不再提交问题。消息使用现有 AgentMessage，继续隐藏授权撤回或知识版本失效的数据。真实服务未启用、缺少授权或模式不支持时不能发送，快捷问题先保存草稿，并引导进入工作台处理。模拟模式明确标注未连接模型。

工作台入口先保留共享草稿与会话，标记 closing，动画完成后调用 go('/assistant')。在途真实请求仅在此主动交接时保留来源上下文，其他上下文变化仍沿用原来的重验证/取消规则。请求失败保留草稿，可重新发送；未引入额外 API 或密钥。

## 动画与尺寸

- 桌面宽390px，高最多560px，视口留白；左边缘按侧栏右边缘 +20px 计算并限制在视口内。窄屏左右12px，底部面板；visualViewport 监听高度、偏移和安全区域。
- 打开340ms，关闭260ms，cubic-bezier(0.22, 1, 0.36, 1)，左下角为变换原点，opacity 0→1，scale .88→1，translate(-8px,12px)→0。
- Web Animations 的 finished Promise 完成后卸载/跳转。取消动画会捕获 rejection；反向动画从当前计算帧继续，快速点击不会创建多个实例。没有 setTimeout 作为跳转依据。
- 欢迎区320ms，快捷问题280ms，间隔35ms；不阻塞操作。减少动画设置下窗口动画0ms、内部动画关闭。
- Escape/显式关闭后恢复入口焦点；点击背景和导航关闭但不抢焦点。关闭期间面板 inert；非模态，不拦截背景交互。

## 设计与实际页面

- `design.svg`：实施前设计提案，非用户参考图、非已确认设计稿。
- `desktop-welcome.png`：中文首次打开实际页面。
- `workspace-continuation.png`：快捷提问后进入工作台的实际页面。
- `desktop-english.png`、`mobile.png`：英文及390px窄屏实际页面。
- 已目视核对截图，修复全局 footer 的 display/margin 与消息段落装饰泄漏；最终三条快捷问题在桌面欢迎页可见。

## 验证结果

- `npm run build`：通过（包含 i18n:check，新增文案无缺失）；保留项目已有大包与静态/动态 import 构建警告。
- `node tests/companion-browser.mjs`：本地无头 Microsoft Edge 通过。覆盖首次打开、快捷问题只产生一组问答、同一会话与草稿交接、刷新恢复、快速开关、休息/唤醒/隐藏/恢复、Escape和焦点、点击外部、Enter/Shift+Enter/空输入、英文、减少动画、390px窄屏、折叠侧栏、长消息和切页关闭；无 pageerror。
- `node --test --test-timeout=15000 tests/agent-session.test.mjs tests/agent-contract.test.mjs tests/bilingual-regression.test.mjs`：31项中30通过、1失败。失败为已有公共知识库双语数据测试，当前检出无知识库 SQLite，createKnowledgeStore 返回 null，finally 中调用 close 报错；详见 related-tests.log。
- `npm test` 已执行；沙箱内本地服务测试失败并挂起。沙箱外再次执行及限制并发/超时的全套运行都未结束，已中止，不能声称全套通过；记录保留于 unit-tests-full.log。没有为本任务修改无关后端/数据测试。
- 项目未提供单独 lint 或 TypeScript 检查脚本；`git diff --check` 通过。
- 未进行真实 DeepSeek 端到端调用、跨浏览器验收、真实手机虚拟键盘或屏幕阅读器人工验收。visualViewport/安全区逻辑已实现，不能用桌面窄屏截图代替真机验证。真实服务交接路径复用既有会话引擎，未在浏览器中实测外部请求。
