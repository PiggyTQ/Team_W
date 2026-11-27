// Presentation only: these descriptions never change the project checks or results.
const choose = (language, zh, en) => language === 'en' ? en : zh;
const inputNames = {
  orders:['订单','Orders'], payments:['支付明细','Payments'], customers:['客户记录','Customers'],
  values:['待处理数值','Input values'], actions:['操作情境','Action scenarios'], requests:['请求情境','Requests'],
  windows:['观测窗口','Observation windows'], counters:['计数器读数','Counter readings'], rule:['规则参数','Rule parameters'],
  permissions:['角色权限','Role permissions'], cases:['测试用例','Test cases'], tests:['回归用例','Regression cases'],
  train:['训练样本','Training samples'], test:['独立评估样本','Evaluation samples'], documents:['资料记录','Documents'],
  questions:['问题情境','Questions'], events:['事件记录','Events'], probes:['发布与恢复探测','Release and recovery probes'],
  source:['源数据','Source records'], target:['目标数据','Target records'], records:['记录','Records'],
  history:['历史数据','Historical records'], increment:['新增数据','Incremental records'], batch:['本批数据','Current batch'],
  previous:['此前已发布内容','Previously published content'], checks:['检查情境','Check scenarios'],
  delta:['上线后的新增记录','Post-release records'], training:['培训情境','Training scenarios'],
  contract:['接口契约','Interface contract'], calls:['调用情境','Call scenarios'], commands:['命令情境','Command scenarios'],
  routes:['路由情境','Route scenarios'], pages:['页面映射','Page mappings']
};

export function inputValueLabel(value, language = 'zh') {
  if (value === undefined) return choose(language, '未提供', 'Not supplied');
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.every(item => item === null || typeof item !== 'object')) return value.slice(0,4).map(item=>String(item)).join(', ') + (value.length>4?' …':'');
    return choose(language, `${value.length} 项`, `${value.length} items`);
  }
  if (typeof value === 'object') return choose(language, `${Object.keys(value).length} 个字段`, `${Object.keys(value).length} fields`);
  const text = String(value);
  return text.length > 100 ? text.slice(0, 100) + '…' : text;
}

export function inputMaterialGroups(input, language = 'zh') {
  if (input === null || input === undefined) return [];
  const entries = Array.isArray(input) || typeof input !== 'object' ? [['records',input]] : Object.entries(input);
  return entries.map(([key,value]) => {
    const title = inputNames[key]?.[language === 'en' ? 1 : 0] || key;
    if (Array.isArray(value)) {
      const objects = value.every(row => row !== null && typeof row === 'object' && !Array.isArray(row));
      const allColumns = objects ? [...new Set(value.flatMap(row => Object.keys(row)))] : ['value'];
      const columns = allColumns.slice(0, 6);
      const rows = value.slice(0, 4).map(row => columns.map(column => inputValueLabel(objects ? row[column] : row,language)));
      return {key,title,kind:'records',count:value.length,columns,rows,shown:rows.length,hiddenColumns:Math.max(0,allColumns.length-columns.length)};
    }
    if (value && typeof value === 'object') {
      const rows = Object.entries(value).slice(0, 6).map(([name,body]) => [name,inputValueLabel(body,language)]);
      return {key,title,kind:'fields',count:Object.keys(value).length,columns:[choose(language,'字段','Field'),choose(language,'提供值','Supplied value')],rows,shown:rows.length,hiddenColumns:0};
    }
    return {key,title,kind:'value',value:inputValueLabel(value,language),columns:[],rows:[],shown:1,hiddenColumns:0};
  });
}

