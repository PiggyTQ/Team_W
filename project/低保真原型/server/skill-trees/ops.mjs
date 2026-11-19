import {source, tree, branch, leaf, check} from './definitions.mjs';

const sre = source('Google SRE', 'Site Reliability Engineering', 'https://sre.google/sre-book/table-of-contents/');
const ubuntu = source('Canonical', 'Ubuntu Server user management', 'https://ubuntu.com/server/docs/how-to/security/user-management/');
const http = source('IETF / RFC Editor', 'HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110.html', 'RFC 9110');
const images = source('Docker', 'Build overview', 'https://docs.docker.com/build/concepts/overview/');
const deploy = source('Kubernetes', 'Deployments', 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/');
const probes = source('Kubernetes', 'Liveness, readiness and startup probes', 'https://kubernetes.io/docs/concepts/workloads/pods/probes/');
const tf = source('HashiCorp', 'Terraform state', 'https://developer.hashicorp.com/terraform/language/state');
const observe = source('Google SRE', 'Monitoring distributed systems', 'https://sre.google/sre-book/monitoring-distributed-systems/');
const slo = source('Google SRE', 'Implementing SLOs', 'https://sre.google/workbook/implementing-slos/');
const canary = source('Google SRE', 'Canarying releases', 'https://sre.google/workbook/canarying-releases/');
const incidents = source('Google SRE', 'Incident response', 'https://sre.google/workbook/incident-response/');
const postmortem = source('Google SRE', 'Postmortem culture', 'https://sre.google/workbook/postmortem-culture/');

export default tree('ops', [sre, deploy], [
  branch('systems', ['系统与网络', 'Systems and networking'], ['定位进程、权限和请求故障的边界。', 'Locate failures in processes, permissions and the request path.'], [
    leaf('service-account', ['服务账号与权限', 'Service accounts and permissions'], [ubuntu],
      ['识别进程实际身份和所需权限，分别检查目录遍历与文件读写。', 'Identify the actual service identity and required access. Check directory traversal separately from file access.'],
      ['为离线日志处理服务列出运行账号、需要读取的目录和唯一可写位置。', 'Specify the account, readable directories and one writable location for an offline log processor.'], [
      check(['新服务读不到配置，首选排查？','核对服务运行身份与目录、文件权限','以 root 重启并保留该配置','把配置目录改为所有人可写','按实际身份核对最小所需权限。'], ['A service cannot read its config. Where do you start?','Check its runtime identity and directory/file permissions','Restart as root permanently','Make the config directory writable by everyone','Start with the identity and least access actually needed.']),
      check(['服务只需读配置，如何授予权限？','只给服务身份所需的读取与路径遍历权限','让服务拥有整个系统目录','共享管理员账户','区分读取、写入和目录遍历能力。'], ['The service needs to read a config. What access should it get?','Read and traversal access for the service identity as needed','Ownership of the whole system directory','A shared admin account','Separate read, write and traversal privileges.'])
    ]),
    leaf('http-diagnosis', ['请求链路与状态码', 'Request path and HTTP status'], [http, observe],
      ['从客户端到网关和应用逐段核对成功条件。代理错误与应用返回需用日志定位。', 'Check the path from client through proxy to application. Use logs to locate gateway and application errors.'],
      ['画一次请求的链路，并记录 DNS 失败、上游不可达和应用拒绝的可观察差异。', 'Map a request and note how DNS failure, unreachable upstream and application rejection differ.'], [
      check(['反向代理返回 502，哪项证据最先帮助缩小范围？','同时间的代理上游错误和服务健康信号','用户界面使用的字体','客户端代码行数','502 指向代理和上游之间的失败路径。'], ['A reverse proxy returns 502. What first narrows the issue?','Upstream errors and service health at the same time','The frontend font','Client source line count','A 502 points toward the gateway-to-upstream path.']),
      check(['只有浏览器请求失败，健康端点正常。怎么查？','用失败请求的路径、头和身份重现并比对网关日志','凭健康端点断言所有功能正常','用另一条完全无关请求代替','健康信号需要结合实际用户路径。'], ['A browser path fails while health is green. What next?','Reproduce the failing path, headers and identity and inspect gateway logs','Declare all functionality healthy','Substitute an unrelated request','Combine health signals with the actual user path.'])
    ]),
    leaf('signal-triage', ['资源信号与定位', 'Resource signals and diagnosis'], [observe],
      ['先看错误、延迟、流量和饱和度，再区分触发因素、瓶颈与用户影响。', 'Start with errors, latency, traffic and saturation, then separate triggers, bottlenecks and impact.'],
      ['对一段 CPU、请求量和 5xx 记录建立时间线，说明还需要哪些对照。', 'Build a timeline from CPU, traffic and 5xx observations and specify a comparison.'], [
      check(['CPU 在 85%，错误和延迟无变化。可以判断什么？','出现高利用率信号，需看饱和及用户影响','所有请求已失败','CPU 就是已确认的根因','单一资源信号不能确定用户影响或根因。'], ['CPU is 85% and errors/latency are stable. What can you say?','Utilization is high; investigate saturation and user impact','Every request has failed','CPU is the confirmed root cause','A resource signal alone cannot establish impact or cause.']),
      check(['错误率升高与流量骤降同时出现，应先核对什么？','错误和请求的绝对数、有效分母及采集状态','只比较两天的总流量','移除错误较多的时间窗','分母过小时比率变化可能被放大，也需核对采集。'], ['Error rate rises as traffic drops. What should you verify?','Absolute errors, request denominator and collection health','Only compare total traffic over two days','Remove windows with many errors','Small denominators can amplify rates; verify collection too.'])
    ])
  ]),
  branch('delivery', ['交付与基础设施', 'Delivery and infrastructure'], ['把构建、部署与配置变成可审查、可重复的过程。', 'Make builds, deployments and infrastructure repeatable and reviewable.'], [
    leaf('container-build', ['容器构建与镜像', 'Container builds and images'], [images],
      ['记录镜像基础、依赖与构建上下文，运行时注入配置和凭据。', 'Record the base image, dependencies and build context. Inject configuration and secrets at runtime.'],
      ['给一个小服务拟容器构建说明，写清上下文、依赖、启动命令和运行配置。', 'Write a build outline for a small service: context, dependencies, entry command and runtime configuration.'], [
      check(['数据库凭据应放在哪里？','由运行环境通过受控密钥机制提供','写进构建层中的配置文件','放在公共镜像标签里','构建层会随镜像分发，凭据应独立管理。'], ['Where should database credentials live?','In a controlled runtime secret mechanism','In a configuration file baked into a build layer','In the public image tag','Image layers are distributed; manage credentials separately.']),
      check(['要让部署可复现，选哪种镜像引用？','固定摘要或受控不可变版本','每次只使用 latest 且不记来源','根据机器名猜测镜像','不可变引用可以定位确切构建产物。'], ['Which image reference supports repeatable deployment?','A pinned digest or controlled immutable version','Always latest without recording origin','Guess the image from the host name','Immutable references identify the exact build artifact.'])
    ]),
    leaf('deployment-health', ['部署与健康探针', 'Deployments and probes'], [deploy, probes],
      ['滚动更新逐步替换副本。就绪探针决定是否接收流量，存活探针用于决定重启。', 'Rolling updates replace replicas gradually. Readiness gates traffic and liveness can trigger restarts.'],
      ['画出启动慢的服务从发布到接收流量的过程，标注启动、就绪和存活探针。', 'Sketch rollout to traffic for a slow-starting service, labeling startup, readiness and liveness probes.'], [
      check(['进程活着但尚未载入数据，哪个探针应暂时失败？','就绪探针','存活探针必须一直失败','无需任何探针','服务可以存活但暂时不接收流量。'], ['A process is alive but has not loaded its data. Which probe should fail temporarily?','Readiness','Liveness must keep failing','No probe is needed','A live process can still be unready for traffic.']),
      check(['服务正常启动需要两分钟，怎样避免启动期间反复被重启？','配置允许启动窗口的 startup probe','将就绪检查改为每秒重启','把每个启动中的副本立即加入服务','启动探针可在启动窗口内推迟其他探针。'], ['A healthy startup takes two minutes. How do you avoid restart loops during startup?','Use a startup probe with a sufficient startup window','Make readiness restart every second','Serve traffic from every starting replica','A startup probe can defer the other probes during startup.'])
    ]),
    leaf('infra-state', ['基础设施配置与状态', 'Infrastructure configuration and state'], [tf],
      ['评审计划差异和删除动作。将基础设施状态视为需访问控制的共享记录。', 'Review planned differences and deletions. Treat infrastructure state as a shared record that needs access controls.'],
      ['为两个环境写出配置变更的计划、审批、应用、核对与回退顺序。', 'Outline plan, approval, apply, verification and rollback for two environments.'], [
      check(['计划意外显示删除数据库，下一步？','暂停应用并核对资源标识、依赖与备份方案','先应用再判断是否重要','只忽略输出中的删除行','有影响的删除应在执行前核对。'], ['A plan unexpectedly shows a database deletion. What next?','Pause apply and check identity, dependencies and backup plans','Apply first and assess importance later','Ignore the delete line in the output','Review destructive changes before execution.']),
      check(['共享状态中可能含敏感值，适合怎样存储？','访问受控的后端，结合锁与备份','公开 Git 仓库','每位同事各存一份任意覆盖','状态需保护机密并避免并行更新冲突。'], ['How should shared state that may hold sensitive values be stored?','Access-controlled backend with locking and backups','A public Git repository','One independently overwritten copy per teammate','Protect confidentiality and avoid conflicting updates.'])
    ])
  ]),
  branch('observability', ['可观测性与可靠性', 'Observability and reliability'], ['把用户体验转成可观察指标、目标和可行动的告警。', 'Translate user experience into observable signals, objectives and actionable alerts.'], [
    leaf('four-signals', ['服务信号与告警', 'Service signals and alerts'], [observe],
      ['监测流量、延迟、错误和饱和度。告警关联用户影响和可执行动作。', 'Track traffic, latency, errors and saturation. Alerts should connect impact to an action.'],
      ['给上传服务列一套指标，并为其中一项写触发条件和处置说明。', 'Specify upload service measures and write a trigger and response for one alert.'], [
      check(['哪个指标直接反映请求尾部体验？','请求时延的高分位数','容器个数','日志文件大小','高分位时延刻画较慢的一部分请求。'], ['Which metric directly describes tail latency?','A high percentile of request latency','Container count','Log size','A high percentile describes the slower part of the request population.']),
      check(['哪个告警更可行动？','连续窗口的用户错误率超门槛，并附排查说明','每出现一条日志就通知','任意内部计数变化就通知','告警应有明确影响、持续性和下一步。'], ['Which alert is more actionable?','Sustained user-error threshold breach with a runbook','Notify on every log line','Notify on any internal counter change','An actionable alert conveys impact, duration and response.'])
    ]),
    leaf('slo-budget', ['SLI、SLO 与误差预算', 'SLIs, SLOs and error budgets'], [slo],
      ['以好事件数除以有效事件数定义服务指标。目标缺口决定可容许的坏事件比例。', 'Define indicators as good events divided by valid events. The objective implies a tolerated bad-event fraction.'],
      ['为搜索服务写出好请求定义、有效请求、时间窗和误差预算。', 'Define good searches, valid requests, the measurement window and error budget.'], [
      check(['有效请求 1000 次，990 次符合目标条件。SLI 是多少？','99%','90%','1%','好事件 990 除以有效请求 1000。'], ['990 of 1,000 valid requests are good. What is the SLI?','99%','90%','1%','Divide 990 good events by 1,000 valid requests.']),
      check(['某窗口 SLO 为 99.9%，每万有效请求允许多少坏事件？','10','100','1','可容许比例 0.1%，乘以 10000 为 10。'], ['At a 99.9% objective, how many bad events are allowed per 10,000 valid requests?','10','100','1','The allowed 0.1% of 10,000 is ten.'])
    ]),
    leaf('telemetry', ['关联日志、指标和追踪', 'Logs, metrics and traces'], [observe, source('OpenTelemetry', 'Signals', 'https://opentelemetry.io/docs/concepts/signals/')],
      ['指标定位时间窗，追踪区分调用段，日志提供单次事件的细节。', 'Use metrics to find the time window, traces to inspect call segments, and logs for event details.'],
      ['从一个模拟高延迟请求出发，写下怎样用 trace ID 关联两项服务日志。', 'For one simulated slow request, explain how to join two service logs by trace ID.'], [
      check(['全站时延突增后想知道请求卡在哪个调用段，首选什么？','查看同一请求跨服务的追踪跨度','只比较版本文件大小','只看容器名称','分布式追踪帮助定位一条请求里的慢调用。'], ['After a latency spike, what shows which call segment was slow?','Spans for the same request across services','Build artifact sizes','Container names only','Distributed traces expose slow calls within a request.']),
      check(['日志里有账号凭据，怎样修正？','调整采集与脱敏，保护日志访问并处理已泄漏凭据','扩大日志读取范围方便排查','把凭据移到更多日志字段','可观测性采集需要避免暴露敏感信息。'], ['Logs contain credentials. How should you respond?','Redact at collection, restrict access and address exposed credentials','Expand access to logs','Copy credentials to additional fields','Telemetry collection must avoid exposing sensitive information.'])
    ])
  ]),
  branch('recovery', ['变更、回退与复盘', 'Change and incident recovery'], ['根据发布证据暂停或回退，验证恢复并交接后续行动。', 'Pause or roll back on evidence, verify recovery and hand off follow-up.'], [
    leaf('canary-gate', ['灰度发布与门槛', 'Canary release gates'], [canary],
      ['预设对照、样本量、阈值和暂停规则，比较相同时间窗的候选组与稳定组。', 'Set controls, sample size, thresholds and pause rules before comparing candidate and stable groups.'],
      ['为灰度发布写检查表，明确指标、最小样本、观察时窗和停止条件。', 'Write a canary checklist with metric, minimum sample, observation window and stop condition.'], [
      check(['候选组持续超错误阈值，稳定组同期正常。下一步？','按门槛暂停扩量，保存证据并核对回退','继续扩量直到全站异常','把候选与稳定组平均后忽略差异','对照组和预设阈值用于保护后续扩量。'], ['Canary errors exceed a preset gate while the control is healthy. What next?','Pause expansion, preserve evidence and check rollback','Expand until the whole site is affected','Average both groups and ignore the difference','Controls and gates protect subsequent rollout.']),
      check(['候选目前只有 12 个请求，低于最小样本。怎么记录？','证据不足，继续观察或按预案停止','因零错误自动通过','删除样本量要求','门槛包括可靠的样本和观察时间。'], ['There are only twelve canary requests, below the minimum. What should be recorded?','Insufficient evidence; keep observing or stop as planned','Pass automatically because no errors are seen','Remove the sample-size requirement','A gate includes sample and observation requirements.'])
    ]),
    leaf('rollback-verify', ['回退与恢复验收', 'Rollback and recovery verification'], [canary, incidents],
      ['回退确认版本和数据兼容。恢复需通过用户路径及一段稳定观察。', 'Confirm target version and data compatibility before rollback. Verify a user path and a stable observation window.'],
      ['写一次模拟回退的执行与验收清单，标注负责人、版本、用户路径和停止条件。', 'Write an offline rollback and verification checklist with owners, version, user path and stop conditions.'], [
      check(['回退后 CPU 降下来了，但用户错误率没恢复。能宣布恢复吗？','不能，继续按用户体验和验收门槛复核','CPU 降了就关闭事件','只把状态页设为正常','恢复以预先定义的服务验证为准。'], ['CPU drops after rollback but user errors remain high. Is service restored?','No; verify user impact and the recovery gates','Close the incident because CPU dropped','Only set the status page to normal','Recovery depends on predefined service verification.']),
      check(['新版本已写入旧版无法读取的数据，回退前需核对什么？','数据迁移兼容、恢复方案与回退影响','只需记住旧版本标签','只重启数据库','应用回退不能自动撤销不兼容数据。'], ['The new version wrote data the old version cannot read. What must you check before rollback?','Migration compatibility, recovery plan and rollback impact','Only the old version tag','Only restart the database','Rolling back application code does not undo incompatible data.'])
    ]),
    leaf('incident-review', ['事件交接与复盘', 'Incident handoff and postmortem'], [incidents, postmortem],
      ['记录影响、时间线、证据和未决问题。改进动作应有负责人和可验证结果。', 'Record impact, timeline, evidence and open issues. Improvements need owners and verifiable outcomes.'],
      ['写一页故障交接和复盘，给两项改进写责任、期限和完成检查。', 'Write a one-page handoff and postmortem with two actions, owners, deadlines and verification.'], [
      check(['哪项复盘行动最可跟进？','由发布负责人补回退演练并用一次测试验证','提醒大家以后小心','列出一个未经核实的人为原因','可验证行动应可分配、执行和复查。'], ['Which postmortem action can be followed up?','Assign the release owner to rehearse rollback and verify it with a test','Remind everyone to be careful','Name an unverified person as the cause','Follow-up actions need ownership and verification.']),
      check(['复盘时根因还不确定，如何表达？','记录已知证据、备选解释与后续验证','先选一个原因写成定论','跳过时间线只写结果','事实、推断与待验证项可以同时保留。'], ['Root cause is uncertain. How should the postmortem state it?','Record evidence, competing explanations and follow-up tests','Pick a cause and call it final','Skip the timeline and state only the result','Record facts, inference and open verification separately.'])
    ])
  ], 'restore')
]);

