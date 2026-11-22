# 三任务页的实现对应图

本图为实现结构说明；原三张待实现效果图在 `concepts/`，实拍在 `actual/`，不互相冒称。

```mermaid
flowchart LR
  Home[AI工作台首页] --> Next[下一步任务页]
  Home --> Compare[双职业比较页]
  Home --> Expression[单件成果表达页]
  Next --> N[原目标 / 临时时间 / 1至3项原任务]
  Compare --> C[两方公开资料 / 同维对照 / 可选本人材料]
  Expression --> E[作品身份 / 明确片段 / 用途与未核对自述]
  N --> D[共享讨论与本次资料]
  C --> D
  E --> D
  D --> Scope[站内核对 / 本次外发授权 / 有限追问]
  Scope --> Draft[建议或明确手动稿 / 来源绑定]
  Draft --> Plan[原计划编辑与影响预览]
  Draft --> Assessment[原评估候选编辑与影响预览]
  Plan --> Confirm[本人确认 / 原业务校验 / 幂等应用]
  Assessment --> Pending[仍待本人确认]
  Pending --> Reports[确认材料进入报告与简历]
  Confirm --> Back[返回原任务讨论身份]
```

- 下一步与表达：准备区330px、较窄桌面300px，右侧单列讨论；不常驻三栏。
- 比较：两方与关注点在上，同维资料在中，讨论在下；英文维度列160px以保留完整词。
- 共享暖白、浅蓝、深蓝与黄色发送键，原角色、全站导航、真实登录及Tutor结构保留。
- 身份状态属于讨论记录；来源正文由服务端重建，用户假设不替代真实业务记录。
