import careers from './content/career-exploration.json' with {type:'json'};

// Editorial reading layer over the existing public career material, not a new
// occupational assessment or a replacement for its versioned source records.
const copy = {
  data: {
    question:['业务数字变了，先查哪里？','A business number has changed. Where do you look first?'],
    answer:['数据分析把业务方的问题变成能核对的指标和解释。你不仅要算出变化，还要让使用结论的人知道依据是什么、目前还不能下什么结论。','Data analysis turns a business question into measures and explanations that others can check. You establish what changed, show the evidence and explain what the data cannot yet establish.'],
    workMoments:[
      {title:['问清要做什么决定','Clarify the decision'],text:['和业务方确认统计对象、时间范围与分母，避免各说各的“增长”或“下降”。','Agree the population, time period and denominator with the business owner so that everyone means the same thing by growth or decline.'],output:['指标口径卡','Metric definition']},
      {title:['把数据核对清楚','Reconcile the data'],text:['用SQL或表格处理重复、缺失和关联，保留规则，让同事能从原数据重算。','Use SQL or a spreadsheet to handle duplicates, missing values and joins, keeping enough detail for a colleague to reproduce the result.'],output:['查询、分组表与质量记录','Queries, grouped results and quality notes']},
      {title:['把发现讲给决策者','Explain the finding'],text:['用合适的图表说明变化集中在哪里，把观察、可能原因和下一步核对分开。','Show where the change is concentrated with an appropriate chart, separating observations, possible explanations and the next check.'],output:['分析简报与下一步建议','Analysis brief and next checks']},
    ],
    boundary:['数据分析更关心“这些数据能回答什么业务问题”；数据工程更关心“数据怎样持续、可靠地交付”。会SQL是两者的交集，不是两种工作的全部。','Analysis asks what the data can tell a decision-maker; data engineering makes that data arrive reliably. SQL is shared groundwork, not the whole of either role.'],
    firstMove:['先做一份渠道变化小简报','Start with a short channel-change brief'],
  },
  ai: {
    question:['怎样让AI在一个具体任务上可靠工作？','How do you make AI reliable for a specific task?'],
    answer:['先明确AI要帮谁做什么，再选择数据、模型和实现方式。工作的重点不只是得到一次像样的回答，还包括评估错误、处理失败，并把系统接进实际流程。','Start with who needs help and what the task requires, then choose the data, model and implementation. The work includes measuring errors, handling failures and integrating the system, beyond producing one convincing answer.'],
    workMoments:[
      {title:['把任务和边界说清','Define the task and its limits'],text:['和产品、领域人员约定输入、可用资料、预期输出与错误代价，决定哪些情况应交给人工。','Agree inputs, permitted sources, expected outputs and error consequences with product and domain colleagues, including when a person must take over.'],output:['任务与评估方案','Task and evaluation plan']},
      {title:['做出可以复现的方案','Build a reproducible solution'],text:['围绕任务组织数据、模型或调用流程，保留配置和版本，使实验或应用能够重现。','Organise the data, model or calling workflow around the task and record configurations and versions so the experiment or application can be reproduced.'],output:['实验记录或集成原型','Experiment records or integrated prototype']},
      {title:['用错误决定是否交付','Use failures to judge delivery'],text:['用独立样本检查回答或预测，分类记录错误，再验证改动和异常处理是否有效。','Check answers or predictions against held-out examples, classify failures and verify the changes and failure-handling behaviour.'],output:['评估、错误与运行说明','Evaluation, error analysis and operating notes']},
    ],
    boundary:['AI应用、算法研究和平台工程会协作，但准备重点不同。本页的资料问答案例侧重应用评估，不能代表所有AI岗位。','AI applications, algorithm research and platform engineering collaborate but require different preparation. The document-answering case here illustrates application evaluation, not every AI role.'],
    firstMove:['先判断三条AI回答有没有依据','Start by checking the evidence behind three AI answers'],
  },
  security: {
    question:['哪些风险值得处理，凭什么判断？','Which risks need action, and what evidence supports that?'],
    answer:['网络安全先弄清要保护的资产、业务影响和授权范围，再检查控制、分析异常并推动处理。结论需要能回到证据，恢复或整改之后也要复核。','Cybersecurity starts with the assets, business impact and authorised scope. It checks controls, investigates anomalies and follows through on action, keeping conclusions traceable to evidence and verifying recovery or remediation.'],
    workMoments:[
      {title:['圈清资产与授权','Establish assets and authority'],text:['和业务、系统负责人确认需要保护什么、允许检查什么，以及风险可能影响谁。','Confirm what needs protection, what may be inspected and who could be affected with business and system owners.'],output:['资产、风险与检查范围','Assets, risks and inspection scope']},
      {title:['核对控制与异常','Check controls and anomalies'],text:['检查访问、配置或日志，把事实、推测和缺失信息分开，不将一条异常直接认定为攻击。','Inspect access, configuration or logs, separating facts, hypotheses and missing information rather than treating one anomaly as proof of an attack.'],output:['控制检查与事件时间线','Control checks and incident timeline']},
      {title:['推动处理并复核','Follow through and verify'],text:['向有权限的负责人说明影响与建议，核对整改或恢复结果，留下后续接手者能用的记录。','Explain impact and recommendations to an authorised owner, check remediation or recovery and leave a record the next responder can use.'],output:['研判、整改与响应交接','Analysis, remediation and response handoff']},
    ],
    boundary:['安全运营、应用安全等方向有不同任务；它们都需要明确授权与证据。工具发现、异常日志或一次实验，不能直接等同完整安全结论。','Security operations and application security involve different work, grounded in authority and evidence. A tool finding, unusual log or single experiment does not establish a complete security conclusion.'],
    firstMove:['先写一份可接手的事件说明','Start with an incident note another responder can use'],
  },
  ops: {
    question:['服务出问题时，怎样安全恢复？','When a service fails, how do you restore it safely?'],
    answer:['运维工程让系统持续可用，并让变更和故障都有可执行的处理办法。除了排障，也要管理环境、监控、备份与自动化，确认业务真的恢复。','Operations keeps systems usable and makes changes and incidents manageable. It covers environments, monitoring, backups and automation alongside diagnosis, checking that the business path has actually recovered.'],
    workMoments:[
      {title:['接好一项服务','Prepare the service for operation'],text:['核对环境、依赖、权限与部署步骤，把正常状态和停止、回退条件记录清楚。','Check environments, dependencies, permissions and deployment steps, recording the normal baseline and stop or rollback conditions.'],output:['运行基线与变更手册','Operating baseline and change runbook']},
      {title:['用信号缩小故障范围','Narrow the incident with evidence'],text:['结合用户反馈、指标、日志与变更记录判断影响，再选择排查或恢复动作。','Combine user reports, metrics, logs and recent changes to assess impact before choosing a diagnostic or recovery action.'],output:['告警与故障时间线','Alert and incident timeline']},
      {title:['恢复后继续验收','Verify after recovery'],text:['检查服务、数据和核心业务流程，再把重复风险转为可跟进的复盘和自动化改进。','Verify the service, data and core business path, then turn recurring risks into follow-up actions and automation.'],output:['恢复验收与复盘行动','Recovery acceptance and follow-up actions']},
    ],
    boundary:['系统运维、DevOps协作实践与SRE有交集，但不是同一个岗位名称。SRE更强调用软件工程和服务目标处理可靠性取舍；是否值班需看具体岗位。','Systems operations, DevOps practices and SRE overlap without being interchangeable job titles. SRE places particular weight on software engineering and service objectives; on-call duties depend on the actual role.'],
    firstMove:['先用三个观测窗口判断是否恢复','Start by judging recovery across three observation windows'],
  },
  frontend: {
    question:['用户下一步怎么操作，界面说清了吗？','Does the interface make the next action clear?'],
    answer:['前端开发把用户任务、设计和业务规则变成真正可操作的界面。既要实现正常流程，也要处理等待、出错、重试和返回，让不同操作方式下的体验保持清楚。','Frontend development turns user tasks, designs and business rules into a working interface. It handles waiting, errors, retries and return journeys as well as the happy path, keeping interaction clear across input methods.'],
    workMoments:[
      {title:['拆清流程与状态','Map the flow and its states'],text:['和产品、设计及后端确认用户要完成什么、会拿到哪些数据，以及失败时如何继续。','Agree the user task, available data and failure recovery with product, design and backend colleagues.'],output:['界面流程与状态约定','Interface flow and state contract']},
      {title:['做成能操作的页面','Build an interactive page'],text:['用HTML、CSS和JavaScript组织结构、布局和数据交互，避免错误反馈不清或重复提交。','Use HTML, CSS and JavaScript to implement structure, layout and data interactions, avoiding unclear errors and duplicate submissions.'],output:['可运行界面与源码','Working interface and source']},
      {title:['验证体验再交付','Verify the experience before delivery'],text:['实际检查键盘、可访问性、浏览器状态与性能，把发现的问题和修订结果留下来。','Check keyboard use, accessibility, browser states and performance, keeping a record of defects and revisions.'],output:['交互验收与发布说明','Interaction checks and release notes']},
    ],
    boundary:['前端重点是用户在界面上完成任务的过程；后端负责服务端规则与数据处理。两者通过接口协作，页面显示成功不能替代服务端验证。','Frontend work focuses on completing a task through the interface; backend work enforces server-side rules and data handling. They meet at the API, and a success message cannot replace server-side validation.'],
    firstMove:['先只用键盘走完一次错误恢复','Start by recovering from a form error using only the keyboard'],
  },
  backend: {
    question:['请求到了系统，怎样按规则处理？','A request reaches the system. How should it be handled?'],
    answer:['后端开发把业务规则做成可调用的服务，管理数据、权限和失败处理。调用者不仅要拿到结果，还需要明确的错误、稳定的接口和可追查的运行记录。','Backend development makes business rules available through services, handling data, permissions and failures. Callers need clear errors, stable contracts and traceable operation as well as a result.'],
    workMoments:[
      {title:['约定接口与权限','Define the API and permissions'],text:['和调用方确认字段、状态、错误及谁能操作哪些对象，让规则不依赖页面是否隐藏按钮。','Agree fields, states, errors and object permissions with callers, enforcing rules independently of whether the interface hides a button.'],output:['接口契约与权限矩阵','API contract and permission matrix']},
      {title:['实现规则与数据变更','Implement rules and data changes'],text:['组织服务逻辑、数据约束和事务，处理重复请求、失败与外部依赖。','Implement service logic, data constraints and transactions, accounting for retries, failures and external dependencies.'],output:['服务实现与数据模型','Service implementation and data model']},
      {title:['把异常也验证清楚','Verify failure paths too'],text:['用集成测试检查身份、边界和一致性，保留日志与发布、迁移说明供运行人员接手。','Use integration tests to check identities, boundaries and consistency, with logs and release or migration notes for operators.'],output:['集成测试与运行说明','Integration tests and operating notes']},
    ],
    boundary:['后端不只是“把数据返回给页面”。数据权限、事务和重试同样重要；前端、数据工程及运维分别处理与它衔接的其他责任。','Backend work involves more than returning data to a page. Permissions, transactions and retries matter, while frontend, data engineering and operations handle adjoining responsibilities.'],
    firstMove:['先补全一份对象访问测试矩阵','Start by completing an object-access test matrix'],
  },
  engineering: {
    question:['下游每天拿到的数据，能放心使用吗？','Can downstream teams rely on the data they receive each day?'],
    answer:['数据工程把分散的数据接入、转换并按约定交给下游。除了算对一次，还要说明数据从哪里来、什么时候更新，以及失败后怎样重跑而不制造重复。','Data engineering ingests and transforms data for downstream use. Beyond one correct run, it establishes provenance, delivery timing and recovery that does not introduce duplicates.'],
    workMoments:[
      {title:['和上下游约定数据','Agree the data contract'],text:['把记录粒度、主键、字段含义、权限与交付时间说清，让接手者知道每行代表什么。','Agree record grain, keys, field meaning, access and delivery timing so consumers understand what each row represents.'],output:['数据契约与模型','Data contract and model']},
      {title:['搭起可追溯的流程','Build a traceable pipeline'],text:['实现接入、转换、关联与质量检查，保留来源、批次及规则版本。','Implement ingestion, transformations, joins and quality checks, retaining source, batch and rule versions.'],output:['转换代码、字典与血缘','Transformation code, dictionary and lineage']},
      {title:['让失败能够恢复','Make failures recoverable'],text:['检查重跑、回填与发布行为，隔离坏记录，并通知受数据变化影响的使用者。','Check reruns, backfills and publication, isolate bad records and notify consumers affected by data changes.'],output:['质量记录与重跑方案','Quality records and rerun plan']},
    ],
    boundary:['数据工程侧重可靠的数据供给；数据分析侧重用数据回答问题。它也与数据库、数仓和平台工程交叉，实际职责需要按团队拆清。','Data engineering focuses on reliable data supply; analysis uses it to answer questions. Database, warehouse and platform work overlap, with the actual boundaries set by the team.'],
    firstMove:['先为一次分区重跑写检查规则','Start with checks for rerunning a data partition'],
  },
  testing: {
    question:['这个功能能发布吗，还留下什么风险？','Can this feature be released, and what risks remain?'],
    answer:['软件测试把需求与风险变成可执行的检查，向团队提供可复现的质量证据。工作不止找出错误，还要说明测过什么、修复是否有效、哪些范围仍未验证。','Software testing turns requirements and risks into executable checks and reproducible evidence. It identifies defects and explains what was tested, whether fixes worked and what remains unverified.'],
    workMoments:[
      {title:['先确定预期与风险','Establish expectations and risks'],text:['读懂规则，与产品澄清歧义，再选择关键边界、异常和权限场景。','Understand the rules, clarify ambiguity with product colleagues and select important boundary, failure and permission scenarios.'],output:['测试范围与风险说明','Test scope and risk notes']},
      {title:['执行并留下复现证据','Execute and preserve reproducible evidence'],text:['用确定的数据和版本比较实际与预期，把环境、步骤和影响写进缺陷记录。','Use known data and versions to compare observations with expectations, recording the environment, steps and impact.'],output:['用例、执行与缺陷记录','Cases, execution and defect records']},
      {title:['验证修复并交代遗漏','Verify fixes and explain omissions'],text:['重测原缺陷并安排相关回归，让发布负责人看见结果、未测范围和剩余风险。','Retest the defect and run relevant regression checks, giving the release owner results, omissions and remaining risks.'],output:['回归结果与质量摘要','Regression results and quality summary']},
    ],
    boundary:['测试提供发布判断所需的证据，不单独替所有人决定上线。自动化、探索测试和手工检查是可组合的方法，不是简单的高低等级。','Testing supplies evidence for a release decision rather than making it alone. Automation, exploratory testing and manual checks are complementary methods, not a simple hierarchy.'],
    firstMove:['先为新折扣门槛写边界预期','Start with expected results at a new discount boundary'],
  },
  software: {
    question:['怎样把一条规则做成别人能维护的程序？','How do you turn a rule into software someone else can maintain?'],
    answer:['通用软件开发把需求拆成程序、模块和可验证的行为。既可能开发新功能，也可能读懂旧代码后小步修改，并解释设计取舍、验证范围和运行方法。','Software development turns requirements into programs, modules and verifiable behaviour. It can mean building a feature or making a small change to existing code, explaining design choices, validation and operation.'],
    workMoments:[
      {title:['把问题拆成明确行为','Turn the need into explicit behaviour'],text:['与使用者确认输入、输出、错误和约束，先找清楚要改变什么、保留什么。','Agree inputs, outputs, errors and constraints with users, identifying what must change and what must remain.'],output:['需求与设计说明','Requirements and design notes']},
      {title:['实现并控制改动范围','Implement a bounded change'],text:['选择数据结构和模块接口，使用版本管理保留小步改动，并与同伴核对取舍。','Choose data structures and module interfaces, keep changes small in version control and review the trade-offs with peers.'],output:['程序、代码与变更记录','Program, source and change record']},
      {title:['验证后交给使用者','Verify and hand over'],text:['用测试和调试确认正常、异常及兼容行为，写出构建、运行和已知限制。','Use tests and debugging to verify normal, failure and compatibility behaviour, documenting how to build and run it and what remains limited.'],output:['测试、运行与维护说明','Tests, operating and maintenance notes']},
    ],
    boundary:['这是涵盖工具、应用和系统的探索方向，不要求一个人掌握所有平台。前端与后端是其中常见分工，重点应落到具体产品和任务。','This exploration area spans tools, applications and systems without requiring every platform. Frontend and backend are common specialisations; preparation should follow a concrete product and task.'],
    firstMove:['先为一段折扣规则写验收与错误用例','Start with acceptance and error cases for a discount rule'],
  },
  delivery: {
    question:['系统装好了，业务真的能接手使用吗？','The system is installed. Can the business actually take it over?'],
    answer:['IT实施交付把选定方案落到客户环境和业务流程中。需要把配置、数据、验收、切换与培训串起来，让用户能操作、支持团队能接手、遇到问题有退路。','IT implementation brings a chosen solution into the customer’s environment and workflow. It connects configuration, data, acceptance, cutover and training so users can operate it, support can take over and recovery remains possible.'],
    workMoments:[
      {title:['问清客户怎样算完成','Agree what acceptance means'],text:['和实际用户、业务负责人梳理流程与范围，把需求转成可以验证和签认的场景。','Work with users and business owners to define scope and turn needs into scenarios that can be checked and accepted.'],output:['流程差异与验收标准','Process gaps and acceptance criteria']},
      {title:['把环境和数据接起来','Connect environments and data'],text:['协调配置、接口、权限与字段映射，试迁数据后核对数量、关键字段和实际业务操作。','Coordinate configuration, interfaces, access and field mappings, then reconcile trial migration data and real business operations.'],output:['配置、映射与UAT记录','Configuration, mappings and UAT records']},
      {title:['有条件地切换并交接','Cut over with clear gates and handoff'],text:['明确上线窗口、停止与回退条件，培训用户，并把遗留问题交到具体接手者。','Define the cutover window, stop and rollback conditions, train users and hand remaining issues to named receiving roles.'],output:['切换方案、培训与交接包','Cutover plan, training and handoff package']},
    ],
    boundary:['实施交付强调客户业务可用和责任交接，不等于只安装软件。它与开发、数据和运维协作，具体工作也随行业软件、云和网络方案变化。','Implementation emphasises business usability and handover rather than installation alone. It works with development, data and operations, with responsibilities varying by business software, cloud or network solution.'],
    firstMove:['先做一次上线或暂缓的验收判断','Start with an evidence-based go or no-go decision'],
  },
};