export function deliverableGuide(filename, language = 'zh') {
  const descriptions = {
    'result.json': [
      '本次输入对应的完整结果', 'Complete results for these inputs',
      '导入本机运行生成的 result.json，保留全部记录标识、结果值和失败状态。本站会核对其内容。',
      'Import the result.json produced by your local run, including every record ID, value and failure state. Avemly checks its content.'
    ],
    'notes.md': [
      '方法、修订与复核说明', 'Method, revisions and review notes',
      '记录你怎样处理材料、发现并修正什么、实际检查了哪些范围，以及本人贡献与剩余限制。',
      'Explain your method, the defect and revision, checks actually performed, your contribution and remaining limits.'
    ],
    'query.sql': [
      '你编写的查询', 'Your SQL query',
      '在本机编辑并执行查询，再将 query.sql 导入此处。本站确认文件存在，结果值由 result.json 核对。',
      'Edit and run the query locally, then import query.sql. Avemly checks that this file is present; result values are checked through result.json.'
    ],
    'solution.mjs': [
      '你实现的处理逻辑', 'Your implementation',
      '保留任务包约定的 solve(input) 接口，在本机运行验证后导入源码。本站不会执行这里的源码。',
      'Keep the solve(input) interface specified by the package, run the checks locally and import your source. Avemly does not execute this source.'
    ],
    'index.html': [
      '你制作的界面', 'Your interface',
      '导入实际界面，并在浏览器检查键盘、错误和状态恢复。此处预览与HTML结构检查不等于完整交互测试。',
      'Import the interface and check keyboard use, errors and state recovery in a browser. The preview and HTML structure check do not constitute full interaction tests.'
    ],
    'rules.json': [
      '本次规则配置', 'Rule configuration',
      '按任务约定保存阈值、连续窗口及其他规则参数；核对范围与本次输入保持一致。',
      'Save the threshold, consecutive windows and other parameters specified by the task. Keep them consistent with this input contract.'
    ],
    'config.json': [
      '角色与动作权限配置', 'Role and action permissions',
      '保存本次任务的角色权限配置，并检查允许及拒绝的动作是否完整。',
      'Save the role permissions for this task and check the complete allowed and denied actions.'
    ],
    'handoff.json': [
      '角色交接与修订记录', 'Handoff and revision record',
      '按交接步骤记录收到的材料、反馈、实际修改和下一接收角色。单人模拟应如实说明。',
      'Record the input, feedback, actual revision and receiving role for every handoff. Identify the exercise as a single-person simulation.'
    ]
  };
  const data = descriptions[filename];
  if (data) return {title:data[language === 'en' ? 1 : 0],description:data[language === 'en' ? 3 : 2]};
  const stage = /^stage-(\d+)\.json$/.exec(filename);
  if (stage) return {
    title:choose(language,`第 ${stage[1]} 步的交付内容`,`Stage ${stage[1]} deliverable`),
    description:choose(language,'保存该角色实际交付的结构化内容；接收方核对的是文件内容，不只是交接说明。','Save the structured content delivered by this role. The consumer check uses its contents, not only the handoff description.')
  };
  return {title:choose(language,'任务约定的产物','Required deliverable'),description:choose(language,'按任务书中的文件名称与内容要求制作并导入。','Create and import this file using the assignment’s name and content requirements.')};
}

export function projectCheckGuide(check, language = 'zh') {
  const [kind,...rest] = check.id.split(':');
  const filename = rest.join(':');
  if (kind === 'file') return {
    title:choose(language,`${filename} 已填写`,`${filename} is present`), filename,
    description:choose(language,'这里只检查文件有内容。请按产物用途完成制作并保存。','This checks that the file has content. Complete and save the required deliverable.')
  };
  if (kind === 'format') return {
    title:choose(language,`${filename} 格式可读取`,`${filename} has a readable format`),filename,
    description:filename === 'index.html'
      ? choose(language,'仅检查HTML结构标记。交互、键盘和失败状态需要在真实浏览器继续检查。','Only HTML structure markers are checked. Check interaction, keyboard use and failure states in a browser.')
      : choose(language,'请核对JSON的引号、逗号与括号，保存为有效JSON后再检查。','Check JSON quotes, commas and brackets, save valid JSON and run the check again.')
  };
  if (kind === 'consumer') return {
    title:choose(language,`${filename} 可供下一角色接收`,`${filename} matches the receiving-role contract`),filename,
    description:choose(language,'核对此步交付的完整内容与任务约定；只补交接文字不会修正交付内容。','Reconcile the complete stage output with its contract. Updating handoff prose alone does not fix the deliverable.')
  };
  const descriptions = {
    'bundle-format':['产物文件可读取','Deliverable files can be read','请导入约定名称的UTF-8文本文件。JSON文件需要有效格式；原稿会保留。','Import named UTF-8 text files. JSON files must be valid; your draft is retained.',null],
    'result-content':['结果与本次材料一致','Results match this input set','打开 result.json，核对全部ID、数值、单位以及失败或未知状态；再按任务书与公开参考逐项比较。','Open result.json and reconcile every ID, value, unit and failed or unknown state with the assignment and public reference.','result.json'],
    'rule-contract':['规则参数符合本次约定','Rules match this input contract','打开 rules.json，对照本次输入中的规则参数，修改后重新运行并检查。','Open rules.json, compare its parameters with this input set, then rerun and recheck.','rules.json'],
    'permission-configuration':['角色权限配置一致','Role permissions match','打开 config.json，核对每个角色允许和拒绝的动作，保留完整配置。','Open config.json and reconcile the complete allowed and denied actions for every role.','config.json'],
    'role-handoff':['交接反馈与修订记录完整','Handoff feedback and revision are complete','打开 handoff.json，按步骤核对接收角色、材料标识、反馈、实际修订和修订版本。','Open handoff.json and check the receiving role, input identity, feedback, actual change and revision for every stage.','handoff.json'],
    'role-handoff-content':['交接内容可读取','Handoff content can be read','检查 handoff.json 与每个 stage 文件是否存在、JSON是否有效，再核对完整交接要求。','Check that handoff.json and every stage file are present and valid JSON, then reconcile the complete handoff requirements.','handoff.json']
  };
  const data = descriptions[check.id];
  return data
    ? {title:data[language === 'en' ? 1 : 0],description:data[language === 'en' ? 3 : 2],filename:data[4]}
    : {title:choose(language,'项目检查项','Project check'),description:choose(language,'请对照任务书中的核对要求检查本次产物。','Compare this deliverable with the checks in the assignment.'),filename:null};
}
