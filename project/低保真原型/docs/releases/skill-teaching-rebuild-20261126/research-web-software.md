# 前端、后端、软件开发教学内容来源说明

本轮为 `src/skill-teaching/web-software.json` 编写 37 课：前端 12、后端 13、通用软件开发 12。课程 key 与现有 `skill-depth.json` 对应，保留原技能名称和技能树关系。

每课补充两个概念或因果解释、自足的合成输入、至少三步带中间结果的示范、错误原因与修正、有逐选项反馈的微型练习，以及开放迁移任务和人工自查标准。微型练习与最终检验职责分开；开放任务的参考表达不等于唯一答案，也不宣称系统已自动判对。案例为本轮原创合成教学情境，并非官方原题或真实项目执行记录。

## 本轮直接复核的一手资料

| 资料 | 用于核对的教学边界 |
| --- | --- |
| [MDN：button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button)、[min-width](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/min-width)、[Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) | 表单按钮职责、布局收缩、HTTP 错误响应与请求异常的区别。 |
| [WAI APG：模态对话框](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 进入焦点、键盘循环、关闭后焦点恢复；不把模态焦点约束推广到所有弹层。 |
| [React：状态结构](https://react.dev/learn/choosing-the-state-structure) | 避免重复派生状态，使用稳定标识并由当前集合计算展示内容。 |
| [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)、[Playwright 最佳实践](https://playwright.dev/docs/best-practices) | 锁文件与清洁安装、测试隔离、可访问定位和等待可观察状态。 |
| [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)、[OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) | HTTP 方法的安全性与幂等性、契约约束、缺省与空值区别。 |
| [PostgreSQL：约束](https://www.postgresql.org/docs/current/ddl-constraints.html)、[查询计划](https://www.postgresql.org/docs/current/using-explain.html) | CHECK 与 NOT NULL 的区别、查询计划估计和实际执行、EXPLAIN ANALYZE 的执行副作用。 |
| [OWASP：授权](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | 每请求、每对象与每动作授权，可信租户上下文和对象 ID 的组合检查。 |
| [Python：异常](https://docs.python.org/3/tutorial/errors.html)、[数据结构](https://docs.python.org/3/tutorial/datastructures.html)、[unittest](https://docs.python.org/3/library/unittest.html) | 类型化错误、集合与列表职责、可验证的预期值和边界用例。复杂度论述使用通常的散列集合平均情形，不承诺固定运行时间。 |
| [Pro Git：分支合并](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)、[GitHub：评审](https://docs.github.com/en/pull-requests/reference/pull-request-reviews)、[Semantic Versioning](https://semver.org/) | 合并后的行为检查、具体可行动的反馈、稳定公共 API 的兼容性与版本策略。 |

此外，逐课 `sourceUrls` 保留既有技能资料中的官方来源。保留链接不表示本轮重新逐段审读了全部既有资料；上述表格标明本轮直接复核范围。正文为原创简述与合成案例，不长段复制来源，也不把文档可访问等同于素材可任意再分发。

## 本轮数据核验与限制

- 精确覆盖现有 37 个 key，未漏课、未加入不存在的技能。
- 检查全部中英配对非空、每课至少三示范步骤、三个带纠错反馈的选项、两个开放任务自查条件，以及 HTTPS 来源链接。
- 微型练习正确选项分布为 a 13、b 12、c 12；题意和反馈保持一致。
- 本文件只记录课程数据结构检查与资料核对，不代表页面验收、代码运行、数据库实验、真实用户学习效果或能力认证已经完成。UI 集成与交互验收由主任务另行记录。
