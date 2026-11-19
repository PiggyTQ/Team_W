import {source, tree, branch, leaf, check} from './definitions.mjs';

const sfia = source('SFIA Foundation', 'Systems installation and removal', 'https://sfia-online.org/en/sfia-9/skills/systems-installation-removal', 'SFIA 9');
const requirements = source('SFIA Foundation', 'Requirements definition and management', 'https://sfia-online.org/en/sfia-9/skills/requirements-definition-and-management', 'SFIA 9');
const incident = source('SFIA Foundation', 'Incident management', 'https://sfia-online.org/en/sfia-9/skills/incident-management', 'SFIA 9');
const strategy = source('Microsoft Learn', 'Plan a Dynamics 365 implementation strategy', 'https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/implementation-strategy');
const migration = source('Microsoft Learn', 'Create a data migration strategy', 'https://learn.microsoft.com/en-us/training/modules/data-migration/');
const security = source('Microsoft Learn', 'Secure your Dynamics 365 data and apps', 'https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/security');
const test = source('Microsoft Learn', 'Test your solution before deployment', 'https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/testing-strategy');
const live = source('Microsoft Learn', 'Prepare your production environment to go live', 'https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/prepare-to-go-live');
const training = source('Microsoft Learn', 'Develop a training strategy', 'https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/training-strategy');
const handoff = source('Microsoft Learn', 'Manage changes during transition and handover', 'https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/change-management-transition-handover');

