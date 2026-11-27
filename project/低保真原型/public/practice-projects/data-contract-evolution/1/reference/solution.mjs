// Original self-contained reference for data-contract-evolution; public teaching solution.
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
    case 'data-contract-evolution':
      return {rows:[...x.history,...x.increment].map(r=>({id:r.id,cents:r.cents??r.amount_cents,origin:r.cents===undefined?'v1':'v2'})).sort((a,b)=>a.id.localeCompare(b.id)),missing:x.increment.filter(r=>r.cents===undefined&&r.amount_cents===undefined).map(r=>r.id),publish:x.increment.every(r=>r.cents!==undefined||r.amount_cents!==undefined)};

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("data-contract-evolution",input);
