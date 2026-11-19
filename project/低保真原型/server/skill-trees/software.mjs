import {source, tree, branch, leaf, check} from './definitions.mjs';

const swe = source('IEEE Computer Society', 'SWEBOK Guide', 'https://www.computer.org/education/bodies-of-knowledge/software-engineering', 'v4.0');
const cs = source('ACM / IEEE-CS / AAAI', 'CS2023 knowledge areas', 'https://csed.acm.org/knowledge-areas/', 'CS2023');
const control = source('Python Software Foundation', 'Control flow tools', 'https://docs.python.org/3/tutorial/controlflow.html');
const structures = source('Python Software Foundation', 'Data structures', 'https://docs.python.org/3/tutorial/datastructures.html');
const unit = source('Python Software Foundation', 'unittest', 'https://docs.python.org/3/library/unittest.html');
const git = source('Git', 'Basic branching and merging', 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging');
const review = source('GitHub Docs', 'About pull request reviews', 'https://docs.github.com/en/pull-requests/reference/pull-request-reviews');
const semver = source('Semantic Versioning', 'Semantic Versioning specification', 'https://semver.org/', '2.0.0');

export default tree('software', [swe, cs], [
  branch('problem', ['需求与问题分解', 'Requirements and decomposition'], ['把模糊任务变成可观察、可分解的行为。', 'Turn vague requests into observable, decomposed behavior.'], [
    leaf('problem-model', ['问题与输入输出', 'Problem and input/output'], [swe, cs],
      ['定义输入、输出、假设和边界；把不明确的条件列为待确认。', 'Define inputs, outputs, assumptions and boundaries. Keep ambiguous conditions open.'],
      ['为任务导入工具写需求，覆盖重复标题、空行、错误与成功结果。', 'Specify a task importer including duplicate titles, blank rows, errors and success.'], [
      check(['“支持所有格式”尚未定义，下一步？','列出需要支持的格式和可验收示例，向需求方核对','自行承诺任何格式都支持','跳过输入定义直接实现','可确认的例子能把范围转成契约。'], ['“Support every format” is undefined. What next?','Propose formats and acceptance examples to confirm','Promise every format immediately','Implement without defining inputs','Concrete examples turn scope into a contract.']),
      check(['某导入记录缺少必填字段，怎样明确输出？','声明该行如何报错、其他行是否处理及返回结构','只说明程序会运行','将错误隐藏并写空数据','异常行为也应成为输入输出约定。'], ['An import row lacks a required field. What should the output contract say?','How the row fails, whether other rows proceed and the result shape','Only that the program runs','Hide the error and write empty data','Error behavior belongs in the input/output contract.'])
    ]),
    leaf('acceptance-slices', ['验收条件与交付切片', 'Acceptance and delivery slices'], [swe],
      ['按用户价值拆小。每个切片都包含可观察结果和最小验证。', 'Split by user value. Each slice needs an observable outcome and a minimum check.'],
      ['把清单工具拆成两个可使用切片，为每个切片写最小验收。', 'Split a task-list tool into two usable slices and write minimum acceptance checks.'], [
      check(['哪条是明确的验收条件？','给定存在的清单，提交合法条目后列表出现一条同名记录','系统操作要方便','代码尽可能简洁','明确前置、行为与可观察结果。'], ['Which is a concrete acceptance criterion?','Given a list, a valid submission creates one visible item with that title','Make the system convenient','Keep code as simple as possible','Acceptance names preconditions, behavior and observable result.']),
      check(['哪种首个切片更能验证用户价值？','完成一个从输入到结果的最小用例','先实现所有抽象层但无可用路径','先增加无法交互的全部空页面','端到端小切片可较早暴露关键风险。'], ['Which first slice best validates user value?','A minimal input-to-result flow','Every abstraction with no usable path','Every placeholder page without interactions','A small end-to-end slice exposes important risks early.'])
    ]),
    leaf('design-boundaries', ['模块职责与接口', 'Module boundaries and interfaces'], [swe, cs],
      ['让相关职责归在一起，让易变化细节留在边界后。写清模块的输入输出。', 'Group related responsibilities and place volatile details behind interfaces. Specify inputs and outputs.'],
      ['将读文件、解析、业务规则和写结果拆分，解释改变文件格式时应改哪部分。', 'Separate reading, parsing, business rules and writing. Explain what changes when the input format changes.'], [
      check(['想从 CSV 换到 JSON 又复用折扣逻辑，哪种拆法较合适？','将格式解析与业务计算分离，共用输入模型','在每个解析器复制业务规则','把全部行为写到一个回调','边界应隔离变化并保持核心规则一致。'], ['How can discount rules be reused when CSV changes to JSON?','Separate parsing from business rules using a common input model','Copy the rules into each parser','Put everything in one callback','A boundary isolates change while keeping rules consistent.']),
      check(['调用方只需要检查有效订单，接口首选？','返回明确订单校验结果和错误类型','暴露全部内部临时对象','让调用方读取私有实现来判断','接口应暴露调用方需要的契约。'], ['A caller only needs order validity. What should the interface expose?','A clear validation result and error types','Every internal temporary object','Require the caller to inspect private implementation','Expose the contract the caller needs.'])
    ])
  ]),
  branch('coding', ['编码与算法', 'Coding and algorithms'], ['用合适的数据结构与控制流实现规则，处理异常输入。', 'Implement rules with appropriate data structures, control flow and error handling.'], [
    leaf('control-flow', ['控制流与函数', 'Control flow and functions'], [control],
      ['把一个函数限定在清晰的职责内，安排正常路径、提前返回和边界值。', 'Keep each function focused and handle normal flow, early returns and edge cases.'],
      ['实现一段计算购物券金额的纯函数，列出负值、零值和有效值的行为。', 'Implement a pure voucher calculation and specify negative, zero and valid inputs.'], [
      check(['函数先后遇到非法输入和正常计算，怎样更易检查？','先验证前置条件，再进入正常计算','捕获所有错误并返回任意数','用一个全局变量传入每个值','先处理失败条件可使正常路径清晰。'], ['How can validation and normal calculation be made clear?','Validate preconditions before computing','Catch every error and return an arbitrary number','Pass every value through one global variable','Early validation clarifies the normal path.']),
      check(['两个调用用同样输入应返回同样结果，函数不应依赖什么？','未声明且可变的全局状态','明确传入的参数','确定性的计算规则','隐藏可变依赖会妨碍复现。'], ['What should a function avoid when the same inputs must produce the same output?','Hidden mutable global state','Explicit arguments','Deterministic calculation rules','Hidden mutable dependencies prevent reproduction.'])
    ]),
    leaf('structures-cost', ['数据结构与复杂度', 'Data structures and complexity'], [structures, cs],
      ['按访问和修改模式选序列、映射或集合。评估输入增长时操作的代价。', 'Choose sequences, maps or sets for access and mutation patterns. Consider cost as input grows.'],
      ['为重复编号检测比较嵌套扫描与集合方案，描述时间及额外空间。', 'Compare nested scanning and a set for duplicate IDs, including time and extra space.'], [
      check(['主要需求是按唯一编号找对象，优先考虑？','以编号为键的映射','每次遍历无索引列表','将全部对象拼成一个字符串','映射能按键定位对象。'], ['Which structure fits lookup by unique ID?','A map keyed by ID','A full scan of an unindexed list every time','A string containing all objects','Maps support keyed lookup.']),
      check(['对每个输入遍历其余所有输入，典型时间增长是什么？','二次增长','常数增长','对数增长','两层遍历的比较次数随 n² 量级增长。'], ['Each item is compared with every other item. What growth is typical?','Quadratic','Constant','Logarithmic','Two full nested scans grow on the order of n squared.'])
    ]),
    leaf('errors', ['错误处理与边界输入', 'Errors and edge cases'], [swe, control],
      ['区分可预期输入错误、系统失败和缺陷。提供具体错误且保留上下文。', 'Distinguish expected input errors, system failures and bugs. Preserve useful error context.'],
      ['为文件导入写空文件、非法行和读取失败的预期结果，并说明何时停止。', 'Specify blank file, malformed row and read-failure behavior, including when to stop.'], [
      check(['解析遇到未知格式，应怎样处理？','返回明确的解析失败与位置，按契约停止或跳过','假设为零继续','把系统异常改写为成功','错误应明确反映失败和处理策略。'], ['How should an unknown parse format be handled?','Report a clear parse failure and location, then stop or skip as specified','Assume zero and continue','Turn the exception into success','Errors should preserve failure and the handling policy.']),
      check(['一个异常无法安全恢复，最合适的是？','保留异常原因并交给能处理它的边界','静默捕获后假装成功','反复立即重试直到退出','不可恢复错误不能以假成功掩盖。'], ['What fits an error that cannot be safely recovered locally?','Preserve its cause and let the appropriate boundary handle it','Catch silently and return success','Retry immediately until exit','Unrecoverable errors should not masquerade as success.'])
    ])
  ]),
  branch('verification', ['验证与演进', 'Verification and evolution'], ['用测试、调试与安全重构验证代码变化。', 'Verify changes through tests, debugging and safe refactoring.'], [
    leaf('unit-tests', ['单元测试与边界', 'Unit tests and boundaries'], [unit, swe],
      ['一个测试关注一个明确行为。覆盖普通、边界和错误输入，保留具体预期。', 'Focus tests on clear behavior with ordinary, boundary and invalid inputs and explicit outcomes.'],
      ['为数量折扣编写三项断言，覆盖刚好达标和差一项。', 'Write three assertions for a quantity discount, including exactly at threshold and one below.'], [
      check(['规则满 10 件优惠，哪些值最有针对性？','9、10、11','只测 100','只测文档示例一次','临界相邻值能捕获 off-by-one 错误。'], ['A discount starts at 10 units. Which values are targeted?','9, 10 and 11','Only 100','Only one example from the docs','Adjacent threshold values catch off-by-one errors.']),
      check(['测试应依赖哪项来证明行为？','确定的输入和可观察预期','开发者声称已测试','系统随机执行顺序','测试应可重复并有清晰断言。'], ['What demonstrates tested behavior?','Deterministic input and an observable expectation','A claim that testing happened','An arbitrary execution order','Tests need repeatability and explicit assertions.'])
    ]),
    leaf('debugging', ['复现与定位', 'Reproduction and debugging'], [swe],
      ['缩小到最小可复现场景，提出假设并用对照测试排除。', 'Reduce to a minimal reproduction and test hypotheses using controls.'],
      ['把一次仅在空输入触发的错误写成最小复现和一个对照。', 'Create a minimal reproduction for an empty-input failure and one control.'], [
      check(['三项改动同时出现后出现失败，优先做什么？','保留版本和最小复现，逐项或二分隔离变化','把全部模块重写','先删除报错再处理','隔离变量可缩小因果范围。'], ['A failure follows three changes. What first?','Record the build and minimal reproduction, then isolate changes','Rewrite every module','Suppress the error first','Isolating variables narrows the cause.']),
      check(['最小复现找到后，怎样防止再次出现？','把该输入和预期行为加入回归测试','只将复现写在口头消息','删除触发输入不再覆盖','将已知失败转为可重复检查。'], ['How can a minimized failure be guarded against?','Turn its input and expected behavior into a regression test','Mention it only verbally','Delete coverage for the triggering input','Convert known failures into repeatable checks.'])
    ]),
    leaf('refactor', ['重构与兼容性', 'Refactoring and compatibility'], [swe, semver],
      ['在有回归依据时小步调整结构。保持外部契约，除非显式计划变更。', 'Change structure in small steps with regression coverage. Preserve external behavior unless changing it deliberately.'],
      ['为两个重复方法写重构计划，先记录对外行为，再提取共有逻辑并验证。', 'Plan a refactor of duplicate methods, documenting behavior before extracting shared logic.'], [
      check(['提取函数时发现旧接口对空值有既有行为，怎样做？','先用测试记录现有行为，单独决定是否改变契约','直接删掉看似没必要的分支','让每个调用者临时适配未知结果','重构应验证既有调用依赖。'], ['Extraction reveals existing null behavior. What next?','Record it with a test and decide separately whether to change the contract','Delete the branch because it seems unnecessary','Let callers adapt to unknown outcomes','Refactoring should protect behavior callers rely on.']),
      check(['采用语义版本且已经发布稳定 API，破坏兼容的更改应怎样标记？','增加主版本并说明迁移','只增加修订号','不记录版本','主版本用于对外不兼容更改。'], ['For a stable API using SemVer, how is a breaking change signaled?','Increase the major version and document migration','Increase patch only','Record no version','The major version signals incompatible API changes.'])
    ])
  ]),
  branch('collaboration', ['协作与发布', 'Collaboration and release'], ['用版本历史、审查和发布记录让团队能接手。', 'Use history, review and release notes to support team handoff.'], [
    leaf('git-branches', ['Git 分支与合并', 'Git branches and merges'], [git, source('GitHub Skills', 'Introduction to GitHub', 'https://github.com/skills/introduction-to-github')],
      ['在可审查分支上工作。解决冲突时保留双方意图并运行相关检查。', 'Work in reviewable branches. Resolve conflicts by preserving both intentions and running relevant checks.'],
      ['在本地创建演练仓库，模拟两条分支改同一文件，记录冲突解决和验证。', 'In a local exercise repo, make competing branch changes and record conflict resolution and checks.'], [
      check(['两个分支修改同一段导致冲突，应怎么解决？','读双方变更和意图，再编辑最终结果并测试','无条件接受自己的整份文件','只删除冲突标记，不核对语义','解决冲突需要理解并验证组合结果。'], ['Two branches conflict on one block. How do you resolve it?','Read both changes, edit the intended result and test it','Always keep your whole file','Remove conflict markers without checking meaning','A resolution needs semantic review and verification.']),
      check(['想让队友容易审查代码，提交怎样组织？','每次围绕一个清晰变更，说明目的和验证','把所有无关格式调整合在同一提交','避免写提交信息','聚焦改动让审查和回退更容易。'], ['What commit structure helps review?','One coherent change per commit with purpose and verification','Mix unrelated formatting and features','Omit messages','Focused changes aid review and rollback.'])
    ]),
    leaf('code-review', ['代码审查与反馈', 'Code review'], [review, swe],
      ['审查关注正确性、测试、可维护性和范围。用可定位反馈描述问题和影响。', 'Review correctness, tests, maintainability and scope. Give feedback with location and impact.'],
      ['对一份小改动写两条评审意见，一条覆盖缺失边界，一条说明已有验证。', 'Review a small change with a missing boundary check and one verified behavior.'], [
      check(['哪条反馈可执行？','指出空值路径、会导致的错误，并要求一个复现用例','只写“代码很烂”','要求换全部变量名但不说明影响','具体位置和后果让反馈可处理。'], ['Which review comment is actionable?','Name the null path, failure and a missing reproduction case','Say “bad code”','Demand every variable rename without explaining impact','Location and consequences make feedback actionable.']),
      check(['作者修正了边界问题，复审应做什么？','核对新差异和相关测试，确认原问题与新影响','只看首次提交','永久忽略同一文件','复审关注修复与可能引入的变化。'], ['What should a follow-up review do after an edge-case fix?','Check the updated diff and tests for the original issue and new impacts','Review only the first commit','Ignore the file forever','Review the fix and any introduced change.'])
    ]),
    leaf('release-version', ['发布版本与交接', 'Versioned releases and handoff'], [semver, swe],
      ['记录版本、范围、验证和迁移说明。出问题时能定位具体构建并回退。', 'Record version, scope, checks and migration notes. Identify the exact build for rollback.'],
      ['为一次小工具发布写版本记录，列出修复、受影响用例和已知限制。', 'Write release notes for a small tool with fixes, affected flows and known limitations.'], [
      check(['仅修复向后兼容的缺陷，语义版本通常加哪位？','修订号（patch）','主版本','删除版本','兼容缺陷修复通常属于 patch。'], ['Which SemVer component changes for a backward-compatible fix?','Patch','Major','Remove the version','Backward-compatible bug fixes usually increment patch.']),
      check(['哪项发布信息最有助于回退？','可定位的构建标识、数据兼容条件和上一个可用版本','产品宣传语','负责人喜好的配色','回退需要定位产物及判断兼容性。'], ['Which release information helps rollback?','Build identity, data compatibility conditions and the prior viable version','Product tagline','Owner’s favorite colors','Rollback needs an identifiable artifact and compatibility conditions.'])
    ])
  ])
]);

