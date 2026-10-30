// One-time, checked substitutions for existing long JSX handlers. No layout change.
import fs from 'node:fs';
const edits=new Map();
function replace(file,old,next){
  let source=(edits.get(file)??fs.readFileSync(file,'utf8')).replace(/\r\n?/g,'\n');
  if(source.includes(next))return;
  if(source.split(old).length!==2)throw Error(`Expected one handler in ${file}: ${old.slice(0,60)}`);
  edits.set(file,source.replace(old,next));
}
const main='src/main.jsx';
replace(main,'<B primary disabled={t.completed||t.status===\'完成\'} onClick={() => {','<B primary disabled={t.completed||t.status===\'完成\'} onClick={async () => {');
replace(main,'        const next=submitTaskAttempt(s,t.id),a=next.tasks.find(x=>x.id===t.id).attempts.at(-1);',`        if(SERVER_AUTH){await workspace.command('task.submit',{taskId:t.id,taskVersion:t.version,confirmation:'SUBMIT_ATTEMPT'});tell(authMessage('ATTEMPT_SAVED',language));return;}
        const next=submitTaskAttempt(s,t.id),a=next.tasks.find(x=>x.id===t.id).attempts.at(-1);`);
replace(main,'<div className="actions"><B primary onClick={() => {\n      if(!t.completed&&dependencyBlock(s,t))','<div className="actions"><B primary onClick={async () => {\n      if(!t.completed&&dependencyBlock(s,t))');
replace(main,'      setTask(t.id, { status: "\\u5B8C\\u6210", completed: true });',`      if(SERVER_AUTH){try{await workspace.command('task.complete',{taskId:t.id,taskVersion:t.version,confirmation:'COMPLETE_LIMITED_SCOPE'});tell(authMessage('LIMITED_COMPLETION_SAVED',language));}catch(error){tell(authMessage(error.code,language));}return;}
      setTask(t.id, { status: "\\u5B8C\\u6210", completed: true });`);
replace(main,'<B primary onClick={() => {\n          if (!f.title?.trim())','<B primary onClick={async () => {\n          if (!f.title?.trim())');
replace(main,'          const t = makeTask(s, f);',`          if(SERVER_AUTH){
            const keys=['title','template','career','purpose','hours','association','kind','source','product','courseVersion','atlas','learningStage','priority','placementReason','jobId','another'];
            const draft=Object.fromEntries(keys.filter(key=>f[key]!==undefined).map(key=>[key,key==='hours'?Number(f[key]):f[key]]));
            try{const receipt=await workspace.command('task.create',{draft,confirmation:'CREATE_TASK'});const created=workspace.current().state.tasks.find(row=>row.id===receipt.refs.taskId);close();go(created.mode==='S2'?'/work/'+created.id:taskRoute(workspace.current().state,created));tell(authMessage('TASK_CREATED',language));}catch(error){fail(authMessage(error.code,language));}return;
          }
          const t = makeTask(s, f);`);
replace(main,'<Notice>确认只表示本人确认内容，不表示能力已被实际核验。</Notice><B primary onClick={() => {','<Notice>确认只表示本人确认内容，不表示能力已被实际核验。</Notice><B primary onClick={async () => {');
replace(main,'          update((x) => ({ ...invalidate(x), profileVersion: x.profileVersion + 1, claims:',`          if(SERVER_AUTH){try{await workspace.command('claim.confirm',{claimId:f.claimId,claimVersion:c.version,text:f.text,contribution:f.contribution||'',resolution:f.resolve==='关联已有材料，不重复计数'?'link_duplicate':'confirm',confirmation:'CONFIRM_SELF_REPORT'});close();tell(authMessage('CLAIM_CONFIRMED',language));}catch(error){fail(authMessage(error.code,language));}return;}
          update((x) => ({ ...invalidate(x), profileVersion: x.profileVersion + 1, claims:`);
replace(main,'<Notice>补录不补造事前预算、实际平台执行或企业反馈；材料仍待本人确认。</Notice><B primary onClick={() => {','<Notice>补录不补造事前预算、实际平台执行或企业反馈；材料仍待本人确认。</Notice><B primary onClick={async () => {');
replace(main,'          const t = { ...makeTask(s, { title: f.title, purpose:',`          if(SERVER_AUTH){const keys=['title','text','purpose','contribution','observationType','occurredOn','investigationMethod','investigationSource'];try{await workspace.command('experience.record',{...Object.fromEntries(keys.filter(key=>f[key]!==undefined).map(key=>[key,f[key]])),confirmation:'RECORD_SELF_REPORT'});close();tell(authMessage('EXPERIENCE_RECORDED',language));}catch(error){fail(authMessage(error.code,language));}return;}
          const t = { ...makeTask(s, { title: f.title, purpose:`);
replace(main,'>保存真实类型自述（原型本地）</B>','>{SERVER_AUTH?"保存本人行动记录":"保存真实类型自述（原型本地）"}</B>');
const editor='src/TaskEditing.jsx';
replace(editor,'export function TaskEditor({s,taskId,restore,desiredStatus,update,close,tell,link})','export function TaskEditor({s,taskId,restore,desiredStatus,update,command,close,tell,link})');
replace(editor,"import {stoppedTask,closedTask,validateTaskEdit,applyTaskEdit} from './task-edit-model';","import {stoppedTask,closedTask,validateTaskEdit,applyTaskEdit} from './task-edit-model';\nimport {authMessage} from './auth-contract';");
replace(editor,"onClick={()=>{try{const next=applyTaskEdit(s,t.id,draft,base);update(next);close();tell('任务安排已保存；各处引用同一任务，已有成果保留。');}catch(e){setError(e.message);}}", "onClick={async()=>{try{if(command)await command('task.edit',{taskId:t.id,...base,draft:{...draft,hours:Number(draft.hours)},confirmation:'EDIT_TASK'});else update(applyTaskEdit(s,t.id,draft,base));close();tell('任务安排已保存；各处引用同一任务，已有成果保留。');}catch(e){setError(e.code?authMessage(e.code):e.message);}}");
const catalog='src/CatalogData.jsx';
replace(catalog,"await sync.flush();const result=await apiRequest('/api/services/report',{data:{baseVersion:sync.current().revision,language:getLanguage()}});download(result.filename,result.text);", "const receipt=await sync.command('report.compile',{language:getLanguage(),confirmation:'COMPILE_REPORT'});const record=sync.current().state.reports.find(row=>row.id===receipt.refs.reportId);if(!record)throw Error('NOT_FOUND');download('career-preparation.md',record.body);");
for(const [file,source]of edits)fs.writeFileSync(file,source);
console.log(JSON.stringify({updated:[...edits.keys()]}));
