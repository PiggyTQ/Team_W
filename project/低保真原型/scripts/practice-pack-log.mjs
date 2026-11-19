import {pair as p, source as src, chapter as ch, choice as c, column as col, row, step} from './practice-pack-common.mjs';

const advisory = 'https://www.cyber.gov.au/advisory/prc-state-sponsored-actors-compromise-and-maintain-persistent-access-to-us-critical-infrastructure';
const logging = 'https://www.cyber.gov.au/publication/best-practices-for-event-logging-and-threat-detection';
const microsoft = 'https://learn.microsoft.com/windows/security/threat-protection/auditing/audit-logon';
const otel = 'https://opentelemetry.io/docs/specs/otel/logs/data-model/';
const event = (id, time, source, account, host, code, note, en) => row(id, time, source, account, host, code, p(note,en));

export const log = {
  id:'log', version:2, career:'security',
  title:p('安全日志初筛项目','Security log triage'),
  brief:p('安全运营值班收到一条远程登录告警。你需要把认证、权限和变更记录按时间对齐，判断是否升级调查，并留下接班人能继续查的事件链。','A security operations shift receives a remote-login alert. Align authentication, privilege and change records, decide whether to escalate and leave an evidence trail for the next shift.'),
  audience:p('安全运营二线与系统负责人','Tier-two security operations and the system owner'),
  outcome:p('事件时间线、备选解释与升级交接','Event timeline, alternative explanations and an escalation handoff'),
  boundary:p('记录为授权范围内的离线教学数据，账户、设备与变更单为虚构。事件链只支持调查优先级，不能证实攻击或归因。','The offline records are fictional and scoped to the exercise. The timeline supports triage priority, not confirmation of compromise or attribution.'),
  interview:p('正常变更和异常登录同时出现时，你会用哪条证据区分两种解释？','When legitimate maintenance and an unusual login coincide, what evidence would distinguish them?'),
  handoff:p('接班人使用同一时区、账号、目标主机和证据行重建事件链，并补查缺失的核验信息。','The next shift reconstructs the timeline from the same timezone, account, host and evidence IDs, then fills the remaining gaps.'),
  roles:{
    member:{title:p('安全运营分析员','SOC analyst'),responsibility:p('收集和关联证据，记录替代解释与待查项。','Collect and correlate evidence, and record alternatives and open questions.')},
    lead:{title:p('安全值班主理人','Security shift lead'),responsibility:p('确定升级优先级、交接责任和授权边界。','Set escalation priority, handoff responsibilities and authorization limits.')}
  },
  sources:[
    src('joint-case','case','CISA, NSA, FBI and partners · ASD ACSC','Joint advisory AA24-038A',advisory,'原始联合通报说明合法账户也可能被滥用，以及日志留存和跨来源核对的价值。','The joint advisory explains abuse of valid accounts and the value of retained, correlated logs.'),
    src('logging-guide','method','ASD ACSC and international partners','Best practices for event logging and threat detection',logging,'查阅统一时间戳、集中留存和关键事件字段建议。','Use timestamp consistency, centralized retention and relevant event fields.'),
    src('windows-events','method','Microsoft Learn','Audit Logon',microsoft,'核对 4624 登录成功与 4625 登录失败的事件语义。','Confirm the meanings of successful logon event 4624 and failed logon event 4625.'),
    src('otel-model','method','OpenTelemetry','Logs Data Model',otel,'区分事件发生时间、观察时间与资源属性。','Distinguish event time, observation time and resource attributes.'),
    src('log-video','video','CNCF · Fluent Bit','Parsing 101 with Fluent Bit','https://www.cncf.io/blog/2025/01/06/parsing-101-with-fluent-bit/','可选观看，关注解析与字段归一。','Optional viewing on parsing and field normalization.')
  ],
  reading:[
    ch('收到登录告警后先界定范围','Scope the login alert',
      '多国机构联合通报 AA24-038A 描述了攻击者滥用有效账户并在多个系统之间活动的情形。对安全运营而言，看到一次成功登录不能自动认定合法或恶意，关键是把上下文连起来。这次练习仅针对给出的测试主机和时间段。\n\n你接到的告警涉及 svc-archive 和 files-02。先写出观察窗口、涉及系统及授权范围，保留原始记录。值班初筛的任务是确定优先级并交接，需要哪些额外证据也属于交付的一部分。\n\n[查阅联合通报 AA24-038A]('+advisory+')',
      'Joint advisory AA24-038A describes abuse of valid accounts across systems. A successful login alone establishes neither legitimacy nor compromise. This exercise is limited to the supplied test hosts and observation window.\n\nThe alert concerns svc-archive and files-02. Record the window, systems and authorized scope. The shift’s responsibility is to prioritize the alert and hand over the evidence and gaps.\n\n[Read the joint advisory]('+advisory+')'),
    ch('按时区、账户与主机关联','Correlate timezone, account and host',
      '将带偏移量的事件时间转换为 UTC，并区分事件发生时间和收集系统看到它的时间。4624 与 4625 分别表示 Windows 登录成功与失败，但相邻时间的记录可能来自其他账户或主机。记录最少要保留原始时间、归一时间、账号、来源和目标。\n\n用账号、主机、来源地址或会话线索逐项关联。把误入窗口的无关事件留在原始记录，不要放进证据链。变更记录仅覆盖它注明的主机和来源。\n\n[Microsoft 登录事件]('+microsoft+') · [OpenTelemetry 日志时间模型]('+otel+')',
      'Normalize offset timestamps to UTC. Distinguish event time from collection time. Windows 4624 and 4625 indicate success and failure, but nearby events may belong to different accounts or hosts. Keep the original and normalized time, account, source and target.\n\nCorrelate by account, host, address or session. Preserve unrelated records without adding them to the evidence chain. A change ticket covers only the listed hosts and sources.\n\n[Microsoft logon events]('+microsoft+') · [OpenTelemetry log timestamps]('+otel+')'),
    ch('比较解释并作升级判断','Compare explanations and escalate',
      '把合法备份与未经授权的远程登录视为两种待核验解释。先比较变更单的时间、主机和来源地址，再检查权限事件和会话标识。日志缺口意味着部分后续动作仍未知。可以建议二线核实，但不能仅凭登录成功认定失陷。\n\n[事件日志和威胁检测实践]('+logging+')',
      'Treat legitimate backup and unapproved remote access as hypotheses. Compare the change window, host and source before reviewing privileges and sessions. Collection gaps leave later actions uncertain. Escalate for verification without declaring compromise from a login alone.\n\n[Event logging and threat detection]('+logging+')'),
    ch('提交能被接班人使用的记录','Prepare a usable shift handoff',
      '交接记录包括告警范围、UTC 时间线、支持证据、备选解释、缺少的信息和建议复查人。把本人做的关联步骤保留下来，便于面试时说明怎样处理真假告警。\n\n[日志字段与归一模型]('+otel+')',
      'Include scope, UTC timeline, supporting evidence, alternative explanations, missing information and the next reviewer. Preserve the correlation work you performed so you can explain how you distinguish alerts in an interview.\n\n[Log fields and normalization]('+otel+')')
  ],
  dataset:{title:p('离线安全日志与变更记录','Offline security and change records'),intro:p('时间含 UTC 和带时区偏移的本地记录。变更单说明仅对所列对象有效。','Timestamps include UTC and local offsets. Change approval applies only to the objects listed.'),
    columns:[col('time','记录时间','Event time'),col('source','来源','Source'),col('account','账号','Account'),col('host','主机','Host'),col('code','事件','Event'),col('note','线索','Evidence detail')],
    rows:[
      event('L01','01:46:00Z','Change','svc-archive','backup-01','CHG-14','批准 01:50–02:15 UTC 从 10.0.3.5 执行备份。','Backup approved 01:50–02:15 UTC from 10.0.3.5.'),
      event('L02','01:51:10Z','Security','svc-archive','backup-01','4624','来源 10.0.3.5，类型 3。','Source 10.0.3.5, type 3.'),
      event('L03','09:55:12+08:00','Security','svc-archive','files-02','4625','来源 10.0.8.23，类型 10。','Source 10.0.8.23, type 10.'),
      event('L04','01:55:55Z','Security','qa-runner','files-02','4625','来源 10.0.7.11，账号与来源不同。','Source 10.0.7.11, different account and source.'),
      event('L05','01:56:09Z','Security','svc-archive','files-02','4625','来源 10.0.8.23，类型 10。','Source 10.0.8.23, type 10.'),
      event('L06','09:58:17+08:00','Security','svc-archive','files-02','4624','来源 10.0.8.23，类型 10，会话 7AF。','Source 10.0.8.23, type 10, session 7AF.'),
      event('L07','01:58:18Z','Security','svc-archive','files-02','4672','会话 7AF 出现特殊权限。','Session 7AF received special privileges.'),
      event('L08','01:59:04Z','File audit','svc-archive','files-02','read','会话 7AF 读取共享目录元数据。','Session 7AF read share metadata.'),
      event('L09','02:03:00Z','Collector','collector','files-02','gap','01:59:30–02:01:00 UTC 的收集状态未知。','Collection status is unknown for 01:59:30–02:01:00 UTC.'),
      event('L10','02:05:00Z','Change','svc-archive','backup-01','CHG-14','工单未列 files-02 或 10.0.8.23。','Ticket does not list files-02 or 10.0.8.23.'),
      event('L11','02:09:21Z','Security','svc-archive','files-02','4634','会话 7AF 退出。','Session 7AF ended.')
    ]},
  steps:[
    step('scope',{
      title:p('确认告警和调查范围','Scope the alert'),assignment:p('界定要调查的账号、主机、时间窗及可用资料。','Define the account, host, time window and available sources.'),
      impact:p('明确范围让复查有边界，也能防止把无关记录当作同一事件。','A bounded scope prevents unrelated events from becoming part of the same incident.'),
      member:p('记下告警对象与原始时区。','Record the alert target and original timezone.'),
      lead:p('划定值班可做的查询和必须由系统负责人授权的动作。','Separate permitted review from actions that require the system owner.'),
      question:p('哪些来源能帮助核对是否有授权？你准备检查哪一段时间？','Which sources show authorization, and what time window will you inspect?'),
      hint:p('先固定 svc-archive、files-02 和观察窗口，再查证变更范围。','Start with svc-archive, files-02 and the observation window, then check the change scope.'),
      check:p('写下账号、目标、时间区间和可查来源。','State the account, target, time window and sources.'),
      handoff:p('用这些条件在下一步筛查日志。','Use these conditions to filter the logs.'),minEvidence:0,sourceIds:['joint-case','logging-guide'],
      choices:[c('targeted','按告警对象和时段初筛','Triage the alert scope','有限窗口便于复查，可根据新证据再扩大。','A bounded window is reproducible and can expand with evidence.'),c('all','把窗口内全部告警归为一类','Treat all nearby alerts as one event','同时间不代表同事件，请先定义账号和目标。','Timing alone does not link events. Define account and target first.')]
    }),
    step('evidence',{
      title:p('复原事件链','Reconstruct the timeline'),assignment:p('按 UTC 对齐记录，选择至少三条可关联证据，写明你的连接依据。','Align timestamps to UTC, cite at least three related rows and explain each link.'),
      impact:p('事件链让二线可以复现你看到的顺序，而不是只看到一个事件码。','The timeline gives the next shift a reproducible sequence instead of an isolated event code.'),
      member:p('给出原始时间和对应 UTC，检查账号、来源和会话。','Provide original and UTC times and check account, source and session.'),
      lead:p('把高可信关联和待证实关联分开，标记缺日志的时段。','Distinguish stronger links from hypotheses and identify gaps.'),
      question:p('哪条成功登录跟在失败之后？什么字段支持它们有关联？','Which successful logon follows failures, and what fields link them?'),
      hint:p('09:58:17+08:00 与 01:58:17Z 是同一时间。看 7AF 是否贯穿后续事件。','09:58:17+08:00 is 01:58:17Z. Check where session 7AF appears later.'),
      check:p('至少引用三条记录，并区分观察时间和事件时间。','Cite at least three rows and distinguish event time from observation time.'),
      handoff:p('把已知事件和缺口带入升级判断。','Carry known events and gaps into the escalation decision.'),minEvidence:3,sourceIds:['windows-events','otel-model','logging-guide'],
      choices:[c('correlate','按账号、主机和会话对齐','Correlate account, host and session','结合多字段有助于减少误连。','Multiple fields reduce false correlations.'),c('time-only','只按时间相邻拼接','Join by time adjacency alone','可能把 QA 失败登录或备份活动误拼进来。','This can mix in unrelated QA failures or backups.')]
    }),
    step('decision',{
      title:p('区分正常变更与异常线索','Assess maintenance versus suspicious activity'),assignment:p('比较正常备份和未获授权的远程访问两种解释，明确升级优先级和补查项。','Compare legitimate backup with unapproved remote access, then set priority and next checks.'),
      impact:p('既保留异常线索，也让正常变更有机会被核对。','This preserves suspicious evidence while allowing legitimate activity to be verified.'),
      member:p('解释变更单覆盖什么、遗漏什么，建议先核验来源设备。','Explain what the change covers and verify the source host first.'),
      lead:p('确定二线响应时限和向系统负责人提出的核验请求。','Set a response target and a verification request for the system owner.'),
      question:p('这张变更单解释了哪些记录？你还缺少什么证据才能下结论？','Which records does the change explain, and what evidence is still missing?'),
      hint:p('比较变更单中的目标和来源地址。日志缺口限制了对后续动作的判断。','Compare the approved host and source. The collection gap limits conclusions about later activity.'),
      check:p('说明至少一个替代解释、支持证据和待核实信息。','State an alternative explanation, supporting evidence and a verification gap.'),
      handoff:p('给下一班留下需要验证的设备、记录来源和责任人。','Leave the next shift a device, evidence source and owner to verify.'),minEvidence:2,sourceIds:['joint-case','logging-guide'],
      choices:[c('escalate','升级核验并保留疑点','Escalate for verification','写清需要什么额外证据和谁来核验。','State the additional evidence and reviewer.'),c('close','按已批准备份关闭告警','Close as approved backup','变更单只覆盖列出的主机和来源，应先确认差异。','The ticket covers only listed hosts and sources. Verify the mismatch.'),c('confirmed','直接认定已入侵','Declare confirmed compromise','当前只支持异常线索，仍需端点和授权记录。','The evidence supports suspicion. Endpoint and authorization evidence are still needed.')]
    }),
    step('delivery',{
      title:p('完成值班交接','Write the shift handoff'),assignment:p('交付一份可复查的初筛记录，列出已知事实、待验证假设与本人贡献。','Deliver a reproducible triage record with facts, open hypotheses and your contribution.'),
      impact:p('可追踪的交接展示你能在证据不足时作出合适的判断。','A traceable handoff demonstrates judgment under incomplete evidence.'),
      member:p('交给二线你实际核对的行和一条优先复查建议。','Give tier two the rows you checked and one priority action.'),
      lead:p('指定复核责任、时间和升级条件，并写下保留证据的方法。','Assign responsibility, timing and escalation criteria, and specify how to preserve evidence.'),
      question:p('下一班先查什么？如果结果不同，你会怎样更新结论？','What should the next shift check first, and how would a different result change the conclusion?'),
      hint:p('先写可观察事实，再写解释。用“尚未核实”保留缺口。','State observations before explanations, and keep unverified gaps visible.'),
      check:p('交接能区分事件线索、未验证结论与建议动作。','Separate evidence, unverified conclusions and proposed actions.'),
      handoff:p('扩展范围可设计一条低误报检测规则，并列出合法远程维护反例。','For extended scope, design a low-noise detection rule and a legitimate remote-maintenance counterexample.'),minEvidence:1,sourceIds:['logging-guide','otel-model'],
      choices:[c('tier-two','提交二线继续核验','Hand off to tier two','注明紧急程度、联系人与当前证据。','Include priority, contact and available evidence.'),c('collect','先补采证据再决定','Collect evidence before deciding','指定补采来源和重新评估时限。','Name the collection source and reassessment deadline.')]
    })
  ],
  reference:p('L03、L05、L06 共享账号、目标与来源。L06 的 UTC 时间为 01:58:17。L07、L08 可用会话 7AF 关联。CHG-14 解释 L02，未覆盖 files-02 和 10.0.8.23。L09 为观察缺口。建议二线核实远程访问来源、授权和终端活动，保留是否入侵未知。','L03, L05 and L06 share account, target and source. L06 converts to 01:58:17 UTC. Session 7AF links L07 and L08. CHG-14 explains L02 but does not cover files-02 or 10.0.8.23. L09 identifies a collection gap. Escalate to verify source, authorization and endpoint activity without asserting compromise.')
};
