# Web 与平台后端接口约定

本轮已于 2026-10-30 获用户授权部署，AI 和外部服务保持关闭；生产状态与证据见本轮交付记录。现有接口路径及 13 类业务命令保持兼容。页面改版可以调整 JSX 和样式，保留这些服务边界即可。

## 页面协作

- `src/auth-client.js` 继续统一管理 Cookie、CSRF、账户绑定、超时和账户变化处理。不得在页面中保存密钥，也不要把模型配置放入 `VITE_*`。
- `useServerWorkspace` / `workspace-sync` 负责草稿保存、版本、命令和断网恢复。重要操作调用 `workspace.command(type,payload)`，不要将客户端计算结果写成服务端回执。
- 工作台通过 `DashboardView` → `WorkspaceHome` 的 `suggestions` 插槽嵌入 `PersonalSuggestions`。改版时可以移动插槽；保留 `owner / workspace / state / link` 这四项输入。
- 建议控制器只在初次读取、关键状态保存后或主动重试时请求；普通草稿不重复读取，不轮询，不请求模型。未保存/冲突时隐藏可操作的旧建议，换账户立即清空；反馈绑定服务器 adviceKey。
- 邮件链接由 App 的 `mailLink` 状态与 `hashchange` 监听接管，`MailTokenForm` 按 token 区分生命周期；不要把 token 放入查询参数或持久浏览器存储。表单初始化后清除地址片段。
- 管理路径使用 `AdminConsole`。学生得到 403 和明确说明；角色只通过服务器操作者 CLI 授予，页面切换角色不能取得权限。

## 新增与扩展接口

| 接口 | 权限与请求 | 成功返回及限制 |
| --- | --- | --- |
| GET `/api/agent/suggestions` | 当前会话、账户绑定 | `adviceKey / contextRevision / suggestions`；`providerCalled:false`、`automaticModelCalls:false` |
| POST `/api/agent/suggestions/feedback` | 当前会话、CSRF；`{adviceKey,suggestionId,status}` | status 为 read/dismissed/not_relevant；旧基线 409，不应用到新建议 |
| GET `/api/system/capabilities` | 当前会话 | 保留原字段，增加 `adminRoles`；`emailRecovery/emailVerification` 根据实际邮件配置返回；AI 开关独立 |
| POST `/api/auth/recover` | 同源、CSRF；`{email}` | 邮件未配置返回 503 RECOVERY_UNAVAILABLE；配置后统一返回 202 `{accepted:true}`，不表示已送达或存在该账户 |
| POST `/api/auth/request-verification` | 当前会话、CSRF | 202 `{accepted:true}`；未配置 503，不伪造发送 |
| POST `/api/auth/verify-email` | 同源、CSRF；`{token}` | 200 `{completed:true}`；令牌只能使用一次，有效期 15 分钟 |
| POST `/api/auth/reset-password` | 同源、CSRF；`{token,newPassword}` | 200 `{completed:true}`，旧会话全部撤销；不自动登录。令牌过期、重放或旧凭据绑定失效均拒绝 |
| GET `/api/admin/status` | 明确的任一管理角色 | 知识包元数据、课程状态、最近操作审计；不返回学生个人材料 |
| POST `/api/admin/commands` | CSRF、对应角色；`{type,mutationId,payload}` | 服务端原子回执；同一 ID+内容幂等；网络结果不明重试原 ID，不能换 ID 重试 |
| GET `/api/admin/operations` | operator 角色 | 5 分钟窗口的全站脱敏运行统计、哈希队列和邮件队列统计 |
| GET `/api/ops/metrics` | 独立 Bearer 运维密钥；不依赖学生 Cookie | 同上；未配置或令牌错误返回 404。只供运维探针，密钥不得进入前端 |

所有写入仍需要现有 Origin/CSRF 校验，客户端不提供 owner。确认与错误后恢复沿用现有机制。邮箱状态通过会话接口的 `user.emailVerified` 返回。

## 管理命令

- `knowledge.draft`：editor，`{pack}`。完整公共知识包须通过原有来源/切片/散列/用途检查，以及技能标准结构检查；新建不可变草稿。
- `knowledge.review`：reviewer，`{id,revision,confirmation:'REVIEW_KNOWLEDGE'}`。记录实际操作账户，不冒称专家认证。
- `knowledge.publish`：publisher，`{id,revision,confirmation:'PUBLISH_KNOWLEDGE'}`。仅发布已审核版本，切换当前知识入口。
- `knowledge.withdraw`：publisher，`{id,revision,confirmation:'WITHDRAW_KNOWLEDGE'}`。撤回当前包后使用空的撤回版本，禁止自动回退到旧知识；旧回答与行动按已有摘要校验失效。
- `course.status`：publisher，`{id,revision,contentVersion,status,confirmation:'CHANGE_COURSE_STATUS'}`。status 仅 published/retired；发布要求已有课程内容版本，停止新增使用不删除历史成果或课程版本。

初始 46 条知识包的内容原样登记为 baseline，保留原工程/AI 辅助编辑审核属性；不会把迁移导入写成新增人工审核。审核人和管理职责仍需真实指定。

## 运行与费用

密码哈希同时执行 2 个，最多等待 20 个，等待超时/超额明确返回 503 和 Retry-After；没有无限排队。匿名入口仍按 IP 限制，正常会话刷新不消耗共享 IP 的登录额度。工作区与重要操作继续按账户限流。

运行统计按固定路由归组，不记录查询参数、对象 ID、邮箱、IP、材料正文、聊天、请求头或密钥。指标是单进程 5 分钟窗口，不是长期监测历史；探针状态保留最新结果，服务日志由既有 systemd/journal 管理。

DeepSeek 继续关闭；规则建议、邮件流程和后台操作不调用模型。累计 8 元为原模型测试上限，不能当成 20 人长期 AI 运营预算。邮件、存储等外部服务启用前须配置并授权，不重置已有费用账本。
