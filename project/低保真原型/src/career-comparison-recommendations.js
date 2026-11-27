import {careerContentIds} from './career-exploration-model.js';

const available=new Set(careerContentIds);
const neighboringWork={
 data:['engineering','一个解释数据里的变化，一个让数据稳定可用。','One explains changes in data; the other makes data reliably available.'],
 ai:['backend','一个验证模型能否可靠完成任务，一个交付可用的业务接口。','One evaluates a model-backed task; the other delivers reliable business APIs.'],
 security:['ops','一个追查风险与控制缺口，一个恢复并维持服务。','One investigates risk and control gaps; the other restores and maintains services.'],
 ops:['security','一个关注服务恢复，一个关注事件证据与风险控制。','One focuses on service recovery; the other on incident evidence and risk controls.'],
 frontend:['backend','围绕同一功能，对照用户操作界面与服务接口的分工。','Compare the interface and service responsibilities behind the same feature.'],
 backend:['frontend','围绕同一功能，对照服务数据规则与用户操作状态。','Compare service data rules with the states a user sees in the interface.'],
 engineering:['data','一个构建可用数据，一个用数据回答业务问题。','One builds usable data; the other uses it to answer business questions.'],
 testing:['software','一个提出可复现的验证证据，一个实现并维护软件行为。','One builds reproducible test evidence; the other implements and maintains software behavior.'],
 software:['testing','对照实现功能与验证边界，看看自己更想从哪端开始。','Compare building functionality with verifying its boundaries.'],
 delivery:['ops','一个把方案落到客户流程，一个支撑上线后的稳定运行。','One fits a solution to customer workflows; the other supports stable operation.']
};
const valid=values=>[...new Set((Array.isArray(values)?values:[]).filter(id=>available.has(id)))].slice(0,3);

/** Public work-related suggestion only. It never reads private evidence or changes a goal. */
export function suggestComparisonPair({selected=[],goal,currentCareer}={}){
 const chosen=valid(selected),anchor=chosen[0]||(available.has(currentCareer)?currentCareer:null)||(available.has(goal)?goal:null)||'data';
 const [neighbor,zh,en]=neighboringWork[anchor];
 return {ids:[anchor,neighbor],anchor,reason:{zh,en},method:'site_work_relationship',personalFit:false};
}

/** An explicit empty/one-item URL is respected; initial suggestions fill only an absent/invalid set. */
export function resolveComparisonSelection({set,selected=[],goal,currentCareer}={}){
 const saved=valid(selected),suggestion=suggestComparisonPair({selected:saved,goal,currentCareer});
 const present=set!==undefined&&set!==null;
 const requested=present?set.split(',').filter(Boolean):null;
 const validSet=present&&requested.length<=3&&requested.every(id=>available.has(id))&&new Set(requested).size===requested.length;
 if(validSet)return {ids:requested,origin:'explicit',suggestion,invalidSet:false};
 return {ids:saved.length>=2?saved:suggestion.ids,origin:saved.length>=2?'saved':'suggested',suggestion,invalidSet:present};
}
