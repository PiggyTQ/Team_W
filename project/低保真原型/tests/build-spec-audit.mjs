import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root='../完整的产品与功能规格',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),formal=await read(root+'/功能与页面清单.json'),matrix=await read(root+'/链路与低保真验收矩阵.json'),acceptance=await read(root+'/升级交互验收清单.json'),projection=await read('src/spec.json');
const checks={pages:JSON.stringify(projection.pages)===JSON.stringify(formal.pages),features:JSON.stringify(projection.features)===JSON.stringify(formal.features),views:JSON.stringify(projection.views)===JSON.stringify(matrix.low_fidelity_views),flows:JSON.stringify(projection.flows)===JSON.stringify(matrix.flows),acceptance:JSON.stringify(projection.acceptance)===JSON.stringify(acceptance)};
for(const [key,ok]of Object.entries(checks))assert.ok(ok,'正式规格投影不一致：'+key);
assert.equal(formal.pages.length,15);assert.equal(formal.features.length,43);assert.equal(matrix.low_fidelity_views.length,27);assert.equal(matrix.flows.length,14);assert.equal(acceptance.length,43);
const delta={FR06:'修正模拟解析/任务来源被手填默认值覆盖',FR07:'多技能逐项确认回执显示剩余待处理项',FR08:'同成果各技能分别记录位置与支持范围，防重复候选',FR21:'新尝试清除旧完成标记，旧版本检查不覆盖最新检查',FR24:'补实际类型、日期、方式与出处，未知可空',FR25:'多技能支持范围及产物定位，不把提交当核验',FR27:'按确认材料ID/版本授权，保存回答为独立本人笔记',FR28:'提议检查资料与计划双版本，保存笔记不应用业务变更',FR29:'报告选择内容范围、冻结原文、逐章冲突处理和咨询摘要',FR30:'私人复盘逐条选择导出，保留旧引用时仍阻断失效内容',FR31:'删除从白名单重建状态，清历史与未知派生缓存',FR39:'归档确认列同一任务及共享卡影响，研究与准备相互独立',FR42:'编辑归档与恢复统一，申请事件不覆盖准备状态',FR43:'结果定位具体卡，私有输入回本人机会；改筛选须重新确认'};
const scripts={FR01:'flow-navigation-check.mjs / browser-check.mjs',FR02:'browser-check.mjs',FR03:'browser-check.mjs / experience-check.mjs',FR04:'browser-check.mjs',FR05:'browser-check.mjs（取消与本地文件演示）',FR06:'alignment.test.mjs / browser-check.mjs',FR07:'spec-alignment-check.mjs / browser-check.mjs',FR08:'spec-alignment-check.mjs',FR09:'experience-check.mjs',FR10:'experience-check.mjs（目录与示例范围）',FR11:'map-chat-refinement-check.mjs',FR12:'experience-check.mjs（筛选与稳定示例）',FR13:'growth-schedule-check.mjs / model.test.mjs',FR14:'growth-schedule-check.mjs（无伪百分比）',FR15:'browser-check.mjs / flow-navigation-check.mjs',FR16:'experience-check.mjs / practice-chain-check.mjs',FR17:'map-chat-refinement-check.mjs',FR18:'model.test.mjs / job-separation-check.mjs',FR19:'model.test.mjs / browser-check.mjs',FR20:'browser-check.mjs / growth-schedule-check.mjs',FR21:'spec-alignment-check.mjs / browser-check.mjs',FR22:'experience-check.mjs',FR23:'experience-check.mjs / browser-check.mjs',FR24:'spec-alignment-check.mjs / practice-chain-check.mjs',FR25:'spec-alignment-check.mjs / browser-check.mjs',FR26:'practice-chain-check.mjs',FR27:'spec-alignment-check.mjs / assistant-layout-check.mjs',FR28:'spec-alignment-check.mjs / browser-check.mjs',FR29:'spec-alignment-check.mjs / alignment.test.mjs',FR30:'spec-alignment-check.mjs / browser-check.mjs',FR31:'spec-alignment-check.mjs / alignment.test.mjs',FR32:'browser-check.mjs（开关代码复核，非调度服务）',FR33:'browser-check.mjs',FR34:'browser-check.mjs（构造原句与归类）',FR35:'browser-check.mjs / map-chat-refinement-check.mjs',FR36:'browser-check.mjs',FR37:'browser-check.mjs（仅演示职责拒绝）',FR38:'flow-navigation-check.mjs / assistant-layout-check.mjs',FR39:'job-separation-check.mjs / spec-alignment-check.mjs',FR40:'browser-check.mjs（无样本、无聚合；统计服务未验）',FR41:'browser-check.mjs（预览和版本；实际PDF另验）',FR42:'job-separation-check.mjs / spec-alignment-check.mjs',FR43:'spec-alignment-check.mjs / browser-check.mjs'};
const boundaries={
  content:['FR10','FR11','FR12','FR13','FR14','FR17','FR22','FR23','FR25','FR33','FR34','FR35','FR39','FR40'],
  ai:['FR05','FR06','FR13','FR27','FR28','FR29','FR41','FR43'],
  server:['FR02','FR05','FR07','FR08','FR18','FR19','FR20','FR21','FR26','FR29','FR30','FR31','FR32','FR33','FR35','FR36','FR37','FR39','FR41','FR42','FR43'],
  research:['FR01','FR12','FR13','FR14','FR15','FR16','FR24','FR25','FR26','FR36','FR38']
};
const remaining=[{id:'OPEN-CONTENT',requirements:boundaries.content,reason:'正式可服务内容库与用途审核不是界面演示能替代的。',needed:'职业细分/责任范围、各方向先修和内容版本、任务与检查标准、合法岗位与薪酬样本的逐项审核；现仅10个基础职业和4方向原创任务示例。'}, {id:'OPEN-SERVICE',requirements:boundaries.server,reason:'没有真实身份、数据库或异步作业服务。',needed:'接口鉴权、跨用户隔离、跨设备事务/幂等、通知、撤回传播、删除/备份和失败恢复；本地测试不证明服务合同。'}, {id:'OPEN-AI',requirements:boundaries.ai,reason:'未连接解析器或模型，当前为预录/确定性规则。',needed:'六模式语义质量、实际引用有效性、流式失败、检索源、模型用途及成本控制；不能把模拟回答当分析结论。'}, {id:'OPEN-REPORT',requirements:['FR29','FR30','FR41'],reason:'已实现按标题章节/段落的低保真合并与TXT/浏览器打印，未提供生产富文本/文档引擎。',needed:'任意富文本块稳定ID、逐段服务端版本与并发、真实PDF排版/字体/可访问性及下载一致性；旧报告未存原文时明确未知，不补造旧快照。'}, {id:'OPEN-RESEARCH',requirements:boundaries.research,reason:'尚未执行真实学生/领域人员研究及辅助技术测试。',needed:'学生独立完成任务、真实设备与屏幕阅读器、领域内容复审、教学效果；不把自动化通过换成产品效果。'}];
for(const id of ['FR19','FR20','FR21','FR26','FR27','FR38','FR39','FR41'])scripts[id]+=' / task-editability-check.mjs / task-edit.test.mjs';
delta.FR19='原任务安排编辑和暂停恢复共计总预算，先预览再确认';
delta.FR20='任务与计划双前置版本校验，不覆盖旧编辑';
delta.FR21+='；三列空态/筛选出口与统一任务编辑、完成查看、暂停恢复';
delta.FR26='复盘历史可修订并回原任务，保留旧版，报告提示依据变化';
delta.FR38='补记录/空列/草稿入口和返回，桌面手机等价操作';
delta.FR41='既有简历可基于原版另存修订，不覆盖旧快照';
for(const id of ['FR03','FR22','FR23','FR29','FR30','FR33','FR35','FR38','FR41','FR43'])scripts[id]+=' / continuity-check.mjs / continuity.test.mjs';
delta.FR03='补长期意图、学习阶段和地域编辑，不更改能力或自动改计划';
delta.FR22='补我的学习/收藏、续读及同一任务入口，最小/标准范围可直接选择';
delta.FR23='阅读与关联任务分别保留，可续读或继续原任务，不伪造完成进度';
delta.FR29+='；默认覆盖11类章节，快照/背景/预算变更提示更新，局部报告不扩范围';
delta.FR30+='；默认导出选择来自该报告实际章节范围';
delta.FR33='本机来源发布/撤回/隔离有日期、版本及理由历史，非真实审核';
delta.FR35='补职业审阅草稿持久保存和发布/撤回历史，阻断规则保留';
delta.FR38+='；失效岗位/报告有明确出口，不静默显示其他对象';
delta.FR41+='；修复全部依据撤回后的修订返回分支';
delta.FR43+='；检索页与本人机会共用条件管理，载入强制重确认、去重及确认删除';
const coverage=await fs.readFile('原型覆盖矩阵.md','utf8');
const features=formal.features.map(f=>{const line=coverage.split('\n').find(l=>l.startsWith('|'+f.requirement_id+' '));return {id:f.requirement_id,name:f.name,pages:f.page_ids,formal:f.acceptance_obligation,prototype:line?.split('|')[3]||'见原型覆盖矩阵',verification:scripts[f.requirement_id],change:delta[f.requirement_id]||'保留现有交互，本轮复核',production_status:'未验收',remaining:remaining.filter(r=>r.requirements.includes(f.requirement_id)).map(r=>r.id)};});
const names=(await fs.readdir(root)).filter(x=>x.endsWith('.md')&&!/PRD3_[1234]\.md$/.test(x));const sources=[...names.map(x=>root+'/'+x),root+'/功能与页面清单.json',root+'/链路与低保真验收矩阵.json',root+'/升级交互验收清单.json','../网站设计说明书/大学生IT职业规划与成长网站设计说明书_PRD3.5.docx'];
const fingerprints=await Promise.all(sources.map(async file=>({file:path.resolve(file),sha256:crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
const output={baseline:'PRD3.5 + Teal20261016',checked_at:new Date().toISOString(),scope:{templates:15,views:27,requirements:43,flows:14,acceptance:43},projection:checks,features,remaining,fingerprints,interpretation:'逐项追踪与原型关键状态检查，不代表43项生产需求或UX正式验收通过。'};
await fs.writeFile('检查记录/规格对齐/逐项对齐.json',JSON.stringify(output,null,2));
const md=['# 43项需求逐项对齐表','','基线：正式PRD3.5、2026-10-16 Teal增补及Word设计说明书。正式需求和验收清单不改写。15模板、27视图、43需求、14链路的原型投影逐项与正式JSON一致。','','下表的验证只覆盖注明的合成示例和关键状态，不等于整项生产验收通过。待补齐项编号见文末。','','|需求|当前低保真入口与状态|本轮处理|验证脚本 / 范围|仍需|','|---|---|---|---|---|',...features.map(f=>`|${f.id} ${f.name}|${f.prototype}|${f.change}|${f.verification}|${f.remaining.join('、')||'真实用户理解与正式验收'}|`),'','## 仍无法验证的内容','',...remaining.flatMap(r=>[`### ${r.id}`,'',r.reason,'',`待补齐：${r.needed}`,'']), '## 核对证据','','- [逐项JSON与正式文件哈希](检查记录/规格对齐/逐项对齐.json)','- [新增专项结果](检查记录/规格对齐/专项结果.json)','- [差异修复说明](规格对齐与差异修复说明.md)','', '未修改正式文档中“未执行”的服务级验收状态；旧截图和旧检查记录仅保留历史用途。'];
await fs.writeFile('规格逐项对齐表.md',md.join('\n'));
const codeFiles=(await fs.readdir('src')).filter(x=>/\.(jsx?|css|json)$/.test(x)).sort();const codeHash=crypto.createHash('sha256');for(const file of codeFiles){codeHash.update(file);codeHash.update(await fs.readFile('src/'+file));}
await fs.writeFile('检查记录/规格对齐/审计状态.json',JSON.stringify({fingerprint:crypto.createHash('sha256').update(fingerprints.map(x=>x.sha256).join('')).digest('hex'),implementation_fingerprint:codeHash.digest('hex'),latest_report:'规格逐项对齐表.md',open_issues:remaining.map(r=>({id:r.id,condition:r.reason,action:r.needed})),frontend_fixes:Object.keys(delta),last_run:new Date().toISOString(),next_run:'文档、实现和外部前置条件均未变化时不重复通知；发现新的可执行差异再处理。'},null,2));
console.log('PASS official projection 15/27/43/14 + 43UX; audit ledger and source hashes saved');

