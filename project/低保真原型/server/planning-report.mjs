import {createHash} from 'node:crypto';
import {planningReportBody} from '../src/continuity-model.js';
import {consultationBody} from '../src/alignment-model.js';
import {buildCareerReport,careerReportBody,normalizeReportPlanRecords} from '../src/career-report-model.js';
import {captureCareerReportSources} from '../src/career-report-sources.js';
import {businessError} from './business-error.mjs';

const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;

/** Keep the existing report chapters, but use the actual catalog and saved facts. */
export function planningReportPreview(state,knowledge,{kind='report',help='',format,uploads,planRecords}={}){
  if(format!==undefined&&format!=='career-report-v1')throw businessError('INVALID_REQUEST');
  if(format==='career-report-v1'){
    if(kind!=='report')throw businessError('INVALID_REQUEST');
    let normalized;try{normalized=normalizeReportPlanRecords(planRecords);}catch{throw businessError('INVALID_REQUEST');}
    const model=buildCareerReport(state,{uploads,planRecords:normalized}),body=careerReportBody(model),compositeSources=captureCareerReportSources(state,{uploads,planRecords:normalized}),catalogVersion='career-detail-content-v1';
    const digest=createHash('sha256').update(JSON.stringify(sorted({body,compositeSources,catalogVersion}))).digest('hex');
    return {body,digest,format,catalogVersion,notice:'依据站内职业任务与技能资料整理；技能依据覆盖不是胜任概率，MBTI 仅用于核对工作偏好。',compositeSources};
  }
  const catalog=knowledge.summary(),selected=state.goal?knowledge.get('/api/catalog/profiles/'+encodeURIComponent(state.goal),new URLSearchParams()):null;
  const profile=selected?.profile;
  const replacements={
    '职业要求与范围':profile?`${profile.definition} ${profile.scope_and_boundaries||''} [${profile.id} / ${catalog.catalogVersion}]；${catalog.notice}`:'未选择主职业目标；可以继续探索，不生成统一职业门槛。',
    '职业桥接与技能路线':profile?`本范围的学习重点：${(selected.skills||[]).map(row=>row.name).join('、')||'待核对'}。这是学习参考，不是统一招聘要求；备选技术不全部列为必修，关系仍须核对适用范围。`:'尚未指定路线，不将全部技术列为必修。',
    '引用与局限':`本人资料 v${state.profileVersion}、计划 v${state.planVersion}；职业资料 ${catalog.catalogVersion}${profile?' / '+profile.id:''}。${catalog.notice} 未调用 AI，未运行用户代码，不生成能力总分、实时招聘结论或独立能力认证。`
  };
  const body=(kind==='consult'?consultationBody(state,help):planningReportBody(state)).split('\n').map(line=>{
    const title=line.split('：')[0];return replacements[title]===undefined?line:title+'：'+replacements[title];
  }).join('\n');
  return {body,digest:createHash('sha256').update(body).digest('hex'),catalogVersion:catalog.catalogVersion,notice:catalog.notice};
}