const basisFields = {
  question:['occupation.intro','case.question'],
  answer:['occupation.intro','occupation.outputs'],
  workMoments:['occupation.flow','occupation.outputs','workflow','deliverables'],
  boundary:['occupation.boundary','scope'],
  firstMove:['practice.title','practice.steps','practice.deliverable'],
};

const localize = (value,language) => {
  if(Array.isArray(value)&&value.length===2&&value.every(v=>typeof v==='string'))return value[language==='en'?1:0];
  if(Array.isArray(value))return value.map(v=>localize(v,language));
  return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,localize(v,language)]));
};

export function getCareerReadingGuide(id,language='zh') {
  if(!Object.hasOwn(copy,id)||!Object.hasOwn(careers,id))return null;
  return {
    ...localize(copy[id],language),
    sourceVersion:careers[id].version,
    sourceIds:[...careers[id].occupation.sourceIds],
    basisFields:structuredClone(basisFields),
    editorialNature:'summary_of_existing_public_career_content',
  };
}

// Register these explicit pairs with the app's bilingual checker. This map is
// public editorial copy; learner writing and private records never enter it.
export const careerReadingGuideTranslations = {};
function collect(value) {
  if(Array.isArray(value)&&value.length===2&&value.every(v=>typeof v==='string'))careerReadingGuideTranslations[value[0]]=value[1];
  else if(Array.isArray(value))value.forEach(collect);
  else Object.values(value).forEach(collect);
}
Object.values(copy).forEach(collect);
