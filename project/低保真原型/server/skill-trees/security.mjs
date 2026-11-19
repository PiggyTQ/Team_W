import {source, tree, branch, leaf, check} from './definitions.mjs';

const nice = source('NIST', 'NICE Workforce Framework for Cybersecurity', 'https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center', 'SP 800-181 Rev. 1');
const dns = source('IETF / RFC Editor', 'Domain names: concepts and facilities', 'https://www.rfc-editor.org/rfc/rfc1034.html', 'RFC 1034');
const tls = source('IETF / RFC Editor', 'The Transport Layer Security Protocol', 'https://www.rfc-editor.org/rfc/rfc8446.html', 'TLS 1.3');
const asvs = source('OWASP', 'Application Security Verification Standard', 'https://owasp.org/www-project-application-security-verification-standard/', 'ASVS');
const threat = source('OWASP', 'Threat Modeling', 'https://community.owasp.org/Threat_Modeling');
const authz = source('OWASP', 'Authorization Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html');
const injection = source('OWASP', 'SQL Injection Prevention Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html');
const secrets = source('OWASP', 'Secrets Management Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html');
const identity = source('NIST', 'Digital Identity Guidelines: Authentication', 'https://pages.nist.gov/800-63-4/sp800-63b.html', 'SP 800-63B-4');
const logging = source('ASD ACSC and partners', 'Best practices for event logging and threat detection', 'https://www.cyber.gov.au/publication/best-practices-for-event-logging-and-threat-detection');
const logon = source('Microsoft Learn', 'Windows Audit Logon', 'https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/audit-logon');
const response = source('NIST', 'Incident response recommendations', 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf', 'SP 800-61 Rev. 3');
const advisory = source('CISA, NSA, FBI and partners', 'Joint advisory AA24-038A', 'https://www.cyber.gov.au/advisory/prc-state-sponsored-actors-compromise-and-maintain-persistent-access-to-us-critical-infrastructure');

export default tree('security', [nice, asvs, response], [
  branch('foundations', ['网络与授权边界', 'Network and scope'],
    ['看清请求经过哪里、哪些信息受保护，以及检查的授权范围。', 'Trace requests, understand what is protected and define authorized scope.'], [
    leaf('network-path', ['DNS 与请求路径', 'DNS and request paths'], [dns, nice],
      ['把域名解析、传输连接和应用请求分开。一次失败要先定位发生在哪一层。', 'Separate name resolution, the transport connection and the application request. Locate the failing layer first.'],
      ['用离线记录画出客户端、DNS、反向代理与应用，标注每层能观察到的字段。', 'Sketch client, DNS, reverse proxy and application from offline records and label observable fields.'], [
      check(['DNS 已返回 IP，但 TCP 连接失败。哪层先查？','客户端到该地址的网络和端口连通性','先改应用的 JSON 响应','先调整 SQL 查询条件','解析已返回地址，失败发生在建立连接时。'],
        ['DNS returns an address but TCP connection fails. Where should you investigate first?','Network and port reachability from the client','Change the application’s JSON response','Change an SQL filter','Resolution returned an address; the observed failure is in connection setup.']),
      check(['浏览器显示 HTTP 403，至少可确认什么？','某个 HTTP 响应方已可达并返回拒绝','DNS 一定没有返回记录','请求一定已经执行了数据库写入','403 是 HTTP 响应，不能由它推出后端写入。'],
        ['What can you confirm when a browser receives HTTP 403?','An HTTP responder was reachable and refused the request','DNS definitely returned no record','The request definitely wrote to the database','403 is an HTTP response and does not imply a database write.'])
    ]),
    leaf('transport-trust', ['TLS 与传输信任', 'TLS and transport trust'], [tls],
      ['TLS 保护连接上的数据，并依赖正确的服务端身份验证。代理终止 TLS 后要重新看下一跳边界。', 'TLS protects a connection and relies on correct server authentication. Reassess the next hop after proxy termination.'],
      ['画出浏览器到网关、网关到服务的两段链路，标注哪里验证证书、哪里需要加密。', 'Draw browser-to-gateway and gateway-to-service links. Mark certificate checks and encryption needs.'], [
      check(['证书有效但签给另一个域名，应如何处理？','保留验证并修复域名或证书配置','接受任何有效证书继续连接','关闭主机名验证并记录即可','证书需要匹配客户端要访问的服务身份。'],
        ['A certificate is valid but issued for another hostname. What should you do?','Keep verification and correct the hostname or certificate','Accept any valid certificate','Turn off hostname verification and log it','The certificate must match the intended service identity.']),
      check(['TLS 在网关终止，后面走明文。浏览器侧的锁图标能证明什么？','浏览器到网关这一段受到 TLS 保护','所有内部链路都已加密','应用权限校验一定正确','加密保障只覆盖实际使用 TLS 的连接。'],
        ['TLS terminates at the gateway and the backend hop is plaintext. What does the browser lock establish?','The browser-to-gateway connection uses TLS','Every internal link is encrypted','Application authorization is correct','Encryption only covers the connections actually using TLS.'])
    ]),
    leaf('authorized-scope', ['测试范围与风险', 'Authorized testing scope'], [nice, threat],
      ['把资产、身份、动作、时间和停止条件写清。生产资产和真实账号要依据明确授权处理。', 'Record assets, identities, actions, timing and stop conditions. Treat production and real accounts according to explicit authorization.'],
      ['为离线报名系统拟一份检查范围，列出允许数据、排除系统、复核责任和停止条件。', 'Write a testing scope for an offline sign-up system: allowed data, excluded systems, owner and stop conditions.'], [
      check(['排查中发现共享的第三方域名，授权清单未包含它。下一步？','停止对该域名检查并请负责人核对范围','沿着依赖扩大扫描以确认问题','尝试测试账号即可继续','依赖关系本身不构成测试授权。'],
        ['A shared third-party domain is outside the authorized asset list. What next?','Stop testing it and ask the owner to confirm scope','Expand scanning to the dependency','Continue if using a test account','A dependency does not imply permission to test it.']),
      check(['练习中只需要判断访问控制，应使用什么数据？','隔离环境的合成账号和记录','生产用户的完整会话与密码','真实账号数据，经截图打码后保存原文件','合成数据足以验证这个练习的规则。'],
        ['Which data suits an exercise on authorization behavior?','Synthetic accounts and records in an isolated environment','Complete production sessions and passwords','Production accounts with blurred screenshots and saved raw originals','Synthetic data can test the rules without exposing real user records.'])
    ])
  ]),
  branch('identity', ['身份与访问控制', 'Identity and access'],
    ['核对身份、资源授权与密钥处理，保护系统权限边界。', 'Review identity, resource authorization and secrets handling.'], [
    leaf('authentication', ['身份验证与会话', 'Authentication and sessions'], [identity, asvs],
      ['验证身份后再创建会话；密码重置或权限变更要处理会话生命周期。', 'Establish sessions after authentication and manage their lifetime when credentials or privileges change.'],
      ['设计虚构门户的登录、退出、密码重置检查表，写出已注销会话再次访问时的预期。', 'Design checks for sign-in, sign-out and password reset, including requests after a session is revoked.'], [
      check(['用户退出后，原会话令牌还能在另一设备调用接口。关键缺陷是什么？','服务端会话未撤销或未校验撤销状态','按钮缺少确认样式','用户标识长度太短','退出需要落实到服务端的会话有效性。'],
        ['After logout, an old session token still works on another device. What is the key defect?','Server-side session invalidation is missing or not checked','The button lacks confirmation styling','User IDs are too short','Logout needs to affect server-side session validity.']),
      check(['哪一种措施提高对钓鱼的抵抗力？','采用与网站来源绑定的公钥凭据','要求定期更换相似密码','将密码提示写在登录页上','与网站来源绑定的认证可阻止凭据在仿冒站点被重用。'],
        ['Which measure improves resistance to phishing?','Use an origin-bound public-key credential','Require periodic changes to similar passwords','Show password hints on the sign-in page','Origin binding helps prevent the credential from being used by an impersonating site.'])
    ]),
    leaf('authorization', ['资源授权与最小权限', 'Resource authorization'], [authz, asvs],
      ['服务端逐次验证主体、动作与资源。默认拒绝，分别测横向越权和角色越权。', 'Check subject, action and resource on the server for each request. Default to deny and test horizontal and vertical boundaries.'],
      ['给模拟订单 API 写权限矩阵，覆盖本人订单、他人订单与客服只读角色。', 'Write an access matrix for a mock order API, covering owned orders, other users’ orders and a read-only support role.'], [
      check(['普通用户改 URL 中订单号后可读别人订单，优先补哪里？','服务端校验订单归属与操作权限','在页面上把编号加长','只在菜单隐藏订单链接','对象访问控制需要由服务端按对象核对。'],
        ['Changing an order ID exposes another user’s order. Where is the primary fix?','Check ownership and operation permissions on the server','Make the visible ID longer','Hide order links from the menu','Object access must be checked server-side.']),
      check(['客服只需看状态，哪项授权更合适？','给状态只读权限，并限制资源范围','给所有订单编辑权限备用','和管理员共用账号','最小权限同时约束操作类型和资源范围。'],
        ['Support agents only need order status. Which grant is appropriate?','Read-only status access to a limited scope','Edit all orders in case it is needed','Share the administrator account','Least privilege constrains both actions and resources.'])
    ]),
    leaf('secrets', ['密钥保管与轮换', 'Secret storage and rotation'], [secrets],
      ['密钥应受访问控制和审计。泄漏后先撤销或轮换，再核对影响和历史副本。', 'Protect secrets with access controls and audit. On exposure, revoke or rotate and review impact and retained copies.'],
      ['为两个模拟服务列出凭据存放、访问主体、轮换顺序与旧凭据失效验证。', 'Specify storage, access, rotation order and invalidation checks for two mock services.'], [
      check(['一把有效密钥误提交到公开仓库。仅删文件够吗？','先撤销或轮换并排查使用记录，然后处理历史暴露','删掉当前文件即可继续使用原密钥','只把仓库改成私有，密钥永不更换','已有泄漏无法通过修改当前文件收回。'],
        ['An active secret was committed to a public repository. What should you do?','Revoke or rotate it, investigate use and address exposed history','Delete the current file and keep using the secret','Make the repo private and never rotate the secret','Editing the latest file does not undo exposure.']),
      check(['两个环境共用一把管理员密钥，怎样减小影响范围？','用独立受限身份和凭据，按环境隔离','复制到更多备份以方便调用','改用一个更长的共享密钥并继续共用','隔离身份和权限才能缩小暴露范围。'],
        ['Two environments share one administrator secret. What reduces blast radius?','Use separate restricted identities and credentials per environment','Copy it to more backups for convenience','Use a longer key but continue sharing it','Isolation of identity and permission reduces the scope of exposure.'])
    ])
  ]),
  branch('detection', ['检测与事件响应', 'Detection and response'],
    ['归并多来源证据，区分观察与解释，并给出可复核的升级决定。', 'Correlate evidence across sources, distinguish observation from explanation and make a reviewable escalation.'], [
    leaf('event-logs', ['日志时间与关联', 'Event time and correlation'], [logging, logon],
      ['保留原时区与事件时间。关联身份、来源、目标、会话及事件类型，标明缺口。', 'Preserve time zones and event timestamps. Correlate identity, source, target, session and event type and record gaps.'],
      ['给四行合成登录日志统一 UTC，用会话字段关联，说明无法关联的行。', 'Normalize four synthetic login records to UTC, correlate by session and explain unmatched rows.'], [
      check(['09:10 UTC+08:00 对应的 UTC 时间是什么？','01:10','17:10','09:10','换到 UTC 要减去八小时。'],
        ['What is 09:10 UTC+08:00 in UTC?','01:10','17:10','09:10','Subtract eight hours to convert to UTC.']),
      check(['Windows 安全日志的 4624 与 4625 分别记录什么？','登录成功与登录失败','两个都是登录成功','权限提升与进程启动','这两个事件分别表示成功与失败的登录。'],
        ['What do Windows Security events 4624 and 4625 record?','Successful and failed logon, respectively','Two successful logons','Privilege escalation and process creation','They describe logon success and failure, respectively.'])
    ]),
    leaf('triage', ['异常分诊与交叉复核', 'Alert triage'], [logging, advisory],
      ['警报是线索。查已知变更、目标与来源，比较替代解释和采集缺口。', 'Treat alerts as clues. Compare known changes, targets, sources, alternate explanations and collection gaps.'],
      ['一段离线日志含多次失败与一次成功。列出正常维护和异常访问的分别证据。', 'Review offline failed logons followed by success. List evidence for maintenance and for suspicious access.'], [
      check(['同一账号有多次失败后一次成功。可以直接宣布什么？','观察到一组需复核的活动，尚需来源与授权证据','已证明账号被攻陷','已证明是用户误输密码','结果要保留不同解释，并核对更多证据。'],
        ['Several failed logons precede a success for the same account. What can be stated?','The pattern warrants review; source and authorization need evidence','The account is proven compromised','The user is proven to have mistyped a password','Keep alternatives open and seek corroboration.']),
      check(['变更单覆盖 A 主机和一个管理地址，异常来自 B 主机和另一地址。怎么处理？','记录不匹配并继续核对 B 事件','看到同一个账号就认定全部为维护','删除 B 记录以免重复','要核对实际资产、来源和时间是否匹配。'],
        ['A change record covers host A and one admin address, but the alert involves host B and a different address. What follows?','Record the mismatch and investigate the B event','Treat it as maintenance because the account matches','Delete the B record as a duplicate','Match the actual assets, sources and times.'])
    ]),
    leaf('incident-handoff', ['事件升级与交接', 'Incident escalation'], [response, nice],
      ['交接时区分已知、推断与未知，列出证据、影响、应急动作、授权和下一次更新。', 'Handoff distinguishes facts, inference and unknowns, with evidence, impact, authorized actions and next update.'],
      ['为模拟值班交接写事件摘要，带行号、受影响范围、待核实事项及负责人。', 'Write a mock incident handoff with row references, impact, open questions and owner.'], [
      check(['哪项交接最便于二线复核？','列出时区、日志行号、假设和待验证的下一步','仅说“疑似严重，尽快处理”','填一个无证据的攻击者姓名','交接需要可定位的证据和可执行的后续。'],
        ['Which handoff is most useful to the next responder?','Time zone, log references, hypotheses and a specific next check','“Probably serious, handle ASAP”','An attacker’s name without evidence','A handoff needs retrievable evidence and an actionable next step.']),
      check(['需要临时限制访问时，应先明确什么？','批准主体、影响范围、验证和回退条件','是否可以省略审批以提高速度','只需把动作写进总结','限制访问是有影响的动作，需要清楚的职责和条件。'],
        ['Before restricting access temporarily, what should be explicit?','Approver, impact, verification and rollback conditions','Whether to bypass approval for speed','Only how to phrase it in the summary','Containment changes access and needs clear authority and conditions.'])
    ])
  ], 'log'),
  branch('application', ['应用安全', 'Application security'],
    ['画出信任边界，用验证标准检查输入、权限和复测证据。', 'Map trust boundaries and verify inputs, permissions and retests against explicit controls.'], [
    leaf('threat-model', ['信任边界与威胁建模', 'Trust boundaries and threats'], [threat, asvs],
      ['从数据流、资产和信任边界识别风险。每个风险要能对应验证或缓解措施。', 'Use data flows, assets and trust boundaries to identify risks. Tie each threat to a verification or mitigation.'],
      ['画出模拟文件上传的浏览器、接口、处理器和存储边界，标注三项要验证的控制。', 'Map a mock upload flow and mark three controls to verify between browser, API, processor and storage.'], [
      check(['文件由浏览器进入处理服务，首要边界判断是什么？','客户端输入属于低信任，服务端需验证类型、大小与权限','有文件扩展名就能直接信任内容','使用 HTTPS 后服务端无需处理文件风险','传输保护不能替代对输入和权限的检查。'],
        ['A browser uploads a file to a processor. What boundary matters first?','Client input is untrusted; validate type, size and authorization on the server','Trust the content based on its extension','HTTPS removes upload risks from the server','Transport protection does not replace input and authorization controls.']),
      check(['威胁模型最有用的后续是什么？','把具体威胁连到控制和可验证用例','把所有威胁标为高风险后结束','只画一张系统宣传图','可检验的缓解措施使模型影响工程工作。'],
        ['What makes threat modeling actionable?','Link specific threats to controls and verifiable cases','Mark every threat high and stop','Produce a marketing diagram only','Testable mitigations connect the model to engineering.'])
    ]),
    leaf('safe-input', ['输入校验与查询安全', 'Input and query safety'], [injection, asvs],
      ['为输入明确格式与范围。查询用参数绑定；动态列名使用受控映射。', 'Specify input format and bounds. Bind query parameters and map dynamic column names to an allowlist.'],
      ['为离线搜索接口设计普通文本、特殊字符和非法排序字段的检查。', 'Design offline search checks for ordinary text, special characters and invalid sort fields.'], [
      check(['用户搜索词要进入 SQL WHERE 条件，首选哪种？','使用查询参数绑定','把原字符串拼接进 SQL','删除输入里的一个引号后拼接','参数绑定把查询结构与用户数据分开。'],
        ['How should a search term be used in a SQL WHERE clause?','Use a bound parameter','Concatenate the raw string into SQL','Remove one quote and concatenate','Parameter binding separates query structure and data.']),
      check(['排序列不能当作值参数绑定时，怎么处理？','将公开排序名映射到预定义列','把用户输入作为 SQL 标识符直接插入','若字符串不为空就允许','受控列映射将结构性输入限制在已知范围。'],
        ['If an ORDER BY column cannot be bound as a value, what should you do?','Map public sort names to predefined columns','Insert raw input as an SQL identifier','Allow any nonempty string','An allowlist limits structural input to known identifiers.'])
    ]),
    leaf('verify-control', ['安全验证与回归', 'Security verification and regression'], [asvs, authz],
      ['把控制转为有预期的测试。记录版本、身份、步骤、结果和复测边界。', 'Turn a control into a test with a specific expected result. Record version, identity, steps and retest scope.'],
      ['为订单授权修复制定允许与拒绝的用例，列明复现环境与输出证据。', 'Design allowed and denied cases for an order authorization fix and identify environment and evidence.'], [
      check(['修复横向越权后应该同时验证什么？','本人访问仍成功，跨账号访问被拒绝','只确认返回了任意 HTTP 状态','仅验证管理员页面能打开','回归同时验证允许路径与禁止路径。'],
        ['What should you verify after fixing horizontal access control?','Owners can still access their records and other accounts are denied','Any HTTP status is returned','The administrator’s homepage still opens','Regression should cover both allowed and denied paths.']),
      check(['只测试了测试环境 API 的两个角色，记录应怎样写？','写清版本、角色、端点与测试结果，其他范围待核对','声明所有环境所有角色已安全','把未执行的测试标成通过','结论应对应实际测试范围。'],
        ['Only two roles were tested on a staging API. What should the record say?','Record version, roles, endpoints and results, with remaining scope open','Declare every role in every environment secure','Mark unrun checks as passed','Conclusions should stay within executed coverage.'])
    ])
  ])
]);

