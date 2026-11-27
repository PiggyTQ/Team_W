// Original self-contained reference for service-evolution-delivery; public teaching solution.
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
    case 'service-evolution-delivery':
      return {v1:x.records.map(r=>({id:r.id,total:r.cents/100})),v2:x.records.map(r=>({id:r.id,totalCents:r.cents,currency:'CNY'})),preservedIds:x.records.map(r=>r.id),invalid:x.records.filter(r=>!Number.isInteger(r.cents)).map(r=>r.id)};

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("service-evolution-delivery",input);