export default tree('delivery', [sfia, requirements, strategy], [
  branch('discovery', ['需求与实施范围', 'Discovery and scope'], ['和使用方核对流程、范围、验收与责任。', 'Confirm workflows, scope, acceptance and ownership with stakeholders.'], [
    leaf('workflows', ['现状与目标流程', 'Current and target workflows'], [strategy, requirements],
      ['记录实际业务角色、输入、例外与交接，区分观察和假设。', 'Record current roles, inputs, exceptions and handoffs, distinguishing observations from assumptions.'],
      ['为客服登记流程写现状和目标草图，列出一个暂未核对的例外。', 'Sketch current and target support intake workflows with an unverified exception.'], [
      check(['两部门对“关闭工单”有不同定义，先做什么？','记录差异并用具体工单场景核对定义与负责人','任选一方定义直接配置','只改工单标题避免讨论','先澄清流程和术语，避免配置建立在错误假设上。'], ['Two teams define ticket closure differently. What first?','Document the difference and confirm definition and owner using concrete cases','Pick one team and configure it','Change the title to avoid discussion','Clarify process and terminology before configuring.']),
      check(['只观察了正常流程，没有遇到退回。怎样记录？','保留退回为待核对例外，安排验证','宣布系统不支持退回','用自己的猜测当成客户确认','未观察到不等于不存在。'], ['No return was observed in the normal workflow. How should it be recorded?','Log return as an open exception to verify','Declare returns unsupported','Treat a guess as customer confirmation','Absence of observation does not settle an exception.'])
    ]),
    leaf('scope-acceptance', ['范围与验收标准', 'Scope and acceptance criteria'], [requirements, test],
      ['将范围、约束和验收写成可复核条目，明确审批人与变更路径。', 'Write verifiable scope, constraints and acceptance with approvers and a change process.'],
      ['为一次离线工单系统上线列出交付与排除范围，并为一项需求写验收用例。', 'Define included and excluded scope for an offline ticket launch and write an acceptance case.'], [
      check(['客户临时增加报表范围，首选？','记录变更并核对成本、验收和审批后更新计划','口头同意后改生产','在交付清单里不留记录','变更应经评估并可追溯。'], ['A customer adds a report late. What first?','Log and assess the change, acceptance and approval before updating the plan','Agree verbally and change production','Leave it out of the checklist','Changes need assessment and traceability.']),
      check(['“人员能正确派单”如何写验收？','给定角色和工单，在规定流程下派到指定队列并留下记录','只确认菜单存在','只让管理员说好用','验收要体现业务结果及证据。'], ['How can correct ticket assignment be accepted?','Given a role and ticket, assign it to the expected queue and capture evidence','Check only that a menu exists','Ask only an administrator if it feels usable','Acceptance should capture business outcome and evidence.'])
    ]),
    leaf('dependency-owners', ['依赖、责任与升级', 'Dependencies and ownership'], [strategy, requirements],
      ['为前置事项、权限和审批指定责任人、期限、证据与升级方式。', 'Assign owners, dates, evidence and escalation for dependencies, access and approvals.'],
      ['列出账号、数据和验收三个依赖，分别写主责、何时确认和失败时上报对象。', 'List account, data and acceptance dependencies with owners, verification and escalation.'], [
      check(['上线依赖客户身份提供方，承诺日期前应明确什么？','访问与配置前置、双方负责人和确认条件','只写日期，不记录依赖','默认实施者拥有全部权限','关键依赖需要可确认的责任与条件。'], ['Go-live depends on a customer identity provider. What should be clear first?','Access/config prerequisites, owners on both sides and confirmation criteria','Only the date','Assume implementers have all privileges','Critical dependencies need explicit owners and conditions.']),
      check(['验收负责人暂不可用，怎样处理？','记录待批准状态，使用预定的代理或升级路径','自行伪造签字','用测试通过替代负责人批准','技术检查和业务批准属于不同责任。'], ['The acceptance owner is unavailable. What should happen?','Record pending approval and use the agreed delegate or escalation path','Invent a sign-off','Use technical test success as approval','Technical checks and business approval have distinct ownership.'])
    ])
  ]),
  branch('setup', ['配置、权限与迁移', 'Configuration, access and migration'], ['在受控环境复现配置，核对角色和迁移前后数据。', 'Reproduce configuration in a controlled environment and check access and migrated data.'], [
    leaf('environments', ['环境与配置基线', 'Environments and baselines'], [sfia, live],
      ['登记环境、依赖、版本和可重复配置。将测试和生产的凭据隔离。', 'Record environments, dependencies, versions and repeatable configuration. Separate test and production credentials.'],
      ['为模拟工单系统写配置清单，区分演练和上线时的变更与核对。', 'Write a configuration checklist separating rehearsal and production checks.'], [
      check(['演练成功，但生产接口地址与权限不同，应怎么做？','核对生产差异、授权与必要的健康验证','复制测试密钥到生产','跳过检查因演练已通过','环境差异是上线验收的一部分。'], ['Rehearsal works but production endpoints and permissions differ. What next?','Review production differences, authorization and health checks','Copy test secrets into production','Skip checks because rehearsal passed','Environment differences need production verification.']),
      check(['怎样让另一位实施人员可复现配置？','登记版本、参数来源、依赖、顺序与验证','只发一张最终截图','只记操作者姓名','复现需要准确输入和步骤。'], ['What makes configuration repeatable by another implementer?','Versions, parameter sources, dependencies, sequence and checks','One final screenshot','The installer’s name only','Reproduction needs inputs and steps.'])
    ]),
    leaf('role-matrix', ['角色权限与复核', 'Role matrix and review'], [security],
      ['以岗位职责定义权限。用允许和拒绝案例验证角色，核对上线审批。', 'Define privileges from job duties. Verify allowed and denied paths with approval.'],
      ['为一线客服、主管和审计写最小权限矩阵，补上权限不足的用例。', 'Write a least-privilege matrix for support, supervisors and audit, including denied cases.'], [
      check(['只需查看工单的一线人员应如何配置？','只赋所需读取范围，验证不能改或导出超范围数据','授予系统管理员备用','让所有人共享一个账户','配置以最小所需操作与资源范围为准。'], ['What should a support agent who only views tickets receive?','Required scoped read access, with denied write and excess export verified','Administrator access in case it is useful','A shared account for everyone','Grant only the needed actions and resources.']),
      check(['同一人兼任两个角色，权限复核重点是什么？','叠加后的实际权限和是否违反职责分离','只看角色名称是否简洁','只检查其登录是否成功','最终有效权限可能超出单个角色预期。'], ['A user holds two roles. What should review focus on?','Effective combined permissions and separation of duties','Whether role names are short','Only whether sign-in succeeds','Combined access can exceed the intent of either role.'])
    ]),
    leaf('migration', ['迁移、对账与修正', 'Migration and reconciliation'], [migration, live],
      ['先映射字段、做试迁并保存失败清单。核对计数、主键、业务总量和抽样记录。', 'Map fields and rehearse migration with a failure register. Reconcile counts, keys, totals and samples.'],
      ['为旧工单迁移制定字段映射、失败处理和切换前后对账表。', 'Prepare field mapping, failure handling and reconciliation for ticket migration.'], [
      check(['新旧库行数相同，能否直接验收？','还需核对关键字段、唯一键、关系与业务值','同样行数已经证明逐字段一致','只需对比数据库文件大小','相同行数无法发现字段或关系错误。'], ['Source and target row counts match. Is migration accepted?','Also verify key fields, uniqueness, relationships and business values','Equal counts prove field-level parity','Compare file sizes only','Counts alone miss field or relationship errors.']),
      check(['试迁 5% 记录失败，首选处理？','记录失败类型、原始引用、责任人及重跑方案','把失败行记为已导入','清除历史记录后重试全量','有记录的失败才能修正与复核。'], ['Five percent fail in a rehearsal. What first?','Log failure types, source references, owners and rerun plan','Mark failed rows as imported','Delete history and rerun everything','Traceable failures can be corrected and verified.'])
    ])
  ]),
  branch('launch', ['验收与上线切换', 'Acceptance and cutover'], ['用用户验收和切换演练确定是否可上线。', 'Use user acceptance and a rehearsal to decide readiness.'], [
    leaf('uat', ['用户验收测试', 'User acceptance testing'], [test, live],
      ['由代表性业务角色执行关键任务，记录结果、缺陷、剩余风险和批准。', 'Have representative business users run critical journeys and record results, defects, risks and approval.'],
      ['设计工单创建、流转和关闭三条验收用例，写明角色和所需证据。', 'Design acceptance cases for ticket creation, routing and closure with roles and evidence.'], [
      check(['开发测试全部通过，能替代用户验收吗？','仍需代表业务用户按验收标准走查并批准','可以，开发自测与业务验收是同一结果','只要交付文档齐全即可','用户验收验证实际业务流程与适用性。'], ['Can all passing developer tests replace UAT?','Representative users still validate acceptance criteria and approve','Yes; the results are interchangeable','Yes if documents are complete','UAT verifies business suitability and real workflows.']),
      check(['上线前仍有阻塞级缺陷，如何处理？','记录证据和影响，按审批门槛暂停或处置后复验','隐藏缺陷并发布','改写验收标准让缺陷自动通过','有影响的例外应通过明确审批和复验。'], ['A blocking defect is open before launch. What next?','Record evidence and impact; stop or resolve and retest under the approval rules','Hide it and release','Rewrite acceptance to pass it automatically','Material exceptions need explicit review and retesting.'])
    ]),
    leaf('cutover', ['切换步骤与演练', 'Cutover and rehearsal'], [live],
      ['按时间列冻结、备份、迁移、切换、验证和通知。每步要有负责人和判断条件。', 'Sequence freeze, backup, migration, switch, verification and notice with owners and gates.'],
      ['为两小时窗口写模拟切换清单，指定第一轮试迁何时完成以及通知对象。', 'Plan a two-hour simulated cutover with a trial migration checkpoint and communication owners.'], [
      check(['哪条切换任务最可执行？','由迁移负责人在备份验证后执行导入并对账','有人抽空把数据搬过去','等上线之后再决定谁做','责任、顺序和核对条件让切换可执行。'], ['Which cutover step is actionable?','Migration owner imports after verified backup and reconciles output','Someone moves data when available','Assign ownership after launch','Ownership, ordering and verification make execution possible.']),
      check(['演练比上线窗口多耗时一小时，下一步？','重新核对步骤、时间和回退边界再定窗口','忽略耗时差，直接发布','删掉所有验收步骤省时','演练发现的时长差需要纳入上线计划。'], ['Rehearsal exceeds the cutover window by one hour. What next?','Review steps, timing and rollback limits before approving the window','Ignore the difference and ship','Remove all acceptance checks to save time','Rehearsal timing needs to inform go-live planning.'])
    ]),
    leaf('go-no-go', ['上线判断与回退', 'Go/no-go and rollback'], [live, test],
      ['预定义上线和回退门槛。验证数据兼容、可恢复性和谁批准执行。', 'Define go/no-go and rollback gates. Verify compatibility, recovery and approvers.'],
      ['写一张上线决策卡，列必需通过的用例、回退阈值及原服务恢复条件。', 'Write a go/no-go card with required tests, rollback triggers and criteria for the previous service.'], [
      check(['回退窗口将结束，但关键校验仍失败。如何处理？','遵循已定门槛决定停止或回退，保留证据和通知','继续拖到无法回退再判断','直接改写校验结果为成功','门槛应在仍能行动时触发。'], ['The rollback window is closing and a critical check fails. What should happen?','Use the agreed gate to stop or roll back and preserve evidence and notices','Wait until rollback becomes impossible','Rewrite the result as success','Gates should trigger while action is still possible.']),
      check(['切换后有新数据写入，回退方案要补什么？','新写入如何保留、对账或恢复及其影响范围','只恢复旧页面即可','默认新数据会自动出现在旧库','回退必须明确处理切换期间写入。'], ['New data was written after switching. What must rollback account for?','How new writes are retained, reconciled or restored and their impact','Only restore the old UI','Assume new data automatically appears in the old store','Handle writes made during cutover explicitly.'])
    ])
  ]),
  branch('handover', ['交接、培训与支持', 'Handover, training and support'], ['让运维、业务和一线支持能接手并验证后续问题。', 'Equip operations, business users and support to take ownership.'], [
    leaf('role-training', ['按角色培训与验收', 'Role-based training'], [training, handoff],
      ['按角色和任务设计练习，保存材料、问题入口和可观察的练习结果。', 'Train by role and task, retaining materials, question channels and observable outcomes.'],
      ['为一线与主管各写一个真实感的练习，说明练习成功怎样观察。', 'Write one realistic exercise each for agents and supervisors with observable success.'], [
      check(['如何检查一线已能按流程处理工单？','让其在演练环境完成指定场景并核对结果','只确认参加培训会议','只问“是否听懂”','可观察演练比出席记录更能反映流程理解。'], ['How do you check that an agent can handle a ticket?','Have them complete an assigned scenario in a rehearsal environment and inspect the result','Only confirm training attendance','Only ask whether they understood','An observed exercise tells more about the workflow than attendance.']),
      check(['不同岗位需要完成不同操作，培训材料如何组织？','按角色的工作任务和权限组织场景','给所有角色同一份管理员操作手册','只列产品菜单名称','按任务组织便于迁移到日常工作。'], ['Different roles perform different actions. How should training be organized?','By role, tasks and permissions','One admin manual for every role','Only list menu names','Task-based materials transfer to daily use.'])
    ]),
    leaf('support-triage', ['报障分诊与复现', 'Support triage and reproduction'], [incident, handoff],
      ['收集版本、环境、影响、复现和最近变化。按严重程度与服务约定升级。', 'Collect build, environment, impact, steps and recent changes. Escalate using severity and service agreements.'],
      ['把“系统登录不了”整理为一次支持记录，写要询问的信息和升级条件。', 'Turn “sign-in is broken” into a support record with evidence questions and escalation triggers.'], [
      check(['客户只说“系统坏了”，第一步该收集什么？','具体任务、时间、受影响范围、错误和复现步骤','先问使用的字体','先要求重装整个系统','结构化观察帮助隔离影响和复现。'], ['A customer only says “the system is broken.” What should you collect first?','Task, time, scope, error and reproduction steps','The font in use','Ask them to reinstall everything','Structured observations narrow impact and enable reproduction.']),
      check(['多个部门同时无法使用核心功能，优先怎么做？','按约定严重度及时升级，并记录已知证据','等待全部信息齐备才上报','把每条工单都标低优先级','重大影响可先升级，同时持续补充证据。'], ['Several teams lose a core function. What should happen first?','Escalate per severity policy and record known evidence','Wait for every fact before escalating','Mark all cases low priority','Major impact can justify escalation while evidence is gathered.'])
    ]),
    leaf('handoff', ['移交清单与跟进', 'Handoff and follow-up'], [handoff, live],
      ['交付环境、手册、访问申请、验收和未决事项，给后续责任和更新时间。', 'Hand over environments, runbooks, access requests, acceptance and open items with owners and update dates.'],
      ['写一个交接清单，覆盖验收材料、运行手册、已知问题、支持渠道和复查日期。', 'Write a handoff checklist with acceptance evidence, runbook, known issues, support channels and next review.'], [
      check(['移交时仍有已知问题，应怎样处理？','登记影响、临时措施、负责人和待复查日期','删掉问题以便验收','把问题写成已解决','未决项需要可跟进的公开记录。'], ['How do you hand over a known unresolved issue?','Record impact, workaround, owner and review date','Remove the issue for acceptance','Mark it solved','Open items need traceable follow-up.']),
      check(['哪项最能验证接收方能运行支持？','由接收方按手册演练关键处理并记录结果','确认已发文件即可','只共享一个管理员密码','交接要验证接收方可以执行关键动作。'], ['How can the receiving team’s support readiness be checked?','Have them rehearse key procedures from the runbook and record outcomes','Confirm a file was sent','Share one administrator password','Handoff should verify the receiver can execute key actions.'])
    ])
  ])
]);

