import {source, tree, branch, leaf, check} from './definitions.mjs';

const swe = source('IEEE Computer Society', 'SWEBOK Guide', 'https://www.computer.org/education/bodies-of-knowledge/software-engineering', 'v4.0');
const http = source('IETF / RFC Editor', 'HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110.html', 'RFC 9110');
const api = source('OpenAPI Initiative', 'OpenAPI Specification', 'https://spec.openapis.org/oas/latest.html');
const keys = source('PostgreSQL', 'Constraints', 'https://www.postgresql.org/docs/current/ddl-constraints.html');
const tx = source('PostgreSQL', 'Transactions', 'https://www.postgresql.org/docs/current/tutorial-transactions.html');
const explain = source('PostgreSQL', 'Using EXPLAIN', 'https://www.postgresql.org/docs/current/using-explain.html');
const auth = source('OWASP', 'Authorization Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html');
const asvs = source('OWASP', 'Application Security Verification Standard', 'https://owasp.org/www-project-application-security-verification-standard/');
const safe = source('OWASP', 'SQL Injection Prevention Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html');
const retry = source('AWS Builders’ Library', 'Making retries safe with idempotent APIs', 'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/');
const testing = source('Spring Boot', 'Testing', 'https://docs.spring.io/spring-boot/reference/testing/index.html');
const telemetry = source('OpenTelemetry', 'Signals', 'https://opentelemetry.io/docs/concepts/signals/');
const mvc = source('Spring Framework', 'Spring MVC request validation', 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html');

export default tree('backend', [swe, http, asvs], [
  branch('api', ['接口与业务规则', 'APIs and business rules'], ['把请求、响应和状态变化写成可验证的服务契约。', 'Define verifiable contracts for requests, responses and state changes.'], [
    leaf('http-semantics', ['HTTP 与状态码', 'HTTP and status codes'], [http],
      ['区分安全与幂等语义。明确成功、输入无效、未认证和无权限各自的响应。', 'Distinguish safety and idempotency. Specify success, invalid input, unauthenticated and forbidden outcomes.'],
      ['为读取与创建订单写两条接口说明，补上未登录、无权限和找不到记录时的行为。', 'Specify read and create endpoints and behavior for unauthenticated, forbidden and missing resources.'], [
      check(['未提供需要的有效登录凭据，通常返回什么？','401','201','409','401 表示缺少有效的身份验证凭据。'], ['Required valid credentials are missing. What status normally applies?','401','201','409','401 means valid authentication credentials are missing.']),
      check(['符合 HTTP 语义的 GET 应有什么性质？','读取为预期语义，不由调用者请求改变资源状态','每次调用都创建新订单','由于可缓存，所以应执行退款','安全方法的请求语义面向读取。'], ['What is expected of a conforming GET request?','It is intended to read, without a client-requested state change','It creates a new order each time','It should refund because it is cacheable','Safe methods have read-oriented request semantics.'])
    ]),
    leaf('api-contract', ['OpenAPI 与错误契约', 'OpenAPI and error contracts'], [api, http],
      ['为路径、参数、正文、响应状态和安全要求声明结构，并提供示例。', 'Declare paths, parameters, bodies, response statuses and security requirements with examples.'],
      ['为订单查询写一个 OpenAPI 片段，分别声明成功、缺失对象和校验失败的结构。', 'Write an OpenAPI fragment for order lookup with success, missing object and validation-error schemas.'], [
      check(['怎样让调用方知道缺字段会返回什么？','在操作中定义对应状态、错误结构与示例','只描述正常响应','让调用方观察线上报错猜测','错误响应是公开契约的一部分。'], ['How should callers know what a missing field returns?','Declare the status, error schema and example','Document success only','Ask callers to infer from production failures','Errors belong in the public contract.']),
      check(['订单编号出现在 /orders/{id}，应怎样声明？','声明必需的路径参数及其类型','写成可选响应头','仅出现在请求体示例里','路径模板占位符与操作路径参数相对应。'], ['How should /orders/{id} describe the order ID?','A required path parameter with a type','An optional response header','Only in a sample request body','Path placeholders correspond to required path parameters.'])
    ]),
    leaf('service-structure', ['Java 服务分层', 'Java service boundaries'], [mvc, swe],
      ['以 Java 和 Spring MVC 为例，请求对象校验字段形状，服务层处理订单规则，持久层负责数据读写。将订单规则留在服务中，可以在批处理和 HTTP 请求中共用。', 'In Java with Spring MVC, validate request fields at the boundary, apply order rules in the service and read or write in the persistence layer. A batch job can reuse the same order rules as the HTTP endpoint.'],
      ['写出创建订单的请求对象、控制器、服务和数据接口骨架。分别测试数量无效与库存不足，并确认拒绝时没有新增订单。', 'Sketch a request object, controller, service and data interface for order creation. Test invalid quantity and insufficient stock and verify neither failure inserts an order.'], [
      check(['HTTP 创建订单和批量导入都必须拒绝库存不足的订单。规则放在哪里？','两个入口共同调用的订单服务','仅放在控制器校验注解里','让两个客户端各自判断后提交','服务层可为多个入口一致执行领域规则。'],
        ['Both HTTP order creation and batch import must reject insufficient stock. Where should that rule live?','In the order service both entry points call','Only in controller validation annotations','In each client before it submits','The service enforces a shared business rule across entry points.']),
      check(['Spring MVC 的请求对象数量必须大于零。怎样在调用服务前发现错误？','在字段上声明正数约束并校验请求对象','只给对象加 @Valid，无需字段约束','先执行保存，再由控制器发现无效数量','字段约束给出校验规则，入口触发请求对象校验。'],
        ['A Spring MVC request quantity must be positive. How can invalid input be caught before service execution?','Declare a positive field constraint and validate the request object','Use @Valid with no field constraint','Persist first and check the quantity afterward in the controller','The field declares the rule and the boundary triggers validation.'])
    ]),
    leaf('state-rules', ['业务状态与幂等', 'State transitions and idempotency'], [retry, swe],
      ['列出合法的状态转换，约束并行更新；重复请求应能辨认同一业务操作。', 'Define allowed state transitions, constrain concurrent writes and identify retries of the same operation.'],
      ['画待付款、已付款、已取消的状态表，写清并发支付和取消时的检查及冲突结果。', 'Map pending, paid and canceled order states and define how concurrent payment and cancel conflict.'], [
      check(['支付请求超时，客户端不知是否成功。怎样安全重试？','重发同一幂等键和同一操作参数','每次换新键当作另一笔支付','把所有超时视为未执行并无条件重发','同一键可识别结果未知的重复提交。'], ['A payment times out with unknown outcome. How can the client retry safely?','Resend the same idempotency key and operation parameters','Use a new key for a new payment each time','Treat every timeout as no execution and resend unconditionally','A stable key identifies retries of the same operation.']),
      check(['支付与取消并发更新同一待付款订单，服务端应怎么做？','原子检查前置状态，只有合法转换成功','依赖前端按钮互斥','允许两个请求独立覆盖最终状态','服务端需保护状态转换及其并发条件。'], ['Payment and cancel race on one pending order. What should the server do?','Atomically check the prior state and allow only a valid transition','Rely on mutually exclusive UI buttons','Let both requests overwrite the state independently','The server must protect the transition under concurrency.'])
    ])
  ]),
  branch('data', ['数据与事务', 'Data and transactions'], ['用数据约束保护一致性，用执行计划定位查询代价。', 'Protect consistency with constraints and inspect query plans for cost.'], [
    leaf('schema-constraints', ['关系模型与约束', 'Relational design and constraints'], [keys],
      ['主键识别行，外键维护引用，唯一和检查约束表达数据不变量。', 'Primary keys identify rows, foreign keys protect references and unique or check constraints encode invariants.'],
      ['设计订单、明细和商品三张表的主外键、数量范围和唯一性。', 'Design keys, quantity bounds and uniqueness for orders, lines and products.'], [
      check(['要阻止订单明细引用不存在的订单，使用什么？','明细订单号的外键','给订单表增加注释','只在界面隐藏无效选项','外键保证引用对应的记录存在。'], ['What prevents a line from referencing a nonexistent order?','A foreign key on its order ID','A table comment','Hiding invalid choices in the UI','A foreign key enforces the referenced record.']),
      check(['数量必须大于 0，空值也不允许。如何约束？','NOT NULL 与 CHECK(quantity > 0)','只给字段加默认值','只创建非唯一索引','非空和值域约束分别处理两类非法输入。'], ['Quantity must be positive and non-null. What fits?','NOT NULL plus CHECK(quantity > 0)','A default value only','A non-unique index only','Presence and allowed values need separate constraints.'])
    ]),
    leaf('atomicity', ['事务与并发更新', 'Transactions and concurrency'], [tx],
      ['事务保证相关写入一起提交或撤销。并发写入要处理冲突和不变量。', 'Transactions commit or roll back related writes together. Concurrent updates must respect invariants.'],
      ['画库存扣减与订单落库的事务，写中途出错和最后一件商品并发购买的检查。', 'Plan a transaction for stock and order writes. Check mid-flight errors and concurrent purchase of the last item.'], [
      check(['扣库存成功、插入订单失败，应如何保持状态？','同一事务回滚两次写入','保留库存扣减，稍后手动补订单','在页面提示成功以避免重试','相关状态变化需要原子提交。'], ['Stock decrements but order insert fails. How should consistency be preserved?','Roll both writes back in the transaction','Keep the decrement and manually add an order later','Show success to prevent retry','Related state changes need atomic commit.']),
      check(['两人同时购买最后一件，怎样更可靠？','在数据库中使用有库存条件的原子更新并检查结果','先普通读取数量，再无条件写入','用网页计时器错开请求','原子条件更新可以避免读后写竞争。'], ['Two people buy the last item simultaneously. What is reliable?','Use an atomic database update conditioned on available stock and check its result','Read stock and then write unconditionally','Space requests using a web timer','A conditional atomic update avoids the read-then-write race.'])
    ]),
    leaf('query-plan', ['索引与查询计划', 'Indexes and query plans'], [explain],
      ['用执行计划看访问方式和估计行数，结合数据量与筛选比例评估索引。', 'Read access methods and row estimates and assess indexes against volume and selectivity.'],
      ['比较按订单号查一行和按大范围日期查多行的计划，解释各自访问路径。', 'Compare plans for one order ID and for a wide date range and explain access methods.'], [
      check(['数据库对小表用顺序扫描，应该怎样判断？','结合数据规模和成本，顺序扫描可能更合适','一定存在缺陷，强制任何查询用索引','删掉所有索引','优化器会比较不同访问路径的估计成本。'], ['A small table uses a sequential scan. How should you interpret it?','It may be cheaper; consider volume and costs','Always force an index','Drop every index','The optimizer compares estimated access costs.']),
      check(['EXPLAIN ANALYZE 对有副作用的语句要注意什么？','它会实际执行语句，需要隔离或可回滚环境','它永远只做静态分析','它会自动撤销所有外部副作用','ANALYZE 会执行并收集实际运行信息。'], ['What matters for EXPLAIN ANALYZE on a statement with side effects?','It executes the statement; use an isolated or rollback-safe setting','It only performs static analysis','It automatically undoes all external effects','ANALYZE executes to gather actual runtime information.'])
    ])
  ]),
  branch('security', ['认证与安全边界', 'Authentication and security'], ['分开核对身份、资源权限和输入来源。', 'Check identity, resource permissions and untrusted input separately.'], [
    leaf('session-auth', ['会话生命周期', 'Session lifecycle'], [asvs, http],
      ['在服务端检查会话有效期与撤销状态。确保退出、权限变化和密码重置行为明确。', 'Verify expiry and revocation server-side. Specify logout, privilege changes and reset behavior.'],
      ['给模拟 API 写过期、登出、重新登录三种会话检查。', 'Specify expired, signed-out and newly signed-in session checks for a mock API.'], [
      check(['退出后同一令牌仍可使用，关键修复在哪里？','撤销服务端会话并在受保护请求校验','清除界面的姓名即可','修改按钮链接','受保护接口必须尊重会话的撤销状态。'], ['A token still works after logout. What is the key fix?','Revoke the server session and check it on protected requests','Only clear the displayed name','Change the button link','Protected endpoints must respect revocation.']),
      check(['已认证的用户访问未授权对象，说明什么？','认证成功仍需独立做资源授权','认证失败，应重置所有密码','可以默认开放该对象','身份是谁与允许做什么是两个判断。'], ['An authenticated user requests an unauthorized object. What follows?','Authentication still needs a separate authorization check','Reset all passwords because authentication failed','Allow the object by default','Identity and permission are separate decisions.'])
    ]),
    leaf('object-authorization', ['对象访问控制', 'Object authorization'], [auth],
      ['每次请求按主体、操作和资源做授权。测试本人、他人和受限角色。', 'Authorize each request by subject, action and resource. Test own, other and restricted-role access.'],
      ['为读取和取消订单写权限矩阵，覆盖归属和客服只读。', 'Write a permission matrix for order reading and cancellation, including owner and read-only support.'], [
      check(['用 UUID 替代连续订单号，是否足以修复越权？','不够，服务端必须检查归属与操作权限','足够，UUID 无法在任何地方泄漏','足够，只要页面隐藏链接','难猜 ID 不能替代对象权限。'], ['Does switching sequential order IDs to UUIDs fix unauthorized access?','No; the server must verify ownership and action permission','Yes; UUIDs cannot leak','Yes if links are hidden','Hard-to-guess IDs do not replace authorization.']),
      check(['权限规则异常、无法判定时，应如何处理？','默认拒绝并留下可诊断记录','默认允许减少报错','切换成管理员身份重试','默认拒绝可避免在未知状态放大权限。'], ['Authorization cannot be determined because of an error. What should happen?','Deny by default and log a diagnosable event','Allow by default to reduce errors','Retry as an administrator','Failing closed avoids privilege expansion during uncertainty.'])
    ]),
    leaf('validation', ['输入校验与安全查询', 'Validation and safe queries'], [safe, asvs],
      ['在可信边界校验类型、长度和值域。数据库查询绑定参数，错误响应保留必要信息。', 'Validate type, length and bounds at the trust boundary. Bind database parameters and return appropriate error details.'],
      ['为按名称查询接口写允许字段、边界和参数绑定示例，定义对非法筛选的响应。', 'Specify allowed filters and bounds, parameter binding and error behavior for a name-search endpoint.'], [
      check(['应怎样将名称作为 WHERE 的值？','通过查询参数绑定','直接拼接字符串','用客户端正则替代服务端绑定','参数绑定将数据值和查询结构分开。'], ['How should a name be used as a WHERE value?','Bind it as a parameter','Concatenate it as a string','Replace server binding with client regex','Binding separates values from query structure.']),
      check(['数据库错误包含内部路径与 SQL。如何对外返回？','给客户端稳定错误码，详细信息留在受控日志','原样返回所有数据库详情','所有失败都返回成功','面向客户端的契约不需要泄漏内部实现。'], ['A database error includes paths and SQL. What should the client receive?','A stable error code; keep details in controlled logs','The raw database error','Success for every failure','Public error contracts need not disclose internal implementation.'])
    ])
  ]),
  branch('operations', ['验证与可观测性', 'Verification and observability'], ['验证交互边界、受控重试与故障定位。', 'Verify integration boundaries, retries and diagnosability.'], [
    leaf('integration-tests', ['集成与契约测试', 'Integration and contract tests'], [testing, api],
      ['用集成测试覆盖存储、权限和错误映射。用契约检查生产者与消费者的结构一致。', 'Test persistence, authorization and error mapping in integration and check producer–consumer contracts.'],
      ['为创建订单写成功、非法输入、跨账号请求和重复提交的集成检查。', 'Write integration cases for create success, invalid input, another account and replay.'], [
      check(['想验证数据库唯一约束真的生效，哪种检查最可靠？','用隔离测试库尝试重复写入并断言错误与剩余记录','只在测试中 mock 数据库并回固定成功','仅核对文档有写约束','实际存储边界的行为需集成验证。'], ['How do you verify a unique constraint is enforced?','Attempt a duplicate write in an isolated test DB and check the error and remaining rows','Mock the database to always succeed','Check that the constraint appears in docs','Storage behavior needs an integration check.']),
      check(['客户端依赖响应的 total，服务端改名。什么检查可及早发现？','消费者契约或接口结构测试','只测服务进程能启动','只比较 SQL 执行耗时','契约测试能发现外部可见的响应变化。'], ['A consumer expects total and the server renames it. What catches this?','A consumer contract or API schema test','Only a process startup check','Only compare query timings','Contract checks surface public response changes.'])
    ]),
    leaf('timeouts-retry', ['超时与重试边界', 'Timeout and retry limits'], [retry, http],
      ['区分暂时故障和永久失败，设置时间预算、退避与最大尝试。重试写入需要幂等。', 'Separate temporary from permanent failures and set deadlines, backoff and attempt limits. Retried writes need idempotency.'],
      ['为一个外部依赖定义错误类别、请求超时和总重试窗口。', 'Define error classes, request timeouts and a total retry window for a dependency.'], [
      check(['服务返回明确的请求字段不合法，自动重试有用吗？','先修正输入，重复同一无效请求无益','立即无限重试','每次减少字段直到成功','永久输入错误需要改变请求。'], ['A service rejects an invalid request field. Should it be retried automatically?','Correct the input first; replaying the same invalid request does not help','Retry forever immediately','Drop fields until something succeeds','Permanent input errors need a changed request.']),
      check(['短时故障时很多客户端同时重试，怎样减小拥塞？','有上限的退避并加随机抖动','都在固定同一时刻重试','不限制重试总耗时','抖动可分散同步重试，限制保护服务。'], ['How can many clients avoid synchronized retry congestion?','Use bounded backoff with jitter','Retry at the same fixed instant','Never cap total retry time','Jitter spreads synchronized retries; limits protect the service.'])
    ]),
    leaf('service-telemetry', ['服务日志与链路追踪', 'Service logs and tracing'], [telemetry],
      ['用结构化日志定位请求，结合指标、追踪与请求标识。敏感值在采集前过滤。', 'Use structured logs with metrics, traces and request IDs. Filter sensitive values before collection.'],
      ['为模拟订单 API 设计一次失败的请求 ID、日志字段和关联追踪。', 'Design a request ID, logging fields and a correlated trace for a failed order request.'], [
      check(['要跨服务定位同一次失败，应共享什么？','追踪或请求关联标识','完整用户密码','各进程随机文件名','共同标识允许跨服务关联证据。'], ['What helps locate the same failed request across services?','A shared trace or correlation ID','The full user password','Random log file names','A shared identifier links evidence across services.']),
      check(['接口失败率升高，先需要哪些观测？','请求数、错误数、时间窗口及相关请求样例','一条没有时间的错误文字','只看上一次部署作者','计数、时间与样例支持复算和定位。'], ['API error rate increases. What evidence is useful first?','Request and error counts, time window and representative requests','One error with no timestamp','The author of the last deploy only','Counts, time and examples support reproduction and diagnosis.'])
    ])
  ])
]);

