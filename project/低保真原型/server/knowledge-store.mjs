import {compileCareerReport} from './report-copy.mjs';
import {createPublicTranslations} from './public-translations.mjs';
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {businessError} from './business-store.mjs';

const safeURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
const parsed=row=>row?JSON.parse(row.body):null;
const integer=(v,fallback,max)=>/^\d+$/.test(v||'')?Math.min(max,Math.max(1,Number(v))):fallback;
const escaped=value=>value.replace(/[\\%_]/g,'\\$&');
const clean=value=>String(value||'').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[联系方式已隐藏]').replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g,'[联系方式已隐藏]');
export function createKnowledgeStore(path=process.env.KNOWLEDGE_DATABASE||'server/data/knowledge.sqlite') {
  if(!existsSync(resolve(path)))return null;
  const db=new DatabaseSync(path,{readOnly:true});
  const metadata=Object.fromEntries(db.prepare('SELECT * FROM metadata').all().map(r=>[r.key,JSON.parse(r.value)]));
  const reportCopy=createPublicTranslations();
  const notice='小组作业展示数据，未经人工复核；岗位为历史采集快照，不代表仍在招聘；关联材料不等于能力核验。';
  const envelope=body=>({catalogVersion:metadata.version,demoOnly:true,notice,...body});
  const item=(kind,id)=>parsed(db.prepare('SELECT body FROM items WHERE kind=? AND id=?').get(kind,id));
  const profile=id=>{
    const row=db.prepare('SELECT * FROM profiles WHERE id=? OR (career=? AND kind=?) ORDER BY id LIMIT 1').get(id,id,'occupational_foundation');
    if(!row)throw businessError('NOT_FOUND',404);
    return {id:row.id,career:row.career,kind:row.kind,title:row.title,...parsed(row)};
  };
  const profiles=(career,kind)=>db.prepare(`SELECT * FROM profiles WHERE (?='' OR career=?) AND (?='' OR kind=?) ORDER BY career,kind,id`).all(career,career,kind,kind).map(row=>({id:row.id,career:row.career,kind:row.kind,title:row.title,definition:parsed(row).definition}));
  const skillRows=db.prepare('SELECT * FROM skills ORDER BY id').all();
  const skillMap=new Map(skillRows.map(row=>[row.id,{...parsed(row),id:row.id,name:row.name,dimension:row.dimension}]));
  const summary=()=>envelope({metadata,counts:{profiles:db.prepare('SELECT count(*) n FROM profiles').get().n,skills:skillRows.length,jobs:db.prepare('SELECT count(*) n FROM jobs').get().n,mentions:db.prepare('SELECT count(*) n FROM mentions').get().n,...Object.fromEntries(db.prepare('SELECT kind,count(*) n FROM items GROUP BY kind').all().map(r=>[r.kind,r.n]))},careers:profiles('','occupational_foundation')});
  const items=(kind,career='')=>db.prepare("SELECT * FROM items WHERE kind=? AND (?='' OR career=?) ORDER BY id").all(kind,career,career).map(row=>({id:row.id,...parsed(row)}));
  function jobView(row,detail=false) {
    const v=parsed(row),source=item('sources',v.source_id);
    return {id:row.id,career:row.career,occupation:row.occupation,market:row.market,title:row.title,company:row.company,location:row.location,text:clean(v.description).slice(0,detail?16000:360),form:v.seniority||'unknown',source:v.origin_name||v.source_id,sourceId:v.source_id,sourceUrl:safeURL(v.source_url),date:v.snapshot_date||metadata.snapshotDate,publishedAt:v.published_at||null,dateBasis:v.date_basis||'unknown',lastVerifiedAt:v.last_verified_at||null,salaryRaw:v.salary_raw||'未提供',postingStatus:v.posting_status,reviewStatus:v.review_status,scope:'历史岗位样本，仅供课程作业研究；在招状态未核验。',...(detail?{skills:db.prepare('SELECT skill_id,body FROM mentions WHERE job_id=? ORDER BY skill_id').all(row.id).map(r=>({skillId:r.skill_id,name:skillMap.get(r.skill_id)?.name||r.skill_id,evidence:JSON.parse(r.body)})),conditions:db.prepare("SELECT body FROM items WHERE kind='conditions' AND json_extract(body,'$.job_id')=? ORDER BY id").all(row.id).map(parsed),sourcePolicy:source,originalFlags:{publicDisplayAllowed:v.public_display_allowed,licenseStatus:v.license_status,employerVerified:v.employer_contact_verified}}:{})};
  }
  function jobs(params) {
    const q=(params.get('q')||'').trim().slice(0,160),career=(params.get('career')||'').slice(0,50),market=params.get('market')||'',location=(params.get('location')||'').slice(0,80),page=integer(params.get('page'),1,100000),limit=integer(params.get('limit'),20,50);
    const terms=q.split(/\s+/).filter(Boolean).slice(0,8),clauses=[],values=[];
    for(const [column,value]of [['career',career],['market',market]])if(value){clauses.push(`${column}=?`);values.push(value);}
    if(location){clauses.push("location LIKE ? ESCAPE '\\'");values.push('%'+escaped(location)+'%');}
    for(const term of terms){clauses.push("search_text LIKE ? ESCAPE '\\'");values.push('%'+escaped(term)+'%');}
    const where=clauses.length?' WHERE '+clauses.join(' AND '):'';
    const total=db.prepare('SELECT count(*) n FROM jobs'+where).get(...values).n;
    return envelope({q,career,market,location,page,limit,total,items:db.prepare('SELECT * FROM jobs'+where+' ORDER BY id LIMIT ? OFFSET ?').all(...values,limit,(page-1)*limit).map(r=>jobView(r))});
  }
  function get(path,params) {
    if(path==='/api/catalog/summary')return summary();
    if(path==='/api/catalog/profiles')return envelope({items:profiles(params.get('career')||'',params.get('kind')||'')});
    if(path.startsWith('/api/catalog/profiles/')){
      const p=profile(decodeURIComponent(path.slice('/api/catalog/profiles/'.length)));
      const ids=p.reference_ids||[];
      return envelope({profile:p,children:profiles(p.career,'').filter(r=>r.id!==p.id),relations:items('relations').filter(r=>[r.from_profile_id,r.to_profile_id].some(id=>id?.split('.')[0]===p.occupation_id)),sources:items('profileSources').filter(r=>ids.includes(r.id)||ids.includes(r.source_id)||ids.includes(r.reference_id)),skills:(p.dimensions?.PS?.learning_focus||[]).map(r=>({...r,dictionary:skillMap.get(r.competency_id)})),action:{id:`profile-action-${p.career}`,career:p.career,...p.demonstration_project},templates:items('actions',p.career)});
    }
    if(path==='/api/catalog/skills'){const q=(params.get('q')||'').toLowerCase().slice(0,100);return envelope({items:[...skillMap.values()].filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q))});}
    if(path==='/api/catalog/jobs')return jobs(params);
    if(path.startsWith('/api/catalog/jobs/')){const row=db.prepare('SELECT * FROM jobs WHERE id=?').get(decodeURIComponent(path.slice('/api/catalog/jobs/'.length)));if(!row)throw businessError('NOT_FOUND',404);return envelope({job:jobView(row,true)});}
    const kind=path.slice('/api/catalog/'.length);
    if(['relations','resources','actions','facts','references','sources','profileSources'].includes(kind))return envelope({items:items(kind,params.get('career')||'')});
    return undefined;
  }
  function assess(state,career=state.assessmentCareer||state.goal||'data') {
    const p=profile(career),claims=state.claims.filter(c=>c.status==='已确认');
    const normalize=value=>String(value||'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
    const skillIds=claim=>new Set(String(claim.skill||'').split(/[、,，;；]/).map(normalize).filter(Boolean));
    const rows=(p.dimensions?.PS?.learning_focus||[]).map(focus=>{
      const dictionary=skillMap.get(focus.competency_id)||{},aliases=[focus.competency_id,focus.name,dictionary.canonical_name,dictionary.name,...String(dictionary.aliases||'').split(/[|;,、]/)].filter(Boolean).map(normalize);
      const matches=claims.filter(c=>aliases.some(alias=>skillIds(c).has(alias)));
      return {skillId:focus.competency_id,name:focus.name,status:matches.length?'有本人确认的关联材料，未独立核验':'材料未知',claimRefs:matches.map(c=>({id:c.id,version:c.version})),verified:false};
    });
    return {id:randomUUID(),profileVersion:state.profileVersion,version:state.version,occupation:p.career,rule:'目录材料对照 D1',catalogVersion:metadata.version,knowledgeProfileId:p.id,date:new Date().toISOString(),claims:claims.map(c=>({id:c.id,version:c.version})),claimSnapshots:claims.map(({id,version,title,text,contribution,skill})=>({id,version,title,text,contribution,skill})),reviewRefs:state.reviews.map(r=>({id:r.id,taskId:r.taskId,date:r.date,version:r.version||1})),skillRows:rows,dimensions:{BR:'按具体岗位核对，不设职业统一门槛',PS:'按本人确认的技能标签关联材料，不推断掌握程度',TQ:'具体行为待核对，不推断人格',DP:'仅引用已有复盘，不推断潜力'},notice};
  }
  function report(state,language='zh') {
    const p=state.goal?profile(state.goal):null,claims=state.claims.filter(c=>c.status==='已确认');
    const text=compileCareerReport({state,profile:p,metadata,notice,skillRows:p?assess(state,p.career).skillRows:[],language,translate:reportCopy.translate});
    return envelope({filename:'career-preparation.md',text,claimRefs:claims.map(c=>({id:c.id,version:c.version}))});
  }

  return {get,summary,assess,report,close:()=>db.close()};
}
