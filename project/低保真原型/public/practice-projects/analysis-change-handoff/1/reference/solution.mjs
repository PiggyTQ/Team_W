// Original self-contained reference for analysis-change-handoff; public teaching solution.
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
    case 'analysis-change-handoff':
      return x.versions.map(v => ({version:v.version, unit:v.unit, count:v.rows.filter(r=>r.status==='active').length, cents:v.rows.filter(r=>r.status==='active').reduce((n,r)=>n+(v.unit==='yuan'?r.amount*100:r.amount),0)}));

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("analysis-change-handoff",input);
