import {createHash} from 'node:crypto';
import {runScenario,CHECKER_VERSION} from './scenarios.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function generateVariant(project,input,{family,seed,capacity,threshold,duration}={}){
 if(!Number.isInteger(seed)||![1,2].includes(seed))throw Error('UNREVIEWED_VARIANT');
 const value=structuredClone(input);
 if(family==='data'&&project.id==='multi-source-analysis'){
  if(seed===1)value.payments.push({id:'P4',order:'A1',cents:1000});
  else value.orders.push({id:'A4',customer:'C3',channel:'community',cents:4000});
  if(new Set(value.orders.map(r=>r.id)).size!==value.orders.length)throw Error('AMBIGUOUS_ORDER_GRAIN');
 }else if(family==='api'&&project.id==='retry-concurrency'){
  if(!Number.isInteger(capacity)||capacity<1||capacity>3)throw Error('INVALID_CAPACITY');
  value.capacity=capacity;
  value.requests=[{id:'V1',key:'same',owner:'alice',quantity:1},{id:'V2',key:'same',owner:'alice',quantity:1},{id:'V3',key:'same',owner:'bob',quantity:1},{id:'V4',key:'other',owner:'bob',quantity:capacity}];
 }else if(family==='rules'&&project.id==='alert-rule-regression'){
  if(!(threshold>0&&threshold<0.3&&Number.isInteger(duration)&&duration>=2&&duration<=4))throw Error('INVALID_RULE_RANGE');
  value.rule={...value.rule,threshold,for:duration};
  value.windows=[1,2,3,4,5,6].map((minute,i)=>({minute,requests:100,errors:i<duration?Math.ceil(100*threshold)+2:0}));
 }else throw Error('UNREVIEWED_VARIANT');
 const expected=runScenario(project.id,value);
 return {identity:{parentProject:project.id,parentVersion:project.version,id:`${family}-${seed}`,seed,ruleVersion:1,checker:CHECKER_VERSION,inputDigest:hash(value),expectedDigest:hash(expected),rubricDigest:hash(project.review),independence:'Controlled public teaching extension; not an unseen mastery assessment'},input:value,expected};
}
