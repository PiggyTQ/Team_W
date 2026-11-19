import {source, tree, branch, leaf, check} from './definitions.mjs';

const ctfl = source('ISTQB', 'Certified Tester Foundation Level syllabus', 'https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf', 'v4.0.1');
const sample = source('ISTQB', 'CTFL official sample exam C', 'https://istqb.org/wp-content/uploads/sdm-uploads/ISTQB_CTFL_v4.0_Sample-Exam-C-Questions_v1.6.pdf', 'v1.6');
const swe = source('IEEE Computer Society', 'SWEBOK Guide', 'https://www.computer.org/education/bodies-of-knowledge/software-engineering', 'v4.0');
const pw = source('Playwright', 'Best practices', 'https://playwright.dev/docs/best-practices');
const pytest = source('pytest', 'Parametrize tests and fixtures', 'https://docs.pytest.org/en/stable/how-to/parametrize.html');
const gha = source('GitHub Docs', 'Building and testing Python', 'https://docs.github.com/en/actions/tutorials/build-and-test-code/python');

export default tree('testing', [ctfl, swe], [
  branch('analysis', ['需求与风险', 'Requirements and risk'], ['从需求与风险确定优先场景、分层和覆盖范围。', 'Turn requirements and risk into priorities, test levels and coverage.'], [
    leaf('acceptance', ['验收条件与可追踪性', 'Acceptance and traceability'], [ctfl],
      ['从需求提取可观察的前置条件、动作和预期。用关联表核对未覆盖项。', 'Extract observable preconditions, actions and expected outcomes. Use traceability to find gaps.'],
      ['把一个退货需求改写为三个验收条件，标注每条用例对应的需求。', 'Write three acceptance criteria for a return rule and map each test to its requirement.'], [
      check(['“页面响应应很快”怎样变成可测需求？','明确环境、样本和响应时间阈值','保留主观描述不设条件','在测试报告只写通过','验收需要可观察且可重复的条件。'], ['How can “the page should be fast” become testable?','Specify environment, sample and response-time threshold','Keep it subjective','Record pass without conditions','Acceptance needs observable, repeatable criteria.']),
      check(['一条验收条件没有关联用例，如何处理？','标记覆盖缺口，增加用例或说明排除理由','认为同模块就自动覆盖','删除需求使统计好看','追踪关系使覆盖缺口可见。'], ['One criterion has no linked test. What should happen?','Record the gap and add a test or justify exclusion','Assume module-level tests cover it','Delete the requirement to improve the report','Traceability makes coverage gaps visible.'])
    ]),
    leaf('risk-priority', ['产品风险与优先级', 'Product risk and priority'], [ctfl],
      ['用可能性与影响评估产品风险，把有限时间先给高影响路径。', 'Assess likelihood and impact and prioritize high-risk flows when time is limited.'],
      ['列出登录、支付和帮助文档的失效风险，说明先测哪个以及为什么。', 'List sign-in, payment and help-page risks and explain the test order.'], [
      check(['时间有限，支付重复扣款风险高，帮助页小排版问题风险低。先测什么？','优先验证支付幂等和失败重试','优先核对帮助页字体','随机挑场景以避免决定','以产品风险组织测试优先顺序。'], ['Time is limited and duplicate charges are high-risk. What first?','Verify payment idempotency and retries','Review help-page fonts','Pick scenarios at random','Use product risk to set priority.']),
      check(['发现重大影响但发生概率未知，怎样记录？','记录影响和概率未知，安排取证并说明暂定优先级','因为未知就填零风险','直接把概率写成确定的 100%','已知影响和待验证概率应分开。'], ['A major impact is known but likelihood is uncertain. What should be recorded?','Impact, unknown likelihood, evidence needed and provisional priority','Zero risk because it is unknown','A known probability of 100%','Separate known impact from uncertain likelihood.'])
    ]),
    leaf('test-levels', ['测试层级与策略', 'Test levels and strategy'], [ctfl, swe],
      ['在最合适的层级验证风险。覆盖单元、集成、系统和用户验收的不同目标。', 'Verify each risk at an appropriate level. Unit, integration, system and acceptance have different objectives.'],
      ['为购物车写一份策略，分配价格计算、支付接口和用户端结账验证。', 'Plan cart checks for price calculation, payment integration and checkout as a user.'], [
      check(['纯折扣函数的边界逻辑首先适合什么？','单元测试','只在生产做验收','等待每月人工走查','局部纯逻辑可在低成本层验证。'], ['Where should you first check a pure discount function’s edge cases?','Unit tests','Production acceptance only','A monthly manual walkthrough','Local pure logic can be verified in a low-cost layer.']),
      check(['真实存储、服务调用的契约不兼容，哪个层级最直接？','集成测试','只看组件名称','仅复核 UI 截图','集成测试关注组件或系统的交互。'], ['Which layer directly tests incompatible service/storage contracts?','Integration tests','Inspect component names only','Review UI screenshots only','Integration checks cover interactions between parts.'])
    ])
  ]),
  branch('design', ['测试设计技术', 'Test design techniques'], ['用分区、决策表和状态转换减少遗漏。', 'Use partitions, decision tables and transitions to reduce gaps.'], [
    leaf('boundary', ['等价类与边界值', 'Partitions and boundaries'], [ctfl],
      ['按行为划分有效和无效类。对有序边界选取刚好在界内、界外的值。', 'Partition by behavior. For ordered ranges, sample at the boundary and just outside.'],
      ['给 1–10 的购买数量写有效、无效类，并列出最低和最高值附近的输入。', 'Design partitions and boundary checks for quantities 1–10 inclusive.'], [
      check(['有效整数 1–10，哪组覆盖两端紧邻内外值？','0、1、10、11','2、3、8、9','1、5、9、10','0/1 和 10/11 分别跨越边界。'], ['Valid integers are 1–10. Which set covers adjacent values across both edges?','0, 1, 10, 11','2, 3, 8, 9','1, 5, 9, 10','0/1 and 10/11 cross the two boundaries.']),
      check(['一组值应进入同一等价类的依据是什么？','按规范预期有同样的处理行为','数字位数恰好相同','测试人员偏好某个值','等价是关于系统预期行为。'], ['What justifies putting values in the same equivalence partition?','They have the same expected handling under the specification','They have the same number of digits','A tester prefers one value','Equivalence is based on expected system behavior.'])
    ]),
    leaf('decision-tables', ['决策表与组合', 'Decision tables and combinations'], [ctfl],
      ['把条件组合映射为动作。区分不可能条件与不影响结果的条件。', 'Map condition combinations to actions. Distinguish impossible combinations from irrelevant conditions.'],
      ['为会员和订单金额两条件的运费规则写决策表，每条可行规则安排用例。', 'Build a shipping-fee decision table for membership and order amount and test feasible rules.'], [
      check(['两个独立布尔条件在简化前最多有几种组合？','4','2','8','每个条件两种取值，组合数为 2×2。'], ['How many combinations can two independent boolean conditions produce before simplification?','4','2','8','Each condition has two values, yielding 2×2 combinations.']),
      check(['某条件无论真假都不改变这条规则的动作，如何简化？','在该规则标记无关，并保留可追踪的合并依据','把整条规则删除','把条件强制固定为真','决策表可合并相同结果且该条件无关的组合。'], ['A condition does not change an action for a rule. How can you simplify?','Mark it as irrelevant for that rule and keep the reasoning','Delete the rule entirely','Force the condition to true','Rules with the same action can merge when the condition does not matter.'])
    ]),
    leaf('state-transition', ['状态转换与非法事件', 'State transitions and invalid events'], [ctfl],
      ['列出当前状态、事件、条件和下一状态。检查合法转换与被拒绝的转换。', 'Map current state, event, condition and next state. Test allowed and denied transitions.'],
      ['为待付款、已支付、已取消写状态图和一次重复支付的用例。', 'Sketch pending, paid and canceled states and test a repeated payment.'], [
      check(['同一事件在不同订单状态表现不同，哪种设计更适合？','状态转换测试','只选一个普通输入值','不记录订单初始状态','状态转换测试明确状态与事件组合。'], ['The same event behaves differently by order state. Which technique suits it?','State transition testing','Sample only one ordinary input value','Omit initial state','State transition checks capture state/event combinations.']),
      check(['已取消订单再次收到支付，应验证什么？','按规则拒绝或处理，并核对最终状态和副作用','只确认有一条响应','只截图按钮存在','预期不仅是响应，还有状态和副作用。'], ['Payment is requested for a canceled order. What should the test assert?','Rule-defined handling, final state and side effects','That any response appears','That the button exists','Expected results include state and side effects.'])
    ])
  ]),
  branch('defects', ['执行、缺陷与复核', 'Execution and defects'], ['留下可重现的证据，正确区分缺陷确认与回归。', 'Capture reproducible evidence and separate confirmation testing from regression.'], [
    leaf('exploratory', ['探索式测试', 'Exploratory testing'], [ctfl],
      ['给探索设定主题、范围和时间。边学边设计用例，并记录线索和后续。', 'Set a charter, scope and timebox. Design while learning and record findings and next checks.'],
      ['给购物车写一个探索主题，覆盖异常刷新和多标签操作，记下观察和未知。', 'Write a cart exploration charter for refresh and multi-tab behavior, with observations and unknowns.'], [
      check(['探索式测试怎样让下一位测试者接续？','保存主题、环境、路径、线索和未覆盖范围','只报告执行时间','不留下记录以保持自由','轻量记录可保留探索价值。'], ['How can another tester continue an exploratory session?','Record charter, environment, paths, findings and gaps','Report elapsed time only','Leave no records to preserve freedom','Lightweight records retain the value of exploration.']),
      check(['现场发现一条新线索后，什么做法适合探索？','根据线索调整后续用例，并保留测试目标','完全忽略线索，因为未写在脚本中','不再核对任何条件','探索将学习和后续测试设计结合。'], ['A session reveals a new lead. What fits exploratory testing?','Adapt follow-up cases while retaining the charter','Ignore it because it was not scripted','Stop checking any conditions','Exploration integrates learning with test design.'])
    ]),
    leaf('defect-reproduction', ['缺陷复现与分级', 'Defect reproduction'], [ctfl, swe],
      ['记录版本、环境、前置、步骤、预期、实际与证据。区分影响严重度和处理优先级。', 'Record build, environment, preconditions, steps, expected/actual and evidence. Separate severity from priority.'],
      ['为偶发重复提交写缺陷单，写明用户环境、网络状态、频率和最短步骤。', 'File a report for intermittent double submission with environment, network, frequency and minimal steps.'], [
      check(['开发反馈无法复现，最先补什么？','精确版本、数据和操作时序，以及实际结果证据','增加描述中的感叹号','直接改成已修复','复现需要具体环境和步骤。'], ['A developer cannot reproduce the report. What do you add first?','Exact build, data, timing and evidence of the actual outcome','More exclamation marks','Mark it fixed','Reproduction requires concrete conditions and steps.']),
      check(['严重度和优先级分别表示什么？','影响程度与处理先后','同一个值，用哪个都一样','发现时间与报告长度','严重度是影响，优先级还受业务时机等因素影响。'], ['What do severity and priority mean?','Impact and order of attention','They are interchangeable','Discovery time and report length','Severity is impact; priority can also reflect timing and other factors.'])
    ]),
    leaf('retest-regression', ['确认测试与回归', 'Confirmation and regression'], [ctfl],
      ['先确认原缺陷不再出现，再按变更影响检查周边路径。记录未跑范围。', 'Confirm the original failure is fixed, then check surrounding paths based on impact. Record unrun scope.'],
      ['为退款页的修复写原缺陷复测，以及同模块两项回归用例。', 'Plan a refund fix confirmation plus two impacted regression cases.'], [
      check(['重跑原缺陷的失败步骤属于什么？','确认测试','压力测试','数据迁移','确认测试验证缺陷的修复。'], ['Rerunning the original failure steps is what?','Confirmation testing','Load testing','Data migration','Confirmation testing verifies the fix.']),
      check(['修复后检查相邻功能是否被破坏，属于什么？','回归测试','只有验收记录','只测拼写','回归关注变更是否引入其他不良影响。'], ['Checking adjacent functionality after a fix is what?','Regression testing','Only an acceptance note','Spelling review','Regression looks for unintended effects of change.'])
    ])
  ]),
  branch('automation', ['自动化与持续交付', 'Automation and CI'], ['选择稳定断言，隔离测试数据，留下持续集成证据。', 'Choose stable assertions, isolate data and produce CI evidence.'], [
    leaf('test-data', ['测试数据与隔离', 'Test data and isolation'], [pw, pytest],
      ['用独立且可重置的测试数据。参数化覆盖同一规则的边界，避免用例相互依赖。', 'Use isolated, resettable data. Parameterize boundary cases and avoid inter-test dependencies.'],
      ['设计三个并行的购物车用例，每条都有独立用户和初始化方法。', 'Design three parallel cart cases, each with an independent user and setup.'], [
      check(['并行用例共享同一账户且互相改订单，如何修？','每条测试生成隔离的数据和清理方法','固定等待几秒再运行','把用例全部改为使用生产账号','隔离避免跨测试状态污染。'], ['Parallel tests mutate orders under one shared account. What helps?','Give each test isolated data and cleanup','Add a fixed delay','Switch every test to production accounts','Isolation prevents cross-test state contamination.']),
      check(['同一输入规则需覆盖 0、1、10、11，怎样组织？','参数化输入和对应预期','只保留一个输入以缩短代码','让每次测试随机无记录地选值','参数化保持同一规则与不同边界可见。'], ['How do you cover 0, 1, 10 and 11 for one rule?','Parameterize values and expected outcomes','Keep only one input to shorten the code','Randomly choose a value without recording it','Parameterization expresses one rule across known cases.'])
    ]),
    leaf('stable-assertions', ['稳定定位与断言', 'Stable locators and assertions'], [pw],
      ['围绕可见行为与角色定位，并等待实际条件。失败时保留可定位证据。', 'Locate user-facing behavior and roles and wait for real conditions. Capture diagnostic evidence on failure.'],
      ['用按钮名称和可见成功提示写一条结账检查，考虑慢网络和返回错误。', 'Write a checkout check using control names and visible confirmation, including slow and failed responses.'], [
      check(['等待异步保存成功，哪项断言较稳？','等待可见的保存成功提示或预期行为','固定休眠三秒后直接通过','用深层 CSS 结构判断成功','条件等待比猜测固定延迟可靠。'], ['Which assertion is stable for async save?','Wait for visible confirmation or expected behavior','Sleep three seconds and pass','Infer success from deep CSS structure','Condition-based waiting is more reliable than guessed delays.']),
      check(['同名按钮在多个卡片出现，怎样定位指定商品？','先限定商品卡片，再用按钮角色与名称','选择页面上第一个匹配项','使用随机按钮 ID','先限定业务上下文，再定位可见控件。'], ['Several cards have a same-named button. How do you target one product?','Scope to the product card, then locate the button by role and name','Take the first match on the page','Use a random button ID','Scope by the business object before locating the control.'])
    ]),
    leaf('ci-evidence', ['持续集成与失败证据', 'CI and failure evidence'], [gha, pw],
      ['在明确版本和环境下运行关键测试。保留日志与报告，区分可重复缺陷与不稳定测试。', 'Run key checks under known versions and environment. Retain logs and reports and distinguish reproducible bugs from flakes.'],
      ['设计拉取请求检查，写执行条件、失败时保留的日志和合并门槛。', 'Design pull-request checks with triggers, failure artifacts and merge criteria.'], [
      check(['一个不稳定测试失败，怎样处理最有帮助？','保留失败证据并复现，明确隔离和修复责任','无限重试直到绿','悄悄从 CI 删除全部测试','不稳定性本身需要调查，证据有助于区分原因。'], ['A flaky test fails. What helps most?','Retain evidence, reproduce it and assign isolation/fix ownership','Retry indefinitely until green','Silently delete all CI tests','Flakiness requires investigation; artifacts distinguish causes.']),
      check(['需要复跑一次 CI 失败，报告应包含什么？','提交版本、环境、测试名和失败断言或追踪','只写红灯','只记录执行者昵称','复跑需要代码、环境和失败细节。'], ['What supports reproducing a CI failure?','Commit, environment, test name and failure trace or assertion','A red indicator only','The runner’s nickname','Reproduction needs code, environment and failure details.'])
    ])
  ])
], sample);

