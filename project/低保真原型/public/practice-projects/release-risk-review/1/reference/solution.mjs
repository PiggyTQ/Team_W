// Original self-contained reference for release-risk-review; public teaching solution.
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
    case 'release-risk-review':
      return {releaseAllowed:x.tests.every(t=>!t.critical||t.status==='passed'),failed:x.tests.filter(t=>t.status==='failed').map(t=>t.id),unexecuted:x.tests.filter(t=>t.status==='not_run').map(t=>t.id),authority:'release_owner'};

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("release-risk-review",input);
