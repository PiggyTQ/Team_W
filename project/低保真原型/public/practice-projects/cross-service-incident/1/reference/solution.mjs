// Original self-contained reference for cross-service-incident; public teaching solution.
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
    case 'reliability-release-drill':
      return x.probes.map(p=>({version:p.version,rate:p.errors/p.requests,recovered:p.errors/p.requests<=x.maxError&&p.business==='ok',rollbackAllowed:p.newRecords===0}));
    case 'cross-service-incident':
      return {checks:runScenario('reliability-release-drill',x),feedback:{to:'backend',issue:'business_probe_still_failing'},revision:x.revision};

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("cross-service-incident",input);
