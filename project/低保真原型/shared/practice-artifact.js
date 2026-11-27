import {runScenario} from '../server/practice-growth/scenarios.mjs';

export const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

// No learner code is evaluated here. Both demo and authenticated workflows use these checks.
export function validatePracticeArtifact(project,input,text,digest,frozenExpected){
 const checks=[],add=(id,passed,detail)=>checks.push({id,passed:Boolean(passed),detail});
 let files;
 try{
  files=JSON.parse(text).files;
  if(!files||typeof files!=='object'||Array.isArray(files)||Object.keys(files).length>20)throw Error();
  for(const [name,body] of Object.entries(files))if(!/^[a-zA-Z0-9._-]{1,80}$/.test(name)||name.includes('..')||!project.requiredFiles.includes(name)||typeof body!=='string'||new TextEncoder().encode(body).byteLength>100000)throw Error();
  add('bundle-format',true,'Bounded UTF-8 text files with safe names');
 }catch{files=null;add('bundle-format',false,'Expected a bounded JSON object containing text files');}
 if(!files)return checks;
 for(const filename of project.requiredFiles)add('file:'+filename,files[filename]?.trim(),filename);
 for(const [filename,body] of Object.entries(files))if(filename.endsWith('.json')){try{JSON.parse(body);add('format:'+filename,true,'JSON parsed');}catch{add('format:'+filename,false,'Malformed JSON');}}
 if(project.requiredFiles.includes('index.html'))add('format:index.html',/<(?:!doctype\s+html|html|main|form)\b/i.test(files['index.html']||''),'HTML structure only; browser behavior is not executed by this check');
 try{add('result-content',same(JSON.parse(files['result.json']),frozenExpected===undefined?runScenario(project.id,input):frozenExpected),'Complete IDs, business values, permissions and failure states against frozen inputs');}catch{add('result-content',false,'Missing, malformed or inconsistent result');}
 if(project.requiredFiles.includes('rules.json')){try{const rule=JSON.parse(files['rules.json']);add('rule-contract',input.rule?same(rule,input.rule):rule.maxError===input.maxError&&rule.requiresBusinessProbe===true,'Fixed teaching rule parameters and business-probe gate');}catch{add('rule-contract',false,'Malformed configuration');}}
 if(project.requiredFiles.includes('config.json')){try{add('permission-configuration',same(JSON.parse(files['config.json']),input.permissions),'Complete allowed and denied role/action configuration');}catch{add('permission-configuration',false,'Malformed permission configuration');}}
 if(project.handoffs.length){
  try{
   const handoff=JSON.parse(files['handoff.json']);
   add('role-handoff',handoff.revision>=2&&handoff.stages.length===project.handoffs.length&&handoff.stages.every((s,i)=>s.from===project.handoffs[i].role&&s.to===project.handoffs[i].consumedBy&&s.inputDigest===project.handoffs[i].inputDigest&&s.feedbackCode===project.handoffs[i].feedbackCode&&s.feedback?.trim()&&s.change?.trim()),'Input identity, receiving role, feedback and revision');
   for(const stage of project.handoffs){const value=JSON.stringify(canonical(JSON.parse(files[stage.requiredOutput])));add('consumer:'+stage.requiredOutput,digest(value)===stage.canonicalOutputDigest,'Consumer content reconciles independently of the handoff prose');}
  }catch{add('role-handoff-content',false,'Missing or inconsistent consuming-role artifact');}
 }
 return checks;
}
