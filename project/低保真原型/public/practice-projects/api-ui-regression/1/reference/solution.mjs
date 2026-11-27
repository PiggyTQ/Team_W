// Original self-contained reference for api-ui-regression; public teaching solution.
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
    case 'api-ui-regression':
      return x.tests.map(t=>{const actual=testSubject(t);return {id:t.id,expected:t.expected,actual,passed:JSON.stringify(actual)===JSON.stringify(t.expected)};});

default:throw Error("Unknown scenario");}}
export const solve=input=>runScenario("api-ui-regression",input);
