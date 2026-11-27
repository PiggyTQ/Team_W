import fs from 'node:fs/promises';
import path from 'node:path';
import {assertUnfrozen,selectedForAuthoring} from './growth-authoring-guard.mjs';
const root=path.resolve('course-packs/growth'),catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));await assertUnfrozen(catalog.projects);
const contexts={
 'multi-source-analysis':'活动负责人要核对官网与社群订单。订单表每行一单，支付表每行一笔支付；A1分两次支付，另有未付款订单。先确定关联粒度，再交付订单级对账与业务简报。',
 'analysis-change-handoff':'财务使用者收到两版业务导出：金额单位从元变为分，记录状态也发生变化。分别复算每版有效记录与金额，说明差异来自哪里、哪些结果不能直接混算。',
 'baseline-evaluation':'项目负责人需要一个可解释的数值预测起点。仅用训练集计算均值基线，在独立样本逐行预测、复算MAE，并检查切分泄漏和遗漏ID。',
 'grounded-assistant-delivery':'活动服务协调员需要有依据的问答。资料里有签到说明和仅工作人员可见的内部信息；依据身份、文档版本与事实范围回答，缺资料或越权时拒答并留记录。',
 'app-authorization-retest':'应用负责人怀疑“隐藏按钮”没有解决越权。围绕本机实验服务的O1/O2对象，以未登录、本人、他人和编辑权限实际发请求，复现后复验服务端整改。',
 'detection-response-handoff':'安全值班收到正常变更和混合登录日志。关联同一用户短时间内的失败与成功、核对批准设备，交出命中、误报、漏报和需二线补查的证据。',
 'alert-rule-regression':'报名服务值班要减少短尖峰和低流量告警。编写可执行的JSON教学规则，对连续窗口、无流量、缺失、异常计数和恢复逐时核对；这不是PromQL兼容实现。',
 'reliability-release-drill':'发布负责人发现候选版本错误增多。结合每版请求分母、核心业务探测与发布后新增记录，决定何时停止、能否回退，以及是否真的恢复。',
 'accessible-form':'活动协调员需要可使用的报名表单。实现标签与键盘纠错、等待、失败与重试；等待时修改输入，要取消旧响应的影响，避免覆盖或清空新输入。',
 'data-workbench':'运营人员需要按组筛选记录并翻页。让筛选、页码、空态和错误态保持一致，制造A慢B快的请求顺序，确认旧响应不会覆盖当前结果。',
 'frontend-release-delivery':'上线审阅人要直接打开详情并刷新。维护列表和详情路由；接口版本不兼容时明确展示契约变化，而不是把错误页面当成正常发布。',
 'contract-api':'接口使用方需要稳定的读写契约。本机HTTP服务要区分未登录、他人对象、编辑权限不足和非法金额，同时保持本人正常读写路径可用。',
 'retry-concurrency':'报名库存只有少量名额，但客户端会并发与重试。以幂等键、身份和数量约束请求，拒绝同键换人或换载荷，保证不重复扣减、不超卖、失败不半提交。',
 'service-evolution-delivery':'服务使用方仍有以元为单位的旧客户端，新客户端需要整数分。保持记录身份，分别提供两个版本的响应和兼容检查，再写清迁移边界。',
 'relational-model':'报表使用者要看到全部客户及订单，包括还没有订单的客户。建立客户与订单粒度，写SQL汇总并检查孤立订单，不能用内连接静默丢掉零订单客户。',
 'partition-replay':'下游需要可安全重跑的每日数据分区。处理同批重复、重放和错误分区；发现不合法批次时保留上一份可用分区，并给出隔离记录。',
 'data-contract-evolution':'上游把金额字段改名，下游仍要读历史与新增数据。兼容两个字段、保留来源版本，缺少必要金额时阻断发布，并交代哪些消费者受影响。',
 'defect-evidence':'测试人员收到满8000分优惠的边界投诉。实际调用缺陷与修复函数，以7999、8000等精确金额复现“先取整再判断”的差异，提交可重复的缺陷记录。',
 'api-ui-regression':'测试人员要保护授权、失败后输入保留和正常提交。对原创建模程序的缺陷版与修复版逐条执行测试，保留期望、实际输出和失败，而不是一律写通过。',
 'release-risk-review':'发布负责人需要从测试报告作有界判断。把关键失败、未执行项和可选检查分开，指出阻断条件及剩余风险，不用平均通过率掩盖必要功能未测。',
 'rule-tool':'小店需要按整数分计算优惠的工具。实现优惠门槛、边界与错误返回，拒绝负值和小数，保留能被下一位维护者复现的测试。',
 'legacy-change':'维护者要在已有满减后增加会员优惠。先保护旧调用方，再修改顺序与取整规则；对照新旧行为说明为何改动，以及哪种重构会破坏价格。',
 'versioned-toolkit':'接手者要从解压包运行一个金额命令行工具。交付参数、版本、退出码和错误说明，在独立Node进程重现正常和缺参命令，不能只在开发机截图。',
 'config-acceptance':'实施顾问要把业务角色落到权限配置与UAT。制作可执行配置，对照每个角色的允许和拒绝动作，指出哪些业务决定仍需使用者确认。',
 'migration-reconciliation':'实施负责人要核对源系统与目标系统。按约定规范化邮箱和状态，逐项比较内容与新增记录；行数相等不能替代对账，也不能回退覆盖新增数据。',
 'rollout-support-handoff':'业务团队需要一次有限切换、培训和支持交接。核对必需功能是否实际执行，保全切换后新增记录，明确各角色如何验收以及谁接手未解决项。',
 'cross-registration-service':'以实施、后端、前端和测试角色轮换交付报名流程。消费同一版email接口契约，在实际界面与本机服务暴露旧mail字段错误，修订后共同验收。',
 'cross-metric-service':'以数据工程、接口和分析角色轮换交付指标服务。从订单与分次支付模型到接口金额和使用方简报逐层对账，把一对多放大金额的问题反馈到上游并复验。',
 'cross-knowledge-assistant':'以资料/安全、服务与评估角色轮换交付受限问答。传递文档版本和访问范围，对可答、不可答和越权题复验，留出可接手的引用与拒答记录。',
 'cross-service-incident':'以开发、运维和业务测试角色轮换演练恢复。技术指标恢复后继续验证报名等核心流程；只要业务仍失败，就不能结束联合验收。',
 'cross-security-remediation':'以安全、开发与复验角色轮换闭环授权问题。在实验服务实际重现对象/动作越权，修订服务端，再检查正常功能和拒绝路径；界面隐藏不算整改完成。',
 'cross-migration-launch':'以业务、工程/运维与UAT角色轮换处理迁移。传递映射与验收范围，核对规范化内容、差异和切换后新增记录，给出停止、保全与回退交接。'
};
const engine=await fs.readFile('server/practice-growth/scenarios.mjs','utf8'),subject=await fs.readFile('server/practice-growth/test-subject.mjs','utf8');
for(const p of catalog.projects.filter(selectedForAuthoring)){
 const folder=path.join(root,p.id,String(p.version));p.brief.zh=contexts[p.id];
 if(p.id==='api-ui-regression'){
  const file=path.join(folder,'input/fixture.json'),x=JSON.parse(await fs.readFile(file,'utf8'));
  Object.assign(x.tests[0],{action:'read-object',user:'bob',owner:'alice'});Object.assign(x.tests[1],{action:'failed-form',input:'same-input'});Object.assign(x.tests[2],{action:'register',email:'test@example.invalid'});
  await fs.writeFile(file,JSON.stringify(x,null,2));
 }
 if(p.id==='alert-rule-regression'){
  const file=path.join(folder,'input/fixture.json'),x=JSON.parse(await fs.readFile(file,'utf8'));
  if(x.windows.length===8)x.windows.push({minute:9,requests:120,errors:-2},{minute:10,requests:120,errors:null},{minute:11,requests:120,errors:0});
  await fs.writeFile(file,JSON.stringify(x,null,2));
 }
 if(p.id==='config-acceptance'){
  if(!p.requiredFiles.includes('config.json'))p.requiredFiles.push('config.json');
  const input=JSON.parse(await fs.readFile(path.join(folder,'input/fixture.json'),'utf8')),artifact=JSON.parse(await fs.readFile(path.join(folder,'reference/artifact.json'),'utf8'));
  artifact.files['config.json']=JSON.stringify(input.permissions,null,2);await fs.writeFile(path.join(folder,'reference/artifact.json'),JSON.stringify(artifact,null,2));await fs.writeFile(path.join(folder,'config.json'),'{}\n');
 }
 await fs.writeFile(path.join(folder,'reference/model.mjs'),engine);await fs.writeFile(path.join(folder,'reference/test-subject.mjs'),subject);await fs.writeFile(path.join(folder,'test-subject.mjs'),subject);
 await fs.writeFile(path.join(folder,'project.json'),JSON.stringify(p,null,2));
}
await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2));
console.log('32 concrete Chinese task contexts and executable testing subjects prepared.');
