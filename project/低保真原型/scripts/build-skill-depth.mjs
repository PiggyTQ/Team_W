import fs from 'node:fs/promises';
import lessons from '../src/i18n/skill-learning-curriculum.json' with {type:'json'};
const rows=(await fs.readFile('src/i18n/skill-depth-entries.tsv','utf8')).trim().split(/\r?\n/);
const entries=Object.fromEntries(rows.map(row=>{const [id,...fields]=row.split('|');if(fields.length!==5||fields.some(v=>v.split('~').length!==2))throw Error('Invalid depth entry '+id);return [id,Object.fromEntries(['concept','method','example','verify','limits'].map((key,i)=>[key,fields[i].split('~')]))];}));
const practiceRows=(await fs.readFile('src/i18n/skill-depth-practice.tsv','utf8')).trim().split(/\r?\n/);
const practice=Object.fromEntries(practiceRows.map(row=>{const [id,task,reference]=row.split('|');if(!task||!reference||task.split('~').length!==2||reference.split('~').length!==2)throw Error('Invalid practice '+id);return [id,{task:task.split('~'),reference:reference.split('~')}];}));
const practiceTables={
 'sql-joins':[{title:['订单','Orders'],csv:'order_id,order_amount\nK,50\nL,50\nM,20'},{title:['明细','Lines'],csv:'order_id,line_amount\nK,12\nK,8\nM,5'}],
 aggregation:[{title:['渠道汇总输入','Channel inputs'],csv:'channel,orders,refunds\nC,30,3\nD,70,14'}],
 missing:[{title:['收到的记录（预期6行）','Received records (6 expected)'],csv:'row,amount\n1,12\n2,\n3,0\n4,24\n5,'}],
 sampling:[{title:['总体与样本','Population and sample'],csv:'group,population_share,sample_size,satisfaction\nnew,20%,40,90%\nreturning,80%,40,50%'}],
 migration:[{title:['试迁结果','Trial migration'],csv:'outcome,rows,amount\nsource,150,9000\nsuccess,146,8750\nfailed,4,250'}],
 'decision-tables':[{title:['条件组合（自行填写动作）','Condition combinations (supply actions)'],csv:'member,amount_at_least_80\nyes,yes\nyes,no\nno,yes\nno,no'}]
};
for(const [id,tables] of Object.entries(practiceTables))practice[id].tables=tables;
const extra={
 'sql-joins':['PostgreSQL','Table expressions: joins and WHERE','https://www.postgresql.org/docs/current/queries-table-expressions.html'],
 aggregation:['PostgreSQL','Aggregate functions and null inputs','https://www.postgresql.org/docs/current/functions-aggregate.html'],
 descriptive:['NIST / SEMATECH','Measures of location','https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm'],
 keyboard:['W3C WAI','Modal dialog: keyboard interaction and focus','https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/'],
 'dom-events':['MDN','Event.currentTarget: lifecycle and target comparison','https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget'],
 errors:['Python','Errors and exceptions','https://docs.python.org/3/tutorial/errors.html']
};
const result={},audit=[];
for(const [key,lesson] of Object.entries(lessons)){
 const id=key.split(':')[1],depth=entries[id];if(!depth)throw Error('Missing authored content '+key);
 const e=extra[id],sources=[...(e?[{publisher:e[0],title:e[1],url:e[2]}]:[]),...lesson.sources];
 if(!practice[id])throw Error('Missing practice '+id);
 result[key]={...depth,practice:practice[id],sources,reviewed:'2026-11-20'};
 audit.push({skill:key,previousGap:'Domain-level shared method and sparse cases; materials and validation were mostly implicit.',newTeaching:depth.concept,newMethod:depth.method,exampleInputProcessOutput:depth.example,verification:depth.verify,limits:depth.limits,independentPractice:practice[id],sources,executionScope:'Desk reasoning unless separately listed in example-runtime.json. Official links and chapter readings do not establish untested runtime behavior.'});
}
if(Object.keys(entries).length!==123||Object.keys(result).length!==123||Object.keys(practice).length!==123)throw Error('Unexpected curriculum coverage');
await fs.writeFile('src/i18n/skill-depth.json',JSON.stringify(result,null,2)+'\n');
await fs.writeFile('checks/skill-depth-20261120/content-review.json',JSON.stringify(audit,null,2)+'\n');
console.log('Built 123 individually authored bilingual explanations, procedures, transfer examples and validation notes');
