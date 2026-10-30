# AI 建议与确定性业务闭环

当前版本：2026-10-29 已部署的受限试用代码，AI按用户授权保持关闭。完整交付、真实失败、费用和生产验收以 [上线评审](../../AI业务闭环_交付与上线评审_20261028.md) 为准。46条获准原创学习资料已接入默认库；审核身份为工程与 AI 辅助编辑审核，非人工专家认证。模型建议仍只读，新增领域动作通过独立确定性接口和本人确认完成。

本模块已完成后端与 U11/侧栏接通，并在服务器最新前端源码上合并构建部署。AI关闭时不能发送模型请求，也不会自动回落模拟；站内材料核对、行动预览与确认保存仍可使用。真实学生测试和独立内容复核仍是正式开放门槛。

## 运行边界

复用 `auth-server.mjs` 的登录会话、同源/CSRF、账号绑定和工作区版本。`POST /api/agent/respond` 只读取当前账号快照，不修改计划；前端将有效问答通过已有账户保存接口存入当前会话。客户端不能提供 owner、模型地址、工具名或完整工作区。`/api/system/capabilities` 的 `ai` 与 `agent.enabled` 均反映配置状态，详细范围由 `agent` 字段说明。

外发必须满足新版 `deepseek-external-v1` 同意与 grantId，旧模拟授权不继承。前端、后端及笔记共用 [共享契约](../../src/agent-contract.js)。请求起点检查 revision，返回前复核相关材料、授权、计划与会话指纹，忽略无关草稿保存；真实同意、计划或材料变化仍拒绝旧结果。

支持三种模型请求模式：`career_consultation`、`assessment_explanation`、`plan_simulation`。另外，`POST /api/agent/analyse` 进行显式技能标签关联与预算计算，`propose` 预检并保存十分钟预览，`apply` 以 `APPLY_ACTION`、版本和幂等键提交。LLM本身不能调用这些写接口。反馈、偏好和聚合运行记录按账户隔离；详见 `workflow.mjs`、`operations.mjs`。

## 配置

仅在后端运行环境配置，浏览器和 VITE 环境变量中不得放密钥：

```text
AI_ENABLED=1
AI_ACCESS_MODE=allowlist
AI_ALLOWED_USER_IDS=<仅列出本人批准试用的账户ID，逗号分隔；留空则无人可调用>
DEEPSEEK_API_KEY=<在服务器密钥配置中填写>
DEEPSEEK_MODEL=<部署时核对官方可用模型>
AI_BUDGET_CNY=8.00
AI_BUDGET_ID=initial-ai-test-20261028
AI_BUDGET_DATABASE=/var/lib/career-growth/ai-budget.sqlite
AI_REVIEWED_KNOWLEDGE_FILE=<经审核发布的 JSON 文件绝对路径，可省略>
```

未开启、缺密钥或缺模型名称时保持禁用。正式环境工厂还必须配置累计预算账本，只允许当前核价的 `deepseek-flash`；缺预算或超出用户授权的 8 元会禁用 AI。配置格式错误仅禁用 AI，保留原账户业务。默认知识包为 `knowledge/authored-guidance-v1.json` 的46条已审核原创学习资料；不会自动导入 `knowledge.sqlite` 的展示或招聘样本。**模块不会加载 `.env` 文件**，应由既有进程管理器提供环境变量。服务器私密配置已准备但未接入运行服务，填写步骤见 [密钥说明](../../DeepSeek密钥填写说明_20261028.md)。

DeepSeek 固定调用 `https://api.deepseek.com/chat/completions`，单次调用最长 10 秒、输出上限 1600 tokens、无自动付费重试、禁用 thinking、拒绝重定向。不返回推理正文或供应商原始错误。模型配置名称和响应名称分开记录；后者也不能保证是不可变模型快照。

原生 fetch 付费路径拒绝缺预算账本的请求。账本在请求发出前以 SQLite 事务预留费用，累计最多 8 元、失败不退款、重启和跨日不重置。费用估算使用实际请求字节与协议余量、输出上限，以及核验峰值费率的两倍；不是供应商账户的硬限额。2026-11-04 00:00（北京时间）起拒绝过期费率的新调用。预算用量和请求次数限制是两套独立约束，不得删账本扩大额度。

现有 JSON 客户端超时为 15 秒、代理读取超时为 20 秒，因此先使用较短模型预算。实际成功率与延迟需真实 API 测量；后续再评估独立客户端、流式或异步作业。

## 请求契约

先用已有工作区同步器 `flush()` 保存，取当前 `revision`。实际集成还需处理账号切换、取消和草稿恢复。

```json
{
  "mode": "assessment_explanation",
  "message": "这份材料能说明什么，还缺哪些信息？",
  "baseVersion": 4,
  "conversationId": "conv-1",
  "scope": {
    "confirmedClaims": true,
    "currentPlan": false,
    "claimRefs": [{"id": "claim-123", "version": 2}]
  },
  "context": {"workspace": "U04", "career": "data"}
}
```

`conversationId` 可省略；提供时必须属于当前工作区，但不会读取其历史正文。已保存对话角色、核验标识、analysis 和任意额外字段均不能当作可信系统输入。

`confirmedClaims=true` 必须提供至多 12 个不重复的具体引用，并与服务器当前 `authorized`、`aiScope`、`aiClaimRefs`、材料确认状态及版本交叉匹配。未选择、未确认、过期、撤回片段不得送给模型。个人材料显式标为 `user_confirmed_unverified`、`independentlyVerified:false`。文本本身可能含个人信息；用户选择这些片段即是本次外部模型处理范围，前端接通前须明确展示供应商与外发范围。

