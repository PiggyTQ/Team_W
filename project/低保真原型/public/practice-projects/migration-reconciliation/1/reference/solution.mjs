// Original self-contained reference for migration-reconciliation; public teaching solution.
// Original deliberately defective and repaired teaching subjects, not captured production traces.
export const discountSubject=(cents,version)=>{
 const threshold=version==='bug-1'?Math.round(cents/100)*100:cents;
 return threshold>=8000?cents-800:cents;
};
export function testSubject(test){
 switch(test.action){
  case 'read-object':return test.version==='bug-1'?200:!test.user?401:test.owner!==test.user?403:200;
  case 'failed-form':return test.version==='bug-1'?'cleared':test.input;
  case 'register':return typeof test.email==='string'&&test.email.includes('@')?201:422;
  default:throw Error('Unknown teaching test action');
 }
}

function runScenario(id,input){const x=structuredClone(input);switch(id){
    case 'migration-reconciliation': {
      const normalized=x.source.map(r=>({id:r.id,email:r.email.trim().toLowerCase(),status:r.status==='confirmed'?'active':r.status})).sort((a,b)=>a.id.localeCompare(b.id));
      return {normalized,differences:normalized.filter(r=>!x.target.some(t=>JSON.stringify(t)===JSON.stringify(r))).map(r=>r.id),rollbackAllowed:x.newRecords.length===0,preserve:x.newRecords.map(r=>r.id)};
    }

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("migration-reconciliation",input);
