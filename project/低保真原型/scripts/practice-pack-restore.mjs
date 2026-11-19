import {pair as p, source as src, chapter as ch, choice as c, column as col, row, step} from './practice-pack-common.mjs';

const incident = 'https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/';
const canary = 'https://sre.google/workbook/canarying-releases/';
const response = 'https://sre.google/workbook/incident-response/';
const postmortem = 'https://sre.google/workbook/postmortem-culture/';
const metric = (id, time, version, group, requests, errors, cpu, note, en) =>
  row(id, time, version, group, requests, errors, cpu, p(note,en));

export const restore = {
  id:'restore', version:2, career:'ops',
  title:p('故障恢复与回退项目','Incident recovery and rollback'),
  brief:p('边缘网关的规则更新正在小流量发布。候选组出现 502 和 CPU 异常。你负责判断是否暂停、如何回退，以及什么时候可以宣告恢复。','A gateway rule update is being canaried. The candidate group shows 502 errors and abnormal CPU. Decide whether to pause, how to roll back and when recovery can be declared.'),
  audience:p('发布负责人、值班同事和受影响服务的使用方','Release owner, on-call team and affected service users'),
  outcome:p('回退决策、恢复验收记录和复盘行动','Rollback decision, recovery acceptance and follow-up actions'),
  boundary:p('监控、版本、阈值和时间均为教学场景。所有操作是纸上演练。原始 Cloudflare 事故只用于理解故障与发布风险。','Metrics, versions, thresholds and times belong to the exercise. All actions are tabletop decisions. The Cloudflare incident illustrates release risk.'),
  interview:p('如果回退后 502 下降，但流量也降到不足以比较，你会怎样确认恢复？','If 502 errors fall after a rollback but traffic is too low to compare, how would you confirm recovery?'),
  handoff:p('值班同事按验收窗口核对版本、流量、错误和资源指标，再更新事件状态。','The next shift checks version, traffic, errors and resource metrics against the acceptance window before updating incident status.'),
  roles:{
    member:{title:p('值班运维成员','On-call engineer'),responsibility:p('比较候选与对照、提出回退建议并复核恢复信号。','Compare candidate and control, propose a rollback and verify recovery signals.')},
    lead:{title:p('故障恢复主理人','Incident lead'),responsibility:p('确定暂停和回退门槛，分派执行、验证及沟通职责。','Set pause and rollback gates, and assign execution, validation and communication.')}
  },
  sources:[
    src('cf-case','case','Cloudflare','Details of the Cloudflare outage on July 2, 2019',incident,'阅读规则更新如何耗尽 CPU、影响代理请求，以及团队如何验证恢复。','Review how a rule update exhausted CPU and how the team verified recovery.'),
    src('canary-guide','method','Google SRE','Canarying Releases',canary,'对照候选组和稳定组，先定义可判定指标与回退条件。','Compare candidate and stable groups and define decision metrics before rollout.'),
    src('incident-guide','method','Google SRE','Incident Response',response,'在事故中明确协调、执行、验证和信息更新职责。','Assign coordination, execution, verification and communications during the incident.'),
    src('postmortem-guide','method','Google SRE','Postmortem Culture: Learning from Failure',postmortem,'用可追踪的后续行动降低复发风险。','Turn findings into trackable follow-up actions.'),
    src('sre-video','video','USENIX · Laura de Vesine','Storytelling as an Incident Management Skill','https://www.usenix.org/conference/srecon24americas/presentation/devesine','可选观看，关注清晰的事件叙述与交接。','Optional viewing on communicating and handing over incidents.')
  ],
  reading:[
    ch('先控制影响范围','Limit the blast radius',
      'Cloudflare 的复盘记载，一次 WAF 规则更新引发异常的正则匹配开销，耗尽处理 HTTP/HTTPS 流量的 CPU，导致代理请求错误。团队确认影响组件并停止问题路径，随后在有限范围验证恢复。本练习提取的是识别影响、暂停扩散、验证恢复的工作顺序。\n\n假设你正在做一次规则灰度。对照组留在 v17，候选组使用 v18。先记录变更、各组流量和用户影响。回退只在演练中描述，执行与批准各有责任人。\n\n[阅读 Cloudflare 原始复盘]('+incident+')',
      'Cloudflare’s postmortem describes a WAF rule update that exhausted HTTP/HTTPS CPU through costly regular-expression matching and caused proxy errors. The team identified the affected component, stopped the faulty path and verified recovery in a limited scope. The exercise practices identifying impact, stopping spread and validating recovery.\n\nIn this canary, the control stays on v17 and the candidate runs v18. Record the change, traffic and user impact first. The rollback is a tabletop plan with separate approval and execution roles.\n\n[Read the Cloudflare postmortem]('+incident+')'),
    ch('用同窗对照判断异常','Compare matched time windows',
      '先按同一时间窗口比较候选与稳定组。错误率等于 502 数除以请求数。对比错误率、请求分母、CPU 和版本变化。不要把较少请求带来的较少错误当作修复，也不要用全量平均掩盖小流量候选组。\n\n本次演练的门槛：候选组同一分钟至少 100 个请求，且 502 率高于 5% 并高于对照组时，暂停扩量并评估回退。CPU 用于补充解释。这些数值是演练输入。\n\n[Google SRE 灰度发布指南]('+canary+')',
      'Compare candidate and stable groups in the same time window. The 502 rate is errors divided by requests. Compare rates, denominators, CPU and version changes. Low volume can hide errors, and a fleet average can mask a bad canary.\n\nExercise gate: if the candidate has at least 100 requests in one minute and its 502 rate exceeds 5% and the control rate, pause expansion and assess rollback. Use CPU as supporting evidence. These are exercise thresholds.\n\n[Google SRE canary release guidance]('+canary+')'),
    ch('安排回退与恢复验收','Plan rollback and recovery acceptance',
      '写出暂停扩量、确认最后稳定版本、指定执行人与验证人、检查版本回退、按门槛观察、更新状态的顺序。回退后要求连续两个观察窗口各至少 100 个请求，502 率低于 1%，且 CPU 不超过 65%。出现样本不足、版本未回退或指标不达标时继续观察或升级。\n\n演练只记录建议动作与证据。一次 CPU 回落不足以判定服务恢复，短期恢复也不意味着根因已完全验证。\n\n[Google SRE 事故响应]('+response+')',
      'Plan the sequence: pause expansion, confirm the last stable version, assign execution and verification, check the rollback, observe against gates and update status. Recovery needs two consecutive windows each with at least 100 requests, below 1% 502s and at most 65% CPU. Keep observing or escalate if traffic, version or metrics fail the gate.\n\nThis exercise records proposed actions and evidence. A CPU drop alone is insufficient, and recovery does not prove the full root cause.\n\n[Google SRE incident response]('+response+')'),
    ch('把故障经验变成下一次发布检查','Turn findings into the next release check',
      '交付包含影响范围、回退理由、实际核对的指标、恢复判断、残余不确定性以及一个有负责人的改进项。把可能原因写成待核验假设，避免把一次练习演练包装成真实故障处置经验。\n\n面试时可以说明你为什么选择先暂停扩量、如何使用同窗对照，以及何时判定恢复。用证据行支持这个故事。\n\n[Google SRE 复盘指南]('+postmortem+')',
      'Include impact, rollback rationale, metrics checked, recovery decision, residual uncertainty and one follow-up with an owner. Write suspected causes as hypotheses and describe the work as a tabletop exercise.\n\nFor an interview, explain why you paused expansion, how you used the control and when you declared recovery. Cite the evidence rows.\n\n[Google SRE postmortem guidance]('+postmortem+')')
  ],
  dataset:{title:p('发布与恢复监控样本','Release and recovery observations'),intro:p('每行为一分钟统计。先比较相同时间的候选和对照，再检查回退后的有效观察窗口。','Each row covers one minute. Compare the candidate and control in the same minute, then check the valid recovery windows.'),
    columns:[col('time','时间 UTC','Time UTC'),col('version','版本','Version'),col('group','分组','Group'),col('requests','请求数','Requests'),col('errors','502 数','502s'),col('cpu','CPU %','CPU %'),col('note','观察','Observation')],
    rows:[
      metric('R01','10:00','v17','control',600,2,43,'变更前稳定对照。','Stable control before change.'),
      metric('R02','10:00','v17','candidate',200,1,44,'候选池变更前基线。','Candidate pool before change.'),
      metric('R03','10:02','v17','control',610,2,45,'候选开始小流量发布。','Canary rollout begins.'),
      metric('R04','10:02','v18','candidate',210,18,91,'候选 CPU 与错误率上升。','Candidate CPU and error rate rise.'),
      metric('R05','10:03','v17','control',605,1,43,'同窗对照稳定。','Matched control remains stable.'),
      metric('R06','10:03','v18','candidate',225,27,96,'候选异常持续。','Candidate degradation persists.'),
      metric('R07','10:05','v17','candidate',42,0,52,'演练执行回退，流量尚低。','Rollback in exercise, with low traffic.'),
      metric('R08','10:06','v17','candidate',202,1,54,'恢复观察窗口一。','Recovery observation window one.'),
      metric('R09','10:07','v17','candidate',211,1,50,'恢复观察窗口二。','Recovery observation window two.'),
      metric('R10','10:07','v17','control',620,2,44,'恢复阶段对照。','Control during recovery.')
    ]},
  steps:[
    step('scope',{
      title:p('确认变更与用户影响','Identify the change and impact'),assignment:p('界定候选、对照、时间和用户影响，指定本次演练的职责。','Define candidate, control, timeframe and user impact, and identify exercise roles.'),
      impact:p('先固定影响范围，才知道该停止扩散还是排查全局依赖。','Impact scope tells you whether to stop expansion or investigate a shared dependency.'),
      member:p('记录版本、502 和用户路径。','Record versions, 502s and affected user paths.'),
      lead:p('指定协调、执行、验证和更新状态的人。','Assign coordination, execution, verification and status updates.'),
      question:p('哪一组发生变化？什么信号反映了用户影响？','Which group changed, and what signal reflects user impact?'),
      hint:p('候选和对照应在同一时间窗比较。先把版本写清。','Compare groups in the same window and record their versions first.'),
      check:p('影响范围指向具体发布组和用户信号。','Identify the release group and user-visible signal.'),
      handoff:p('用同窗对照检查是否触发暂停条件。','Use matched windows to test the pause gate.'),minEvidence:0,sourceIds:['cf-case','incident-guide'],
      choices:[c('canary','优先界定候选组影响','Scope the candidate group first','用稳定组校验异常是否也发生在全局。','Use the stable group to check whether degradation is widespread.'),c('global','先按全局故障通报','Report a global outage immediately','请先用对照证据界定可确认影响，再更新范围。','Use control evidence to scope what can be confirmed, then update as needed.')]
    }),
    step('evidence',{
      title:p('复核发布指标','Review release metrics'),assignment:p('按同分钟核对候选和对照的请求量、502 率和 CPU，至少引用三条记录。','Compare requests, 502 rate and CPU in matching minutes, and cite at least three rows.'),
      impact:p('分母和对照组可以帮助区分发布异常和整体负载变化。','Denominators and a control help distinguish a release problem from a broad load change.'),
      member:p('计算两个窗口的候选与对照错误率。','Compute both groups’ error rates in two windows.'),
      lead:p('说明哪些信号触发停发门槛、还有哪些因素需要核对。','Explain which signals meet the pause gate and which factors need checking.'),
      question:p('把 502 数除以请求数后，候选是否跨过暂停阈值？','Does the candidate cross the pause threshold after dividing 502s by requests?'),
      hint:p('从 R03–R06 的同窗对照开始。先算错误率，再看 CPU。','Start with matched rows R03–R06. Calculate error rates before interpreting CPU.'),
      check:p('每个错误率有请求分母和同窗对照。','Every rate has a denominator and matched control.'),
      handoff:p('把触发阈值的证据带到回退决策。','Carry the threshold evidence into the rollback decision.'),minEvidence:3,sourceIds:['canary-guide','cf-case'],
      choices:[c('compare','同窗比较错误率与 CPU','Compare rate and CPU in matched windows','可以把用户影响和资源信号联系起来。','This links user impact with resource signals.'),c('total','只比较 502 绝对数','Compare raw 502 counts only','请求量不同，绝对数可能误导。','Different traffic volumes can make raw counts misleading.')]
    }),
    step('decision',{
      title:p('决定暂停、回退或继续','Decide whether to pause, roll back or continue'),assignment:p('写出决定与执行顺序。用恢复数据判断何时可以更新状态。','Record your decision and execution sequence. Use recovery data to decide when status can change.'),
      impact:p('明确的回退和验收门槛可减少误操作与过早恢复发布。','Explicit rollback and acceptance gates reduce premature rollout and operational mistakes.'),
      member:p('指出目标版本、验证动作和需要继续观察的情况。','Name the target version, validation action and conditions that require more observation.'),
      lead:p('写清批准、执行与验收责任，说明回退失败如何升级。','Assign approval, execution and acceptance. State how rollback failure escalates.'),
      question:p('何时暂停扩量？R07 足以宣告恢复吗？哪两个窗口支持判断？','When should rollout pause? Is R07 sufficient for recovery, and which windows support the decision?'),
      hint:p('恢复需要版本、两窗有效流量、错误率和 CPU 同时满足。','Recovery requires the right version plus two valid windows with acceptable rate and CPU.'),
      check:p('回退与恢复门槛分开写。至少引用两条恢复或异常证据。','Write separate rollback and recovery gates. Cite at least two supporting rows.'),
      handoff:p('把计划、验收和未核验项写入交接。','Record the plan, acceptance and unverified items in the handoff.'),minEvidence:2,sourceIds:['canary-guide','incident-guide'],
      choices:[c('rollback','暂停扩量，回退至 v17 后按窗口验收','Pause, roll back to v17 and validate the windows','说明怎样确认恢复及何时升级。','Specify how you confirm recovery and when to escalate.'),c('pause','暂停并等待负责人确认回退','Pause pending rollback approval','写出等待期间如何控制影响，以及何时复查。','State how you limit impact while waiting and when to reassess.'),c('expand','继续扩大候选流量','Expand candidate traffic','候选已跨过演练门槛。扩大流量会增加影响范围。','The candidate crossed the exercise gate. Expansion increases exposure.')]
    }),
    step('delivery',{
      title:p('交接与复盘','Hand over and review'),assignment:p('写出复核证据、本人贡献和有责任人的改进项。','Document verification evidence, your contribution and a follow-up owner.'),
      impact:p('清楚的复盘能将一次恢复决策变成下一次发布的检查。','A clear review turns recovery decisions into checks for the next release.'),
      member:p('说明你实际复算了哪些窗口，以及一个可重现的检查。','State which windows you recalculated and one reproducible check.'),
      lead:p('给改进项定义责任人、完成证据和下一次演练时间。','Assign an owner, completion evidence and a date for the next drill.'),
      question:p('写一份值班交接，说明现在能确认的状态、未查明事项及改进动作。','Write a handoff with current verified status, open questions and an improvement action.'),
      hint:p('分开叙述服务恢复证据和事故原因假设。','Keep recovery evidence separate from root-cause hypotheses.'),
      check:p('交付标明演练边界、证据和本人实际完成的工作。','Label the exercise scope, evidence and the work you performed.'),
      handoff:p('扩展范围可设计一条自动暂停规则，列出低流量误报的测试案例。','For extended scope, design an automatic pause gate and a low-traffic false-positive test.'),minEvidence:1,sourceIds:['cf-case','postmortem-guide'],
      choices:[c('sign-off','交接已满足的恢复门槛','Hand off the met recovery criteria','带上窗口和分母，保留根因待核验。','Include windows and denominators, and leave the root cause open.'),c('hold','交接仍需观察的条件','Hand off conditions still under observation','写清重新检查的时间和门槛。','Specify when to recheck and what gate to apply.')]
    })
  ],
  reference:p('R04 的 502 率为 18/210（8.57%），R06 为 27/225（12%）。同窗对照低于 1%，候选跨过暂停门槛。R07 只有 42 个请求，不能单独确认恢复。R08 和 R09 均超过 100 个请求，版本为 v17，502 率低于 1%，CPU 未超过 65%，符合本演练恢复条件。','R04 is 18/210 (8.57%) and R06 is 27/225 (12%). The matching controls are below 1%, so the candidate crosses the pause gate. R07 has only 42 requests. R08 and R09 each exceed 100 requests, run v17, stay below 1% 502s and at or below 65% CPU, meeting the exercise recovery criteria.')
};