`currentPlan=true` 允许读取当前目标、预算、预计投入、最多 30 项任务及依赖，不包含笔记、尝试正文、私人反思或复盘。总投入使用现有 `usedHours` 计算，任务自填完成状态不是能力认证。当前版本仅检索 CN/zh 职业知识，职业采用 Web 的 `data/ai/security/ops/frontend/backend/engineering/testing/software/delivery` 标识。

响应包含 `statements`、`limitations`、`citations`、`tools`、版本与使用量元数据。事实条目必须引用本次证据 ID；引用原文与位置来自服务器而非模型。建议和问题分型显示。语义支持性仍需人工评估，不应直接渲染模型 HTML、自动保存建议或自动执行内容。

真实首测发现模型把“记录练习”升级成“完成练习”，因此 `career-readonly-v2` 进一步要求每个 `fact.text` 是其全部引用来源的逐字连续原文；否则返回 `AI_UNSUPPORTED_FACT`。这是一项有限的引文守卫，仍不能自动证明上下文完整或建议正确。三次真实合成测试及已知问题见 [真实调用记录](../../AI真实调用验收_20261028.md)。

## 批准知识发布契约

知识包形如 `{version,sources:[],chunks:[]}`。来源须包含 `id/version/status=published/reviewStatus=approved/purposes` 中的 `agent_advice`、真实审核人 `reviewer`、ISO 审核时间 `reviewedAt` 和完整 `content`。来源可包含 `title`；撤回、吊销或元数据缺失时不进入检索。

chunk 包含 `id/sourceId/sourceVersion/start/end/sha256/career/market/language`。`start/end` 是 Unicode **码点**半开区间，SHA-256 对应原文片段 UTF-8 字节。正文由来源现场切取，不能由调用方伪造。对职业/市场/语言先过滤再按中文二元词组与拉丁关键词排序，不包含 Embedding。

审批必须由可信发布流程产生；仅填写 `approved` 不会证明审批真实。当前默认包为 `knowledge/authored-guidance-v1.json`，源资料原有审批字段保持不变，派生包显式标记工程与 AI 辅助编辑审核、未获人工专家认证。V3职业ID已映射为Web ID。原始招聘统计、原文和薪酬等没有因为展示豁免进入该包。来源撤回后每请求重读，处理中响应与动作预览因摘要变化失效。

## 约束与恢复

- 每账号每固定 60 秒窗口最多 10 次、每固定 24 小时窗口最多 60 次请求；单进程全局并发 2、每账号并发 1。请求在校验失败时也可能消耗次数。这是请求额度，不是精确费用预算；多实例前须升级共享限流。
- 证据包共用 45000 UTF-8 字节预算；最终序列化用户消息另限 36000 字符与 70000 UTF-8 字节，计入 JSON 转义开销。超限时按完整条目省略，保留证据原文完整性；模型请求另有总大小限制。材料每项最多前 2000 字符，响应明确范围局限。
- 发送前和返回前重验会话与取消状态；返回前再次检查工作区 revision 和知识摘要。资料撤回、修改、账号删除、退出或知识撤回后，迟到回答被拒绝。
- 已经发给模型的输入不能靠本地撤回追溯收回；当前未建立供应商删除或留存协议，不能声称实现外部数据擦除。
- 没有知识与个人证据时直接返回信息缺口，不调用模型。引用 ID/结构错误、超时和服务失败明确返回错误，不使用模拟答案顶替成功。
- 不写请求正文日志、不新增对话存储或缓存。生产观测、反馈闭环和长期记忆尚待建设。

## 验证

`tests/agent-*.test.mjs` 覆盖批准知识、引用完整性、逐片段授权、对象隔离、过期/撤回、取消/注销、输入预算、供应商失败及真实本地会话/CSRF接口。模型 HTTP 均使用注入测试桩，不代表真实 DeepSeek 或人工职业质量评估。最终结果见 `../../checks/AI接入基线_20261028/`。

最终提示词为 `career-readonly-v4`。结构、引文和有限个人来源属性守卫拒绝不合格结果；若存在长度合规的获准公共原文，只返回明确标注的系统原文回退，不展示被拒绝的模型正文、不生成个人结论、不自动重试。没有公共原文则继续报错。真实模型仍有语义错误风险；真人学生测试与独立内容复核尚未执行，生产上线仍需用户确认。

环境工厂默认采用空试用名单，`AI_ENABLED=1` 本身不会向所有账户开放；仅明确配置 `AI_ACCESS_MODE=all` 才是全体账户模式，当前未批准该模式。请求与能力状态都按登录用户检查，不信任客户端owner字段。站内分析可通过 `claimRefs` 独立选择片段，不要求外发授权。偏好不外发；材料确认、外发同意、试用资格和重要写入确认是四种不同控制。

`GET /api/agent/knowledge-status` 返回当前公共知识摘要。已保存知识回答、笔记和旧版本依据摘要控制展示；前端加载/聚焦时检查，可见期间每60秒复查。该状态不作为账户资料持久保存；检查失败先隐藏，引用撤回不能靠旧缓存继续展示。服务端应用动作和回答反馈同样核对摘要。旧的无知识来源摘要笔记保守隐藏，提示重新核对；不自动迁移或重写原文。
