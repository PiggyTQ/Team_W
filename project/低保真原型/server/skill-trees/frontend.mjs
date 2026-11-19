import {source, tree, branch, leaf, check} from './definitions.mjs';

const mdn = source('MDN', 'MDN Curriculum', 'https://developer.mozilla.org/en-US/curriculum/');
const html = source('MDN', 'Semantic HTML', 'https://developer.mozilla.org/en-US/curriculum/core/semantic-html/');
const css = source('MDN', 'CSS layout', 'https://developer.mozilla.org/en-US/curriculum/core/css-layout/');
const js = source('MDN', 'JavaScript fundamentals', 'https://developer.mozilla.org/en-US/curriculum/core/javascript-fundamentals/');
const wcag = source('W3C WAI', 'Web Content Accessibility Guidelines', 'https://www.w3.org/WAI/standards-guidelines/wcag/', 'WCAG 2.2');
const a11y = source('W3C WAI', 'Easy Checks', 'https://www.w3.org/WAI/test-evaluate/preliminary/');
const fetchGuide = source('MDN', 'Using the Fetch API', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch');
const react = source('React', 'Sharing state between components', 'https://react.dev/learn/sharing-state-between-components');
const npm = source('npm', 'npm ci', 'https://docs.npmjs.com/cli/v11/commands/npm-ci/');
const vitals = source('Chrome / web.dev', 'Web Vitals', 'https://web.dev/articles/vitals');
const pw = source('Playwright', 'Best practices', 'https://playwright.dev/docs/best-practices');
const csp = source('MDN', 'Content Security Policy', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP');

export default tree('frontend', [mdn, wcag], [
  branch('web-core', ['Web 基础', 'Web foundations'], ['建立有语义的文档、响应式布局与可预测的交互。', 'Build semantic documents, responsive layouts and predictable interactions.'], [
    leaf('semantic-html', ['语义化 HTML', 'Semantic HTML'], [html],
      ['优先选择原生元素表达含义。表单控件需要可识别标签。', 'Use native elements for meaning. Give each form control an accessible label.'],
      ['写出报名页标题、表单、提交按钮和错误信息的 HTML 结构。', 'Mark up a signup page heading, form, submit control and errors.'], [
      check(['触发提交的元素应优先使用？','原生提交按钮','带点击事件的 div','没有 href 的 a 元素','原生按钮自带角色、键盘行为和表单语义。'], ['What element should submit a form?','A native submit button','A div with a click listener','An anchor without href','A native button provides semantics, keyboard behavior and form support.']),
      check(['表单输入怎样获得稳定的可访问名称？','使用与输入 id 对应的 label','只写 placeholder','通过输入框颜色提示','关联标签在输入后仍保留，也便于辅助技术读取。'], ['How should a form input get a persistent accessible name?','Associate a label with its ID','Use placeholder alone','Use input color','An associated label persists after typing and is available to assistive technology.'])
    ]),
    leaf('responsive-css', ['响应式 CSS 布局', 'Responsive CSS layout'], [css],
      ['根据内容选 Grid 或 Flexbox。允许项目收缩和换行，在窄屏及长文案下验证。', 'Choose Grid or Flexbox for the content. Allow shrinking and wrapping and test narrow screens and long labels.'],
      ['给卡片列表设计 320 到 1440px 的列变化，并放入一条长标题验证。', 'Design a card grid from 320 to 1440px and check one long title.'], [
      check(['多张卡片需要行列同时对齐，优先考虑？','CSS Grid','逐张绝对定位','用空格模拟对齐','Grid 提供二维轨道。'], ['Which layout helps align multiple rows and columns of cards?','CSS Grid','Absolute-position each card','Pad items with spaces','Grid provides two-dimensional tracks.']),
      check(['网格列里的长 URL 推宽了页面，首先要改什么？','允许列收缩并让长字符串断行','让根页面隐藏溢出且不核对内容','把所有字体缩到不可读','处理网格最小尺寸和内容换行，保留可读性。'], ['A long URL forces a grid column wider than the viewport. What helps?','Let the track shrink and allow long text to wrap','Hide root overflow without checking content','Shrink all text until it cannot be read','Handle minimum track sizing and wrapping to preserve readable content.'])
    ]),
    leaf('dom-events', ['JavaScript 与事件', 'JavaScript and events'], [js],
      ['理解事件目标、传播、默认行为与状态更新。事件监听按元素生命周期清理。', 'Understand targets, propagation, default actions and state updates. Clean up listeners with their lifecycle.'],
      ['为动态列表做一个删除动作，描述如何在父节点识别子按钮以及如何处理表单默认行为。', 'Implement delete for a dynamic list. Explain how the parent locates the clicked control and how form defaults are handled.'], [
      check(['按钮里的图标被点击，事件目标可能是什么？','图标本身，可用 closest 定位操作按钮','总是表单','一定是注册监听器的父节点','target 是最初触发对象，currentTarget 是监听器所在对象。'], ['An icon inside a button is clicked. What may event.target be?','The icon; use closest to find the action button','Always the form','Always the parent with the listener','The target initiates the event; currentTarget owns the listener.']),
      check(['表单使用 JS 处理提交且页面不跳转，应在哪拦截？','处理表单 submit 事件并取消默认行为','只处理鼠标按下事件','每个输入都拦截所有键盘事件','在 submit 处理可覆盖键盘和点击提交。'], ['A form should submit via JavaScript without navigation. Where do you intercept?','Handle submit on the form and prevent its default','Handle mouse down only','Block every keyboard event on the inputs','Submit handling covers both keyboard and pointer activation.'])
    ])
  ]),
  branch('interaction', ['交互与无障碍', 'Interaction and accessibility'], ['让用户在多种输入方式和状态下完成同一任务。', 'Support the same task across input methods and application states.'], [
    leaf('keyboard', ['键盘与焦点', 'Keyboard and focus'], [wcag, a11y],
      ['按阅读顺序安排键盘焦点。打开对话框移动焦点，关闭后返回触发入口。', 'Follow reading order for keyboard focus. Move focus into dialogs and return it on close.'],
      ['用 Tab、Shift+Tab 和 Escape 走一次设置弹窗，记录入口、循环、关闭和返回点。', 'Check a settings dialog with Tab, Shift+Tab and Escape. Log entry, cycling, dismissal and focus return.'], [
      check(['关闭弹窗后，焦点通常应去哪？','返回仍在页面上的触发按钮','移动到浏览器地址栏','留在已卸载的确认按钮','返回触发入口可让键盘用户恢复原任务。'], ['Where should focus normally go when a dialog closes?','Back to the opener if it remains available','To the browser address bar','Remain on the removed confirmation button','Returning to the opener preserves keyboard context.']),
      check(['只用键盘，看不出当前按钮位置，应该怎么改？','给键盘焦点可见且有对比度的样式','删除所有 outline','只在鼠标 hover 时变色','可见焦点是键盘可操作性的关键。'], ['What helps when keyboard users cannot see the active control?','Provide a visible, contrasting focus indicator','Remove every outline','Change color only on mouse hover','Visible focus supports keyboard operation.'])
    ]),
    leaf('form-errors', ['表单错误与提示', 'Form errors and feedback'], [wcag, a11y],
      ['把错误描述和字段关联，保留输入。状态变化应让辅助技术感知。', 'Associate errors with fields and preserve input. Expose relevant status changes to assistive technology.'],
      ['给报名表做空值、格式错误和保存成功三种状态，检查焦点、文本和朗读。', 'Design empty, invalid and successful submission states and check focus, wording and announcements.'], [
      check(['只有红色边框提示手机号错误，缺少什么？','可阅读且关联该字段的具体错误说明','更鲜艳的红色','将字段移到页面底部','颜色不能独自承载错误含义。'], ['A phone field has a red border for errors. What is missing?','A specific text error associated with the field','A brighter red','Moving the field to the bottom','Color alone cannot communicate the error.']),
      check(['服务器返回可修复的表单错误，怎样处理已有输入？','保留输入并提示具体改法','清空表单要求重填','跳转首页并隐藏错误','可恢复错误应帮助用户继续当前任务。'], ['How should entered values be handled after a recoverable form error?','Preserve values and explain the fix','Clear the entire form','Send the user home and hide the error','A recoverable error should help users continue the task.'])
    ]),
    leaf('async-ui', ['请求与异步状态', 'Requests and async states'], [fetchGuide],
      ['区分加载、空结果、错误与成功，校验 HTTP 状态。较旧的请求不能覆盖最新操作。', 'Separate loading, empty, error and success states. Check HTTP status and keep stale responses from overwriting newer actions.'],
      ['设计输入联想的加载、空、失败、重试和快速改词行为，写出模拟失败步骤。', 'Design loading, empty, failure, retry and rapid query changes for autocomplete. Describe how to simulate failure.'], [
      check(['fetch 收到 404 时，通常应如何检测？','检查 response.ok 或 response.status','只依赖 catch 处理所有 HTTP 错误','只看返回体是否存在','fetch 对 HTTP 错误响应通常仍会正常 resolve。'], ['How should a fetch request detect a 404?','Check response.ok or response.status','Rely on catch for all HTTP errors','Check only whether a response body exists','fetch typically resolves even for HTTP error responses.']),
      check(['先搜 A 再搜 B，A 较晚返回。什么行为正确？','取消或忽略 A 的结果，保留 B','总用最后返回的结果覆盖','自动合并两次结果','界面应对应当前查询，不能让过时请求覆盖。'], ['Search A, then B. A returns last. What behavior is correct?','Cancel or ignore A and keep B','Always show the last response to arrive','Merge both responses automatically','The display must correspond to the current query.'])
    ])
  ]),
  branch('engineering', ['组件与工程化', 'Components and tooling'], ['维护清晰的组件契约和可复现的构建。', 'Maintain clear component contracts and repeatable builds.'], [
    leaf('state-ownership', ['组件状态归属', 'Component state ownership'], [react],
      ['把共享状态放在需要它的共同祖先。派生值在渲染时计算，避免两个状态互相追赶。', 'Keep shared state in the nearest common owner and derive values during rendering where possible.'],
      ['设计两列表单组件，标注父组件持有的选择、子组件 props 和局部状态。', 'Design a two-panel form. Mark the parent’s selection, child props and local state.'], [
      check(['两个面板需要共用同一个选中项，怎样避免不同步？','在共同父组件持有选中项并通过属性下传','每个面板复制一份后互相写入','只在初始化时对齐一次','单一来源使共享选择一致。'], ['Two panels must share a selection. How do you prevent disagreement?','Keep selection in their common parent and pass props','Maintain two copies that write to each other','Align them only at initialization','A single owner keeps shared selection consistent.']),
      check(['购物车总价只由数量和单价决定，优先怎么保存？','保存原始条目，渲染时计算总价','另存总价并在多个事件里手动同步','保存上次显示的文本当作真值','派生值可从原始状态计算。'], ['Total is determined by item quantities and prices. What state is needed?','Keep the items and derive total in render','Store total separately and sync it in many handlers','Treat the previous display text as truth','Derived values can be computed from source state.'])
    ]),
    leaf('repro-build', ['依赖锁定与构建', 'Dependencies and builds'], [npm, mdn],
      ['用锁文件固定依赖解析。持续集成中验证干净安装、构建与输出。', 'Pin resolution in a lockfile. Verify clean install, build and output in CI.'],
      ['列出新成员从检出代码到运行构建的命令，核对锁文件不匹配时怎样处理。', 'Write steps from checkout to build and handle a lockfile mismatch.'], [
      check(['已有 npm 锁文件，CI 希望严格使用它，选择？','npm ci','删锁文件后 npm install','只复制另一台机器的 node_modules','npm ci 面向干净且锁定的安装。'], ['With an npm lockfile, which command strictly uses it in CI?','npm ci','Delete it and run npm install','Copy node_modules from another machine','npm ci targets clean, lockfile-driven installation.']),
      check(['构建需调用仅供服务器使用的私钥。应如何处理前端？','在服务器持有私钥，浏览器走授权接口','注入前端构建常量','放在静态 public 下但不链接','客户端资源可以被查看，不适合存储私钥。'], ['A feature needs a server-only private key. How should the frontend work?','Keep the key server-side behind an authorized API','Inject it into frontend build constants','Place it in public without a link','Client resources are inspectable and cannot protect a private key.'])
    ]),
    leaf('browser-tests', ['端到端交互检查', 'End-to-end interaction tests'], [pw, a11y],
      ['按用户可见语义定位，使用等待断言，并准备独立且可重复的数据。', 'Locate by user-visible semantics, use retrying assertions and isolate repeatable data.'],
      ['编写一条从空表单到保存成功的测试，另外验证错误时数据未丢。', 'Write a blank-to-success form test and an error case that preserves input.'], [
      check(['测试经常因响应时间变化失败，哪种修复更稳？','等待用户可见的成功状态','将固定休眠从 2 秒改为 10 秒','删除断言以减少失败','等待真实状态，避免用时间代替条件。'], ['A test flakes with response-time changes. Which fix is more robust?','Wait for the visible success state','Increase a fixed sleep from two to ten seconds','Remove the assertion','Wait for the condition rather than a guessed delay.']),
      check(['要定位“保存”按钮，应优先使用什么？','按按钮角色和可访问名称','依赖嵌套层级和第 3 个子元素','使用构建后随机类名','面向用户的角色与名称对无关结构调整更稳。'], ['How should a test locate the Save button?','By button role and accessible name','By nesting depth and third child','By a generated class name','User-facing roles and names survive incidental DOM changes.'])
    ])
  ]),
  branch('quality', ['性能与上线', 'Performance and release'], ['度量体验、校验浏览器安全边界并用清单上线。', 'Measure experience, check browser security boundaries and release with evidence.'], [
    leaf('web-vitals', ['加载与交互体验', 'Loading and interaction'], [vitals],
      ['分别核对主要内容加载、交互响应和布局稳定。区分受控实验与用户现场数据。', 'Measure loading, interaction responsiveness and layout stability. Distinguish lab runs from field data.'],
      ['为商品详情页设计一次测量，标注主图、操作响应及首屏布局变化。', 'Plan a product-page measurement for the main image, interaction response and initial layout movement.'], [
      check(['图片加载后把正在点击的按钮向下推，哪个指标最直接？','CLS','INP','LCP','CLS 衡量意外布局偏移。'], ['An image pushes a button down after loading. Which metric is most directly affected?','CLS','INP','LCP','CLS measures unexpected layout shifts.']),
      check(['点筛选后主线程忙，界面迟迟不能反馈，应重点观察？','INP','仅 CLS','域名长度','INP 对交互到下一次绘制的延迟敏感。'], ['A filter interaction feels delayed while the main thread is busy. Which metric is relevant?','INP','CLS only','Domain-name length','INP captures responsiveness from interaction toward the next paint.'])
    ]),
    leaf('browser-security', ['浏览器内容安全', 'Browser content security'], [csp, mdn],
      ['把用户文本当数据呈现。CSP 限制脚本和资源来源，并用报告观察策略影响。', 'Render untrusted text as data. Use CSP to restrict script and resource sources and observe reports.'],
      ['给用户评论页面列出文本渲染和脚本来源规则，写一个报告模式下的检查。', 'Specify text rendering and script sources for a comment page and plan a report-only check.'], [
      check(['用户评论需要按纯文本展示，优先使用哪种方式？','按文本节点渲染，由框架转义','拼接到 innerHTML 并信任输入','根据字符串长度决定是否执行','文本渲染能避免将评论解析为 HTML。'], ['How should a plain-text user comment be rendered?','As text, with framework escaping','Concatenate into innerHTML and trust it','Execute it depending on length','Text rendering keeps the comment from being parsed as HTML.']),
      check(['希望先观察 CSP 违规，暂不阻断合法页面，使用什么？','Content-Security-Policy-Report-Only','对每个页面禁用浏览器安全','把原有策略改成全部允许','报告模式便于上线前核对影响。'], ['How can you observe CSP violations before enforcing a policy?','Content-Security-Policy-Report-Only','Disable browser security','Replace the policy with allow-all','Report-only mode exposes likely impact before enforcement.'])
    ]),
    leaf('release-checks', ['上线验收与回归', 'Release and regression checks'], [pw, a11y, vitals],
      ['覆盖关键路径、视口和输入方式。记录浏览器、版本、结果以及未检查范围。', 'Cover key journeys, viewports and input methods. Record browser, build, result and gaps.'],
      ['给注册页上线写验收表，覆盖慢网、错误、键盘与手机，并标注两个回退条件。', 'Write release checks for signup on slow networks, failures, keyboard and mobile and define rollback triggers.'], [
      check(['桌面鼠标路径通过后，哪项最有价值的补查？','用手机和键盘跑相同关键任务','在同一设备重复截图','只核对 CSS 文件大小','关键任务要覆盖真实输入方式与布局。'], ['What is a useful follow-up to a desktop pointer test?','Run the same key journey on mobile and with a keyboard','Repeat screenshots on the same device','Check only CSS file size','Cover real input modes and layout conditions.']),
      check(['哪种发布验收记录可用于重现？','版本、浏览器、步骤、预期、实际和证据','一句“一切正常”','只有页面标题和设计链接','可复核结果需要具体版本和验证过程。'], ['Which release record is reproducible?','Build, browser, steps, expected and actual outcomes, and evidence','A note saying everything works','Only the page title and design link','Reproduction needs a build and verification procedure.'])
    ])
  ])
]);

