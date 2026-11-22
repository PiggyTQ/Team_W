import registrations from './content/registration-case.json' with {type:'json'};
import sql from './content/registration-query.json' with {type:'json'};
export {registrations,sql as registrationSql};
export function summarizeRegistrations(rows=registrations){
 const latest=new Map();for(const row of rows){const old=latest.get(row.registration_id);if(!old||row.updated_at>old.updated_at)latest.set(row.registration_id,row);}
 const result=['website','community','video'].map(channel=>({channel,april:0,may:0}));
 for(const row of latest.values())if(!row.is_test&&row.status==='active'&&row.registered_at>='2026-04-01'&&row.registered_at<'2026-06-01'){
  const bucket=result.find(r=>r.channel===row.channel);if(bucket)bucket[row.registered_at.slice(5,7)==='04'?'april':'may']++;
 }
 const april=result.reduce((n,r)=>n+r.april,0),may=result.reduce((n,r)=>n+r.may,0);
 return {rows:result.map(r=>({...r,change:r.may-r.april})),april,may,change:may-april,percent:april?(may-april)/april*100:null,unit:'registration_records'};
}
